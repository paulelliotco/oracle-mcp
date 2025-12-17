# Contributing to Oracle MCP

Thank you for your interest in contributing to Oracle MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 18.17 or higher
- npm 9.0 or higher
- An OpenAI API key for testing

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/paulelliotco/oracle-mcp.git
cd oracle-mcp

# Install dependencies
npm install

# Set up environment variables
export OPENAI_API_KEY=sk-...
```

### Running Tests

```bash
# Run self-test
npm run selftest

# Run stdio server
npm start

# Run HTTP server
npm run start:http
```

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages: `git commit -m "feat: add new feature"`
5. Push to your fork: `git push origin feature/your-feature`
6. Open a Pull Request

### Commit Message Format

Use conventional commits:

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

## TypeScript Migration (Current Priority)

We're working on migrating from JavaScript to TypeScript. If you want to help:

1. Pick a module from `dist/`
2. Create a TypeScript version in `src/`
3. Add proper type annotations
4. Ensure tests pass
5. Submit a PR

## Testing

### Current Testing

The project includes a self-test utility:

```bash
npm run selftest
```

### Future Testing

We plan to add Jest/Vitest tests. When contributing:

1. Add unit tests for new functions
2. Add integration tests for new features
3. Ensure all tests pass: `npm test`
4. Maintain code coverage above 80%

## Code Style

### JavaScript/TypeScript

- Use ES2020+ features
- Use async/await instead of callbacks
- Add JSDoc comments for public APIs
- Use meaningful variable names

Example:

```typescript
/**
 * Processes a user query and returns guidance
 * @param question - The engineering question
 * @param context - Optional context information
 * @returns Promise<string> - The guidance response
 */
async function getGuidance(
  question: string,
  context?: string
): Promise<string> {
  // Implementation
}
```

## Documentation

- Update README.md for user-facing changes
- Update PRODUCTIZATION_GUIDE.md for development changes
- Add inline comments for complex logic
- Keep documentation up-to-date with code

## Reporting Issues

### Bug Reports

Include:
- Node.js version
- npm version
- Exact error message
- Steps to reproduce
- Expected vs actual behavior

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Example usage

## Pull Request Process

1. Update documentation
2. Add/update tests
3. Ensure all tests pass
4. Request review from maintainers
5. Address feedback
6. Merge when approved

## Release Process

Maintainers only:

```bash
# Update version
npm version patch  # or minor, major

# Publish to npm
npm publish

# Push to GitHub
git push origin main --tags
```

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Join our community discussions

Thank you for contributing!
