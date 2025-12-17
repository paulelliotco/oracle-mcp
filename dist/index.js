#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OpenAI from "openai";
import { registerResources } from "./resources.js";
import { registerRootsTools } from "./roots.js";
import { registerPrompts } from "./prompts.js";
// Memoized OpenAI client reuse (apiKey, baseURL, organization)
const __clients = new Map();
function getOpenAI(k, b, o) {
    const key = JSON.stringify([k || "", b || "", o || ""]);
    let c = __clients.get(key);
    if (!c) {
        c = new OpenAI({ apiKey: k, baseURL: b, organization: o });
        __clients.set(key, c);
    }
    return c;
}
import { randomUUID } from "node:crypto";
const VERSION = "0.1.0";
const DEFAULT_MODEL = process.env.ORACLE_MODEL || "o3"; // prefer o3 with Responses API
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3;
const MAX_TOKENS_CAP = Number(process.env.ORACLE_MAX_TOKENS_CAP || 4096);
const LOG_LEVEL = (process.env.ORACLE_MCP_LOG_LEVEL || "info").toLowerCase();
const SAMPLING_MODE = (process.env.ORACLE_SAMPLING_MODE || "auto").toLowerCase();
const log = {
    debug: (...args) => LOG_LEVEL === "debug" && console.debug("[oracle-mcp]", ...args),
    info: (...args) => ["debug", "info"].includes(LOG_LEVEL) && console.log("[oracle-mcp]", ...args),
    warn: (...args) => console.warn("[oracle-mcp]", ...args),
    error: (...args) => console.error("[oracle-mcp]", ...args),
};
function sendInfo(ctx, message) {
    try {
        if (ctx?.info && typeof ctx.info === "function")
            return void ctx.info(message);
        if (ctx?.logging?.info && typeof ctx.logging.info === "function")
            return void ctx.logging.info(message);
        if (ctx?.sendLoggingMessage && typeof ctx.sendLoggingMessage === "function")
            return void ctx.sendLoggingMessage({ level: "info", data: message });
    }
    catch { }
}
function reportProgress(ctx, progress, total) {
    try {
        if (ctx?.reportProgress && typeof ctx.reportProgress === "function")
            return void ctx.reportProgress(progress, total ?? 100);
        if (ctx?.progress && typeof ctx.progress === "function")
            return void ctx.progress(progress, total ?? 100);
    }
    catch { }
}
function mcpErr(text, code) {
    return { isError: true, content: [{ type: "text", text: `${code}: ${text}` }] };
}
async function tryClientSampling(ctx, params) {
    try {
        const sys = { role: "system", content: [{ type: "text", text: params.system }] };
        const usr = { role: "user", content: [{ type: "text", text: params.user }] };
        const payload = {
            messages: [sys, usr],
            maxTokens: params.maxTokens,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            model: params.model,
            systemPrompt: params.system,
            system_prompt: params.system,
        };
        let result;
        if (ctx?.sampling && typeof ctx.sampling.createMessage === "function") {
            result = await ctx.sampling.createMessage(payload);
        }
        else if (ctx?.session && typeof ctx.session.createMessage === "function") {
            result = await ctx.session.createMessage(payload);
        }
        else if (typeof ctx?.createMessage === "function") {
            result = await ctx.createMessage(payload);
        }
        else {
            return null;
        }
        const extract = (node) => {
            if (!node)
                return "";
            if (typeof node === "string")
                return node;
            if (Array.isArray(node))
                return node.map(extract).filter(Boolean).join("\n");
            if (node.text)
                return String(node.text);
            if (node.type === "text" && node.text)
                return String(node.text);
            if (node.content)
                return extract(node.content);
            return "";
        };
        const content = (result?.content ?? result?.message?.content ?? result?.output);
        const text = extract(content).trim();
        return text || null;
    }
    catch {
        return null;
    }
}
function buildSectionsHeader(sections) {
    return sections.map((s) => s.toUpperCase()).join(", ");
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function isRetryableStatus(status) {
    return status === 429 || (status !== undefined && status >= 500 && status < 600);
}
async function withRetries(fn, attempts = 3, baseDelay = 500) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            const status = err?.status || err?.response?.status;
            if (!isRetryableStatus(status) || i === attempts - 1)
                throw err;
            const delay = baseDelay * Math.pow(2, i);
            log.warn(`retryable OpenAI error (status=${status}), retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    throw lastErr;
}
const askSchema = z.object({
    question: z.string().min(5, "question too short"),
    context: z.string().optional(),
    sections: z.array(z.enum(["summary", "findings", "plan", "risks", "verification"]))
        .optional(),
    model: z.string().optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
}).strict();
const server = new McpServer({
    name: "oracle-mcp",
    version: VERSION,
});
async function registerOracleTool(name) {
    server.registerTool(name, {
        title: "Oracle Advisor",
        description: "Provide deep engineering guidance using a higher-reasoning model.",
        inputSchema: askSchema.shape,
    }, async (rawArgs, ctx) => {
        const { question, context, sections = ["summary", "findings", "plan"], model = DEFAULT_MODEL, maxOutputTokens = DEFAULT_MAX_TOKENS, timeoutMs = DEFAULT_TIMEOUT_MS, temperature, } = askSchema.parse(rawArgs);
        const reqId = randomUUID();
        sendInfo(ctx, `Starting oracle request (model=${model})`);
        reportProgress(ctx, 0, 100);
        const rawKey = process.env.OPENAI_API_KEY;
        const apiKey = rawKey?.trim();
        const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
        const organization = process.env.OPENAI_ORG_ID?.trim() || undefined;
        const hasCtl = /[\r\n\t]/.test(rawKey ?? "");
        const hadWhitespace = !!rawKey && rawKey !== rawKey.trim();
        log.debug(`OpenAI: baseURL=${baseURL ?? 'default'} orgHeader=${organization ? 'set' : 'unset'} projectEnv=${process.env.OPENAI_PROJECT_ID ? 'set' : 'unset'} keyLen=${apiKey?.length ?? 0} ctlChars=${hasCtl} trimmed=${hadWhitespace}`);
        if (baseURL && !/\/v1\/?$/.test(baseURL)) {
            log.warn("OPENAI_BASE_URL does not end with /v1; some providers require a /v1 suffix");
        }
        const client = getOpenAI(apiKey, baseURL, organization);
        const sectionsHeader = buildSectionsHeader(sections);
        const system = `You are a senior principal engineer ("oracle").\nReturn guidance in plain text with clearly delineated sections: ${sectionsHeader}.\nKeep it concise and actionable. Provide commands in Verification.`;
        const user = `${question}${context ? `\n\nAdditional context:\n${context}` : ""}`;
        const safeMaxTokens = Math.min(Math.max(1, maxOutputTokens), MAX_TOKENS_CAP);
        // Sampling mode: prefer client-side generation when available
        if (SAMPLING_MODE !== "off") {
            const sampled = await tryClientSampling(ctx, { system, user, maxTokens: safeMaxTokens, temperature, model });
            if (sampled) {
                try {
                    reportProgress(ctx, 100, 100);
                }
                catch { }
                sendInfo(ctx, "Used client-side sampling");
                return { content: [{ type: "text", text: sampled }] };
            }
            if (SAMPLING_MODE === "always") {
                const msg = "Client sampling requested but not available";
                try {
                    sendInfo(ctx, `Error: ${msg}`);
                    reportProgress(ctx, 100, 100);
                }
                catch { }
                return mcpErr(msg, "E_CLIENT_SAMPLING_UNAVAILABLE");
            }
        }
        const ac = new AbortController();
        let cancelUnsub;
        try {
            if (ctx?.signal && typeof ctx.signal.addEventListener === "function") {
                const onAbort = () => {
                    try {
                        ac.abort(new Error("Cancelled by client"));
                        sendInfo(ctx, "Request cancelled by client");
                        reportProgress(ctx, 100, 100);
                    }
                    catch { }
                };
                ctx.signal.addEventListener("abort", onAbort, { once: true });
                cancelUnsub = () => { try {
                    ctx.signal.removeEventListener("abort", onAbort);
                }
                catch { } };
            }
        }
        catch { }
        const timer = setTimeout(() => ac.abort(new Error(`Timed out after ${timeoutMs} ms`)), timeoutMs);
        if (!apiKey) {
            const msg = "Missing OPENAI_API_KEY in environment (required for server-side generation)";
            log.error(msg);
            try {
                sendInfo(ctx, `Error: ${msg}`);
                reportProgress(ctx, 100, 100);
            }
            catch { }
            return mcpErr(msg, "E_MISSING_OPENAI_KEY");
        }
        try {
            const start = Date.now();
            const isReasoningModel = /^o3($|[-/])/.test(model);
            const req = {
                model,
                ...(isReasoningModel ? { reasoning: { effort: "medium" } } : {}),
                input: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                max_output_tokens: safeMaxTokens,
            };
            if (!isReasoningModel && typeof temperature === "number") {
                req.temperature = temperature ?? DEFAULT_TEMPERATURE;
            }
            reportProgress(ctx, 10, 100);
            const response = await withRetries(() => client.responses.create(req, { signal: ac.signal }), 3, 500);
            const ms = Date.now() - start;
            log.debug(`[req ${reqId}] oracle success model=${model} tokens=${safeMaxTokens} latencyMs=${ms}`);
            reportProgress(ctx, 90, 100);
            sendInfo(ctx, `Completed in ${ms} ms`);
            // Extract assistant text robustly across response shapes
            const anyResp = response;
            let text = "";
            if (typeof anyResp.output_text === "string" && anyResp.output_text.trim()) {
                text = anyResp.output_text.trim();
            }
            else {
                const texts = [];
                const scan = (node) => {
                    if (!node)
                        return;
                    if (typeof node === "string") {
                        texts.push(node);
                        return;
                    }
                    if (Array.isArray(node)) {
                        node.forEach(scan);
                        return;
                    }
                    if (typeof node === "object") {
                        if (typeof node.text === "string")
                            texts.push(node.text);
                        if (node.type === "output_text" && typeof node.text === "string")
                            texts.push(node.text);
                        if (node.role === "assistant" && node.content)
                            scan(node.content);
                        if (node.message && node.message.role === "assistant")
                            scan(node.message.content);
                        for (const k of Object.keys(node)) {
                            if (k === "logprobs" || k === "tool" || k === "annotations")
                                continue;
                            scan(node[k]);
                        }
                    }
                };
                scan(anyResp.output);
                scan(anyResp.message);
                text = texts.join("\n").trim();
            }
            if (!text) {
                const dump = JSON.stringify({
                    hasOutputText: typeof anyResp.output_text === "string" && anyResp.output_text.length > 0,
                    outputTypes: Array.isArray(anyResp.output) ? anyResp.output.map((o) => o?.type || o?.message?.role || typeof o) : typeof anyResp.output,
                });
                try {
                    reportProgress(ctx, 100, 100);
                }
                catch { }
                log.warn("empty text from Responses API; shape=", dump);
                try {
                    sendInfo(ctx, "Error: Model returned no text content");
                }
                catch { }
                return mcpErr("Model returned no text content", "E_EMPTY_MODEL_OUTPUT");
            }
            try {
                reportProgress(ctx, 100, 100);
            }
            catch { }
            return { content: [{ type: "text", text }] };
        }
        catch (err) {
            const status = err?.status || err?.response?.status;
            const msg = `OpenAI error${status ? ` (status ${status})` : ""}: ${err?.message || err}`;
            log.error(msg);
            try {
                sendInfo(ctx, `Error: ${msg}`);
                reportProgress(ctx, 100, 100);
            }
            catch { }
            return mcpErr(msg, status ? `E_OPENAI_HTTP_${status}` : "E_OPENAI_ERROR");
        }
        finally {
            clearTimeout(timer);
            try {
                cancelUnsub?.();
            }
            catch { }
        }
    });
}
// Register tool: oracle
await registerOracleTool("oracle");
// Register resources
registerResources(server);
// Register roots tools
registerRootsTools(server);
// Register prompts
registerPrompts(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log.info("oracle-mcp is running on stdio");
}
main().catch((err) => {
    log.error("oracle-mcp failed to start:", err);
    process.exit(1);
});
