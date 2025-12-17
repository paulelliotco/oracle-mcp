#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
async function main() {
    const useBin = process.env.SELFTEST_USE_BIN === "1";
    const command = useBin ? "oracle-mcp" : "node";
    const args = useBin ? [] : ["dist/index.js"];
    const client = new Client({ name: "oracle-mcp-selftest", version: "0.0.1" });
    const transport = new StdioClientTransport({ command, args });
    await client.connect(transport);
    const tools = await client.listTools();
    const has = tools.tools.some(t => t.name === "oracle");
    if (!has)
        throw new Error("oracle not found in listTools");
    const result = await client.callTool({
        name: "oracle",
        arguments: {
            question: "Self-test: provide a two-sentence SUMMARY only.",
            sections: ["summary"],
            maxOutputTokens: 200,
            timeoutMs: 15000
        }
    });
    const content = result.content?.[0];
    if (!content || content.type !== "text")
        throw new Error("Unexpected tool response");
    console.log("SELFTEST OK\n---\n" + String(content.text || "").slice(0, 400));
}
main().catch(err => {
    console.error("SELFTEST FAILED:", err);
    process.exit(1);
});
