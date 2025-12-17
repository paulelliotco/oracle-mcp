#!/usr/bin/env node
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
const log = {
    debug: (...args) => console.debug("[oracle-mcp:resources]", ...args),
    info: (...args) => console.log("[oracle-mcp:resources]", ...args),
    warn: (...args) => console.warn("[oracle-mcp:resources]", ...args),
    error: (...args) => console.error("[oracle-mcp:resources]", ...args),
};
// Sample data for demonstration - in a real implementation this might come from a database
const engineeringDocs = {
    "architecture-guide": {
        title: "System Architecture Guide",
        content: `# System Architecture Guide

## Overview
This document outlines the high-level architecture patterns and principles for our engineering systems.

## Core Principles
1. **Modularity**: Design systems as composable modules
2. **Scalability**: Build for horizontal scaling from day one
3. **Observability**: Instrument everything for monitoring and debugging
4. **Security**: Security by design, not as an afterthought

## Architecture Patterns
- Microservices with clear boundaries
- Event-driven communication
- CQRS for complex domains
- Circuit breakers for resilience

## Technology Stack
- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL, Redis for caching
- **Message Queue**: RabbitMQ or Apache Kafka
- **Monitoring**: Prometheus, Grafana, OpenTelemetry
`,
        lastModified: "2025-01-13T10:00:00Z",
        tags: ["architecture", "engineering", "best-practices"]
    },
    "coding-standards": {
        title: "Coding Standards and Best Practices",
        content: `# Coding Standards and Best Practices

## Code Style
- Use TypeScript for all new projects
- Follow ESLint and Prettier configurations
- Meaningful variable and function names
- Maximum function length: 50 lines

## Testing
- Unit tests for all business logic
- Integration tests for API endpoints
- Minimum 80% code coverage
- Test-driven development (TDD) preferred

## Code Review
- All code must be reviewed before merging
- Use pull request templates
- Address all review comments
- Squash commits before merging

## Documentation
- README for every project
- API documentation with OpenAPI/Swagger
- Inline comments for complex logic
- Architecture Decision Records (ADRs)
`,
        lastModified: "2025-01-12T15:30:00Z",
        tags: ["coding", "standards", "best-practices", "testing"]
    },
    "deployment-guide": {
        title: "Deployment and DevOps Guide",
        content: `# Deployment and DevOps Guide

## CI/CD Pipeline
1. **Build**: Compile TypeScript, run linting
2. **Test**: Unit tests, integration tests, security scans
3. **Package**: Docker image creation
4. **Deploy**: Staged deployment (dev → staging → prod)

## Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes for production
- **Load Balancing**: NGINX or cloud load balancers
- **SSL/TLS**: Let's Encrypt or cloud certificates

## Monitoring and Alerting
- Application metrics via Prometheus
- Log aggregation with ELK stack
- Uptime monitoring with synthetic tests
- Alert escalation policies

## Security
- Regular dependency updates
- Container image scanning
- Secrets management with HashiCorp Vault
- Network policies and firewalls
`,
        lastModified: "2025-01-11T09:15:00Z",
        tags: ["deployment", "devops", "ci-cd", "security"]
    }
};
const projectTemplates = {
    "microservice": {
        name: "Microservice Template",
        description: "Standard template for creating new microservices",
        files: [
            "src/index.ts",
            "src/routes/health.ts",
            "src/middleware/auth.ts",
            "Dockerfile",
            "docker-compose.yml",
            "package.json",
            "tsconfig.json",
            ".eslintrc.js",
            "README.md"
        ],
        technologies: ["typescript", "express", "docker", "jest"]
    },
    "frontend": {
        name: "Frontend Application Template",
        description: "React/TypeScript template for frontend applications",
        files: [
            "src/App.tsx",
            "src/components/",
            "src/hooks/",
            "src/utils/",
            "public/index.html",
            "package.json",
            "tsconfig.json",
            "vite.config.ts",
            "README.md"
        ],
        technologies: ["react", "typescript", "vite", "tailwindcss"]
    },
    "cli-tool": {
        name: "CLI Tool Template",
        description: "Template for command-line tools and utilities",
        files: [
            "src/cli.ts",
            "src/commands/",
            "src/utils/",
            "bin/cli.js",
            "package.json",
            "tsconfig.json",
            "README.md"
        ],
        technologies: ["typescript", "commander", "inquirer", "chalk"]
    }
};
/**
 * Register all resources with the MCP server
 */
