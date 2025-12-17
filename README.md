# oracle-mcp

A comprehensive Model Context Protocol (MCP) server that provides deep engineering advice via OpenAI. Features full MCP compliance with tools, resources, prompts, and file system access controls. Supports both stdio (local) and Streamable HTTP (remote) transports.

## Features

- **Oracle Tool**: Deep engineering guidance using OpenAI's reasoning models
- **Resources**: Access engineering documentation and project templates
- **Prompts**: Pre-built prompt templates for common engineering tasks
- **File System Access**: Secure file operations with configurable roots
- **Security**: Path validation and sandboxing for file operations
- **Dual Transport**: Both stdio and HTTP transport support

## Quick Start

### NPX (Recommended)
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run directly with npx (no installation needed)
npx oracle-mcp@1.0.0
```

### Global Installation
```bash
# Install globally
npm install -g oracle-mcp@1.0.0

# Run the server
oracle-mcp
```

### MCP Client Configuration
Add to your MCP client (e.g., Amp):
```json
{
  "mcpServers": {
    "oracle": {
      "command": "npx",
      "args": ["-y", "oracle-mcp@1.0.0"],
      "env": { "OPENAI_API_KEY": "sk-..." }
    }
  }
}
```

## Configuration

### Required
- `OPENAI_API_KEY`: Your OpenAI API key

### Optional
- `ORACLE_MODEL`: Model name (default: `"o3"`)
- `ORACLE_MCP_LOG_LEVEL`: Log level `debug` or `info` (default: `"info"`)
- `MCP_READONLY_ROOTS`: Comma-separated readonly directory paths
- `MCP_WRITABLE_ROOTS`: Comma-separated writable directory paths

### HTTP Server (Optional)
- `PORT`: Server port (default: `8787`)
- `MCP_AUTH_TOKEN`: Authentication token for HTTP requests
- `MCP_ALLOWED_HOSTS`: Allowed hosts for DNS protection (default: `127.0.0.1,localhost`)

### Example
```bash
export OPENAI_API_KEY=sk-...
export ORACLE_MODEL=o3
export MCP_READONLY_ROOTS="/path/to/docs,/path/to/examples"
export MCP_WRITABLE_ROOTS="/path/to/output,/path/to/tmp"
npx oracle-mcp@1.0.0
```

## HTTP Server Mode

For remote deployments, oracle-mcp supports HTTP transport:

```bash
# Start HTTP server
export OPENAI_API_KEY=sk-...
export PORT=8787
npx oracle-mcp@1.0.0 --http
```

**Endpoints:**
- `POST /mcp` – Initialize MCP session
- `GET /mcp` – Server-to-client message stream  
- `DELETE /mcp` – End session

For production deployment, see [README-CLOUD.md](README-CLOUD.md).

## Tools

### oracle

Provides deep engineering guidance using a higher-reasoning model.

**Parameters:**
- `question` (string, required): The engineering question or problem to analyze
- `context` (string, optional): Additional context or background information
- `sections` (array, optional): Specific sections to include in the response
- `model` (string, optional): OpenAI model to use (defaults to environment variable)
- `maxOutputTokens` (integer, optional): Maximum tokens for the response
- `temperature` (number, optional): Temperature for response generation
- `timeoutMs` (integer, optional): Request timeout in milliseconds

### File System Tools

#### list_roots
List all configured file system roots (readonly and writable).

#### read_file
Read the contents of a file within allowed roots.
- `path` (string, required): Path to the file to read

#### write_file
Write content to a file within writable roots.
- `path` (string, required): Path to the file to write
- `content` (string, required): Content to write to the file

#### list_directory
List the contents of a directory within allowed roots.
- `path` (string, required): Path to the directory to list

#### check_path_access
Check if a path is accessible within the configured roots.
- `path` (string, required): Path to check
- `requireWritable` (boolean, optional): Whether write access is required

## Resources

### Engineering Documentation
- `oracle://docs/engineering` - List of all engineering documents
- `oracle://docs/engineering/{docId}` - Specific engineering document (architecture-guide, coding-standards, deployment-guide)

### Project Templates
- `oracle://templates/projects` - List of all project templates
- `oracle://templates/projects/{templateId}` - Specific project template (microservice, frontend, cli-tool)

### System Information
- `oracle://system/status` - Current system status and configuration

## Prompts

### engineering_guidance
Get comprehensive engineering guidance on technical topics with structured analysis.
- `topic` (string, required): The engineering topic or question to analyze
- `context` (string, optional): Additional context or background information
- `focus_areas` (string, optional): Comma-separated focus areas
- `complexity_level` (string, optional): Target complexity level

### code_review
Comprehensive code review with focus on quality, security, and best practices.
- `code` (string, required): The code to review
- `language` (string, optional): Programming language
- `review_type` (string, optional): Type of review to perform
- `project_context` (string, optional): Context about the project

### architecture_design
Design system architecture with comprehensive analysis and recommendations.
- `requirements` (string, required): System requirements and constraints
- `scale` (string, optional): Expected system scale
- `technologies` (string, optional): Preferred technologies
- `constraints` (string, optional): Technical or business constraints

### debug_assistance
Get help debugging issues with systematic troubleshooting approach.
- `problem_description` (string, required): Description of the problem
- `error_message` (string, optional): Specific error message
- `environment` (string, optional): Environment details
- `steps_to_reproduce` (string, optional): Steps to reproduce the issue
- `attempted_solutions` (string, optional): Solutions already tried

### performance_optimization
Analyze and optimize system or code performance.
- `target` (string, required): What to optimize
- `current_metrics` (string, optional): Current performance metrics
- `performance_goals` (string, optional): Target performance goals
- `constraints` (string, optional): Constraints to consider

## Configuration

### File System Roots
Configure allowed file system access via environment variables:
- `MCP_READONLY_ROOTS` - Comma-separated list of readonly root paths
- `MCP_WRITABLE_ROOTS` - Comma-separated list of writable root paths

Default roots:
- **Readonly**: Current directory, docs/, examples/
- **Writable**: tmp/, output/

## Usage Examples

### With Amp
Add to your Amp config:

```json
{
  "mcpServers": {
    "oracle": {
      "command": "npx",
      "args": ["-y", "oracle-mcp@1.0.0"],
      "env": { "OPENAI_API_KEY": "sk-..." }
    }
  }
}
```

### Using Tools
```
{{#tool oracle}}
{
  "question": "How do we migrate our Node/TS packages to ESM safely?",
  "sections": ["summary", "plan", "risks", "verification"]
}
{{/tool}}
```

### Using Resources
```
Access engineering documentation: oracle://docs/engineering/architecture-guide
Browse project templates: oracle://templates/projects/microservice
Check system status: oracle://system/status
```

### Using Prompts
```
{{#prompt engineering_guidance}}
{
  "topic": "microservices architecture",
  "complexity_level": "intermediate"
}
{{/prompt}}
```

## Additional Information

- **Security**: Path validation and sandboxing for file system access
- **MCP Compliance**: 100% implementation of MCP guide requirements
- **Performance**: Configurable timeouts and token limits
- **Cloud Deployment**: See [README-CLOUD.md](README-CLOUD.md) for production setup
- **Package**: Available on [npm](https://www.npmjs.com/package/oracle-mcp)
- **Repository**: [GitHub](https://github.com/paulelliotco/oracle-mcp)
