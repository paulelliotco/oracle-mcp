# oracle-mcp: Cloud (HTTP) deployment

This project includes an optional Streamable HTTP entrypoint so remote MCP clients can connect without spawning a local process.

## Start locally (HTTP)
```bash
export OPENAI_API_KEY=sk-...
export ORACLE_MODEL=o3
npm run build
npm run start:http
# server listens on :8787 (override with PORT)
```

HTTP Endpoints (Streamable HTTP transport)
- POST /mcp  – client-to-server JSON-RPC messages (initializes session)
- GET  /mcp  – SSE for server-to-client notifications
- DELETE /mcp – end session

Set header `mcp-session-id` returned from initialize in subsequent requests.

## Deploy options

### Render / Fly.io / Railway (recommended)
- Node 18+ runtime
- `npm run start:http`
- Env: `OPENAI_API_KEY`, optional `ORACLE_MODEL`, `ORACLE_MCP_LOG_LEVEL=info`, `ORACLE_SAMPLING_MODE=auto`
- Expose port (Render will set PORT automatically).

### Cloudflare Workers / Pages
Workers can host Streamable HTTP but the current SDK server transport targets Node request/response types. Two paths:
1) Quick path: run a small Node container on Cloudflare **Containers** (beta) or another host (Fly/Render). This uses our existing http-server.js.
2) Custom Worker transport: implement MCP Streamable HTTP endpoints using the Worker global fetch handler and wire to the SDK when Worker support lands. Today, the official TypeScript SDK's StreamableHTTPServerTransport expects Node/Express; Worker adaptation requires a small compatibility layer.

### Vercel
- Serverless time limits may end SSE sessions. Prefer a node server (Vercel Edge Functions aren’t a drop-in yet for SDK’s server transport). Use Render/Fly for long-lived connections.

## Client configuration (remote)
Example client (supports MCP Streamable HTTP):
```
{
  "mcpServers": {
    "oracle-remote": {
      "transport": "http",
      "url": "https://your-host.example.com/mcp",
      "headers": { },
      "env": {
        "OPENAI_API_KEY": "(if required server-side, omit here)",
        "ORACLE_MODEL": "o3"
      }
    }
  }
}
```

## Security
- Keep OPENAI_API_KEY server-side only for remote deployments.
- Built-in hardening (HTTP):
  - DNS-rebinding protection enabled; allowed hosts default to `127.0.0.1,localhost` (override via `MCP_ALLOWED_HOSTS`)
  - Optional auth: set `MCP_AUTH_TOKEN` and require header `x-mcp-auth: <token>`
  - JSON body size limited to 200kb (adjust by editing `express.json({ limit: ... })`)
- Still recommended: put an auth/allowlist in front of `/mcp` (reverse proxy / gateway), and apply rate limiting.
- For scaling with a load balancer, prefer sticky sessions for Streamable HTTP so `POST /mcp` and `GET /mcp` (SSE) hit the same instance. If you cannot use sticky sessions, be aware that disabling server→client streams (stateless/json-response modes) reduces functionality (progress/logging, sampling).

## Sampling mode (HTTP)

- Set `ORACLE_SAMPLING_MODE` to control whether the server requests client-side sampling:
  - `auto` (default): try client sampling first; if unavailable, fall back to server-side (requires `OPENAI_API_KEY`).
  - `always`: require client sampling; error if not supported by the client.
  - `off`: always use server-side generation (requires `OPENAI_API_KEY`).
- For public deployments, `auto` is recommended along with `MCP_AUTH_TOKEN` and a reverse proxy with allowlists/rate limits.



## Progress and cancellation

- The HTTP transport streams progress and logging to clients via SSE when supported by the MCP client.
- Client cancellations are propagated to the OpenAI request and will terminate work promptly.