export function registerResources(server) {
    log.info("Registering MCP resources...");
    // Direct resource: List all available engineering documents
    server.registerResource("engineering-docs-list", "oracle://docs/engineering", {
        title: "Engineering Documentation List",
        description: "List of all available engineering documentation",
        mimeType: "application/json"
    }, async (uri) => {
        log.debug("Fetching engineering docs list");
        const docsList = Object.entries(engineeringDocs).map(([id, doc]) => ({
            id,
            title: doc.title,
            lastModified: doc.lastModified,
            tags: doc.tags,
            uri: `oracle://docs/engineering/${id}`
        }));
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(docsList, null, 2),
                    mimeType: "application/json"
                }]
        };
    });
    // Templated resource: Get specific engineering document by ID
    server.registerResource("engineering-doc", new ResourceTemplate("oracle://docs/engineering/{docId}", { list: undefined }), {
        title: "Engineering Document",
        description: "Specific engineering documentation by ID"
    }, async (uri, { docId }) => {
        log.debug(`Fetching engineering doc: ${docId}`);
        const doc = engineeringDocs[docId];
        if (!doc) {
            throw new Error(`Engineering document '${docId}' not found. Available documents: ${Object.keys(engineeringDocs).join(', ')}`);
        }
        return {
            contents: [{
                    uri: uri.href,
                    text: doc.content,
                    mimeType: "text/markdown"
                }]
        };
    });
    // Direct resource: List all project templates
    server.registerResource("project-templates-list", "oracle://templates/projects", {
        title: "Project Templates List",
        description: "List of all available project templates",
        mimeType: "application/json"
    }, async (uri) => {
        log.debug("Fetching project templates list");
        const templatesList = Object.entries(projectTemplates).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description,
            technologies: template.technologies,
            uri: `oracle://templates/projects/${id}`
        }));
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(templatesList, null, 2),
                    mimeType: "application/json"
                }]
        };
    });
    // Templated resource: Get specific project template by ID
    server.registerResource("project-template", new ResourceTemplate("oracle://templates/projects/{templateId}", { list: undefined }), {
        title: "Project Template",
        description: "Specific project template configuration and files"
    }, async (uri, { templateId }) => {
        log.debug(`Fetching project template: ${templateId}`);
        const template = projectTemplates[templateId];
        if (!template) {
            throw new Error(`Project template '${templateId}' not found. Available templates: ${Object.keys(projectTemplates).join(', ')}`);
        }
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(template, null, 2),
                    mimeType: "application/json"
                }]
        };
    });
    // Direct resource: System status and health information
    server.registerResource("system-status", "oracle://system/status", {
        title: "System Status",
        description: "Current system status and health information",
        mimeType: "application/json"
    }, async (uri) => {
        log.debug("Fetching system status");
        const status = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            environment: process.env.NODE_ENV || "development",
            oracle: {
                model: process.env.ORACLE_MODEL || "o3",
                samplingMode: process.env.ORACLE_SAMPLING_MODE || "auto",
                maxTokensCap: Number(process.env.ORACLE_MAX_TOKENS_CAP || 4096)
            }
        };
        return {
            contents: [{
                    uri: uri.href,
                    text: JSON.stringify(status, null, 2),
                    mimeType: "application/json"
                }]
        };
    });
    log.info("Successfully registered all MCP resources");
}
