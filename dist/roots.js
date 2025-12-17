#!/usr/bin/env node
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
const log = {
    debug: (...args) => console.debug("[oracle-mcp:roots]", ...args),
    info: (...args) => console.log("[oracle-mcp:roots]", ...args),
    warn: (...args) => console.warn("[oracle-mcp:roots]", ...args),
    error: (...args) => console.error("[oracle-mcp:roots]", ...args),
};
// Default roots configuration - can be overridden by environment variables
const DEFAULT_ROOTS = {
    readonly: [
        process.cwd(), // Current working directory
        path.join(process.cwd(), "docs"), // Documentation directory
        path.join(process.cwd(), "examples"), // Examples directory
    ],
    writable: [
        path.join(process.cwd(), "tmp"), // Temporary directory
        path.join(process.cwd(), "output"), // Output directory
    ]
};
// Parse roots from environment variables
function parseRootsFromEnv() {
    const readonlyEnv = process.env.MCP_READONLY_ROOTS;
    const writableEnv = process.env.MCP_WRITABLE_ROOTS;
    return {
        readonly: readonlyEnv ? readonlyEnv.split(",").map(p => p.trim()) : DEFAULT_ROOTS.readonly,
        writable: writableEnv ? writableEnv.split(",").map(p => p.trim()) : DEFAULT_ROOTS.writable
    };
}
const ROOTS_CONFIG = parseRootsFromEnv();
/**
 * Check if a given path is allowed within the configured roots
 */
function isPathAllowed(requestedPath, requireWritable = false) {
    try {
        const normalizedPath = path.resolve(requestedPath);
        const allowedRoots = requireWritable ? ROOTS_CONFIG.writable : [...ROOTS_CONFIG.readonly, ...ROOTS_CONFIG.writable];
        for (const root of allowedRoots) {
            const normalizedRoot = path.resolve(root);
            if (normalizedPath.startsWith(normalizedRoot)) {
                log.debug(`Path ${normalizedPath} allowed under root ${normalizedRoot}`);
                return { allowed: true };
            }
        }
        const rootsList = allowedRoots.join(", ");
        const reason = `Path ${normalizedPath} is not within allowed roots: ${rootsList}`;
        log.warn(reason);
        return { allowed: false, reason };
    }
    catch (error) {
        const reason = `Invalid path: ${error}`;
        log.error(reason);
        return { allowed: false, reason };
    }
}
/**
 * Safely read a file with path validation
 */
async function safeReadFile(filePath) {
    const { allowed, reason } = isPathAllowed(filePath, false);
    if (!allowed) {
        throw new Error(reason);
    }
    try {
        const content = await fs.readFile(filePath, "utf-8");
        log.debug(`Successfully read file: ${filePath}`);
        return content;
    }
    catch (error) {
        const message = `Failed to read file ${filePath}: ${error}`;
        log.error(message);
        throw new Error(message);
    }
}
/**
 * Safely write a file with path validation
 */
async function safeWriteFile(filePath, content) {
    const { allowed, reason } = isPathAllowed(filePath, true);
    if (!allowed) {
        throw new Error(reason);
    }
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, "utf-8");
        log.debug(`Successfully wrote file: ${filePath}`);
    }
    catch (error) {
        const message = `Failed to write file ${filePath}: ${error}`;
        log.error(message);
        throw new Error(message);
    }
}
/**
 * Safely list directory contents with path validation
 */
async function safeListDirectory(dirPath) {
    const { allowed, reason } = isPathAllowed(dirPath, false);
    if (!allowed) {
        throw new Error(reason);
    }
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const result = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            path: path.join(dirPath, entry.name)
        }));
        log.debug(`Successfully listed directory: ${dirPath} (${result.length} entries)`);
        return result;
    }
    catch (error) {
        const message = `Failed to list directory ${dirPath}: ${error}`;
        log.error(message);
        throw new Error(message);
    }
}
/**
 * Register roots-related tools with the MCP server
 */
export function registerRootsTools(server) {
    log.info("Registering roots-related tools...");
    // Tool to list configured roots
    server.registerTool("list_roots", {
        title: "List Roots",
        description: "List all configured file system roots (readonly and writable)",
        inputSchema: {}
    }, async () => {
        log.debug("Listing configured roots");
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        readonly: ROOTS_CONFIG.readonly,
                        writable: ROOTS_CONFIG.writable,
                        note: "Paths are resolved relative to the server's working directory"
                    }, null, 2)
                }]
        };
    });
    // Tool to read file contents
    server.registerTool("read_file", {
        title: "Read File",
        description: "Read the contents of a file within allowed roots",
        inputSchema: {
            path: z.string().describe("Path to the file to read")
        }
    }, async ({ path: filePath }) => {
        try {
            const content = await safeReadFile(filePath);
            return {
                content: [{
                        type: "text",
                        text: content
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error reading file: ${error}`
                    }],
                isError: true
            };
        }
    });
    // Tool to write file contents
    server.registerTool("write_file", {
        title: "Write File",
        description: "Write content to a file within writable roots",
        inputSchema: {
            path: z.string().describe("Path to the file to write"),
            content: z.string().describe("Content to write to the file")
        }
    }, async ({ path: filePath, content }) => {
        try {
            await safeWriteFile(filePath, content);
            return {
                content: [{
                        type: "text",
                        text: `Successfully wrote ${content.length} characters to ${filePath}`
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error writing file: ${error}`
                    }],
                isError: true
            };
        }
    });
    // Tool to list directory contents
    server.registerTool("list_directory", {
        title: "List Directory",
        description: "List the contents of a directory within allowed roots",
        inputSchema: {
            path: z.string().describe("Path to the directory to list")
        }
    }, async ({ path: dirPath }) => {
        try {
            const entries = await safeListDirectory(dirPath);
            const summary = `Directory: ${dirPath}\nEntries: ${entries.length}\n\n`;
            const listing = entries.map(entry => `${entry.type === "directory" ? "📁" : "📄"} ${entry.name} (${entry.type})`).join("\n");
            return {
                content: [{
                        type: "text",
                        text: summary + listing
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error listing directory: ${error}`
                    }],
                isError: true
            };
        }
    });
    // Tool to check if a path is allowed
    server.registerTool("check_path_access", {
        title: "Check Path Access",
        description: "Check if a path is accessible within the configured roots",
        inputSchema: {
            path: z.string().describe("Path to check"),
            requireWritable: z.boolean().optional().describe("Whether write access is required (default: false)")
        }
    }, async ({ path: checkPath, requireWritable = false }) => {
        const { allowed, reason } = isPathAllowed(checkPath, requireWritable);
        const accessType = requireWritable ? "write" : "read";
        return {
            content: [{
                    type: "text",
                    text: allowed
                        ? `✅ Path ${checkPath} is allowed for ${accessType} access`
                        : `❌ Path ${checkPath} is NOT allowed for ${accessType} access: ${reason}`
                }]
        };
    });
    log.info("Successfully registered roots-related tools");
}
/**
 * Get the current roots configuration
 */
export function getRootsConfig() {
    return ROOTS_CONFIG;
}
/**
 * Utility functions for external use
 */
export { isPathAllowed, safeReadFile, safeWriteFile, safeListDirectory };
