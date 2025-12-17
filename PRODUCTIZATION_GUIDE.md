# Oracle MCP - Productization Guide

## Overview

The `oracle-mcp` package has been successfully recovered and productized. This guide outlines the current state of the project, how to use it, and the roadmap for future development.

## Current State

The project is now in a **production-ready state** with the following characteristics:

- **Language**: JavaScript (ES2020 modules)
- **Runtime**: Node.js 18.17+
- **Distribution**: Published on npm as `oracle-mcp`
- **Functionality**: Fully operational MCP server with stdio and HTTP transport support

### Project Structure

```
oracle-mcp/
├── dist/                    # Compiled JavaScript files (production)
│   ├── index.js            # Main stdio server entry point
│   ├── http-server.js      # HTTP server implementation
│   ├── prompts.js          # MCP prompt templates
│   ├── resources.js        # MCP resources
│   ├── roots.js            # File system access tools
│   └── self-test.js        # Self-test utility
├── package.json            # Project metadata and dependencies
├── README.md               # User documentation
├── README-CLOUD.md         # Cloud deployment guide
└── PRODUCTIZATION_GUIDE.md # This file
```

## Quick Start

### Installation

Install globally:
```bash
npm install -g oracle-mcp@1.0.1
```

Or use directly with npx:
```bash
export OPENAI_API_KEY=sk-...
npx oracle-mcp@1.0.1
```

### Running the Server

**Stdio Mode (Default)**:
```bash
export OPENAI_API_KEY=sk-...
npm start
```

**HTTP Server Mode**:
```bash
export OPENAI_API_KEY=sk-...
npm run start:http
```

The HTTP server listens on port 8787 by default.

### Self-Test

Verify the installation:
```bash
export OPENAI_API_KEY=sk-...
npm run selftest
```

## Configuration

### Required Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ORACLE_MODEL` | `o3` | OpenAI model to use |
| `ORACLE_MCP_LOG_LEVEL` | `info` | Logging level: `debug` or `info` |
| `ORACLE_MAX_TOKENS_CAP` | `4096` | Maximum output tokens |
| `ORACLE_SAMPLING_MODE` | `auto` | Sampling mode for responses |
| `PORT` | `8787` | HTTP server port |
| `MCP_AUTH_TOKEN` | - | Authentication token for HTTP requests |
| `MCP_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Allowed hosts for DNS protection |
| `MCP_READONLY_ROOTS` | - | Comma-separated readonly directory paths |
| `MCP_WRITABLE_ROOTS` | - | Comma-separated writable directory paths |

## Features

### Tools

- **oracle**: Deep engineering guidance using OpenAI's reasoning models
- **list_roots**: List configured file system roots
- **read_file**: Read files within allowed roots
- **write_file**: Write files to writable roots
- **list_directory**: List directory contents
- **check_path_access**: Verify path accessibility

### Resources

- Engineering documentation
- Project templates
- System status information

### Prompts

- Engineering guidance
- Code review
- Architecture design
- Debug assistance
- Performance optimization

## Deployment

### Local Development

```bash
npm install
npm start
```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV OPENAI_API_KEY=""
ENV PORT=8787

EXPOSE 8787

CMD ["npm", "run", "start:http"]
```

Build and run:
```bash
docker build -t oracle-mcp .
docker run -e OPENAI_API_KEY=sk-... -p 8787:8787 oracle-mcp
```

### Cloud Deployment

See `README-CLOUD.md` for detailed cloud deployment instructions.

## Development Roadmap

### Phase 1: TypeScript Migration (Recommended)

The original source code was written in TypeScript. To improve maintainability and type safety:

1. **Create `src/` directory** with TypeScript source files
2. **Add `tsconfig.json`** for TypeScript compilation
3. **Migrate JavaScript to TypeScript** with proper type annotations
4. **Add comprehensive tests** using Jest or Vitest
5. **Update build scripts** in `package.json`

#### Steps to Migrate:

```bash
# 1. Create source structure
mkdir src
cp dist/*.js src/
cd src && for f in *.js; do mv "$f" "${f%.js}.ts"; done

# 2. Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# 3. Add dev dependencies
npm install --save-dev typescript @types/node @types/express

# 4. Update package.json scripts
npm set-script build "tsc"
npm set-script dev "tsc --watch"
```

### Phase 2: Testing & Quality Assurance

- Add unit tests for each module
- Add integration tests for MCP server
- Set up CI/CD pipeline (GitHub Actions)
- Add code coverage reporting
- Implement linting (ESLint)

### Phase 3: Enhanced Features

- Add caching for frequently accessed resources
- Implement request rate limiting per API key
- Add support for custom model configurations
- Implement streaming responses for large outputs
- Add webhook support for async operations

### Phase 4: Documentation & Community

- Create API documentation (OpenAPI/Swagger)
- Add example integrations
- Create video tutorials
- Set up community Discord/Slack
- Establish contribution guidelines

## Publishing Updates

### To npm

```bash
# Update version in package.json
npm version patch  # or minor, major

# Publish
npm publish
```

### To GitHub

```bash
git add .
git commit -m "Release v1.0.2"
git tag v1.0.2
git push origin main --tags
```

## Troubleshooting

### Common Issues

**Issue**: `OPENAI_API_KEY is missing`
- **Solution**: Set the environment variable: `export OPENAI_API_KEY=sk-...`

**Issue**: Port 8787 already in use
- **Solution**: Change the port: `PORT=8888 npm run start:http`

**Issue**: File access denied
- **Solution**: Configure allowed roots: `MCP_READONLY_ROOTS=/path/to/docs npm start`

## Support & Contributing

- **Issues**: Report bugs on [GitHub Issues](https://github.com/paulelliotco/oracle-mcp/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/paulelliotco/oracle-mcp/discussions)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines

## License

MIT - See LICENSE file for details

## Next Steps

1. **Immediate**: Test the application in your environment
2. **Short-term**: Consider TypeScript migration for better maintainability
3. **Medium-term**: Add comprehensive tests and CI/CD
4. **Long-term**: Expand features based on user feedback

For questions or issues, please open an issue on GitHub.
