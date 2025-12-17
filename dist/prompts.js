#!/usr/bin/env node
import { z } from "zod";
const log = {
    debug: (...args) => console.debug("[oracle-mcp:prompts]", ...args),
    info: (...args) => console.log("[oracle-mcp:prompts]", ...args),
    warn: (...args) => console.warn("[oracle-mcp:prompts]", ...args),
    error: (...args) => console.error("[oracle-mcp:prompts]", ...args),
};
/**
 * Template interpolation function
 */
function interpolateTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key in variables) {
            return String(variables[key]);
        }
        log.warn(`Template variable '${key}' not found in provided variables`);
        return match; // Keep the placeholder if variable not found
    });
}
/**
 * Register all prompt templates with the MCP server
 */
export function registerPrompts(server) {
    log.info("Registering MCP prompt templates...");
    // Engineering guidance prompt template
    server.registerPrompt("engineering_guidance", {
        title: "Engineering Guidance",
        description: "Get comprehensive engineering guidance on technical topics with structured analysis",
        argsSchema: {
            topic: z.string().describe("The engineering topic or question to analyze"),
            context: z.string().optional().describe("Additional context or background information"),
            focus_areas: z.string().optional().describe("Comma-separated focus areas: architecture, performance, security, scalability, maintainability, testing"),
            complexity_level: z.string().optional().describe("Target complexity level: beginner, intermediate, advanced")
        }
    }, ({ topic, context, focus_areas = "architecture, performance, security", complexity_level = "intermediate" }) => {
        const focusAreasText = focus_areas;
        const contextSection = context ? `\n\nAdditional Context:\n${context}` : "";
        const prompt = `You are a senior principal engineer providing comprehensive technical guidance.

Topic: ${topic}${contextSection}

Please provide ${complexity_level}-level engineering guidance focusing on: ${focusAreasText}

Structure your response with these sections:
- **OVERVIEW**: Brief summary of the topic and key considerations
- **TECHNICAL ANALYSIS**: Deep dive into the technical aspects
- **BEST PRACTICES**: Recommended approaches and patterns
- **POTENTIAL PITFALLS**: Common mistakes and how to avoid them
- **IMPLEMENTATION GUIDANCE**: Practical steps and considerations
- **FURTHER READING**: Relevant resources and documentation

Keep the guidance actionable, specific, and backed by engineering best practices.`;
        return {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }]
        };
    });
    // Code review prompt template
    server.registerPrompt("code_review", {
        title: "Code Review",
        description: "Comprehensive code review with focus on quality, security, and best practices",
        argsSchema: {
            code: z.string().describe("The code to review"),
            language: z.string().optional().describe("Programming language (auto-detected if not specified)"),
            review_type: z.string().optional().describe("Type of review: security, performance, maintainability, comprehensive"),
            project_context: z.string().optional().describe("Context about the project or codebase")
        }
    }, ({ code, language, review_type = "comprehensive", project_context }) => {
        const languageSection = language ? `\nLanguage: ${language}` : "";
        const contextSection = project_context ? `\nProject Context: ${project_context}` : "";
        const reviewFocus = {
            security: "Focus primarily on security vulnerabilities, input validation, and potential attack vectors.",
            performance: "Focus primarily on performance optimization, algorithmic efficiency, and resource usage.",
            maintainability: "Focus primarily on code clarity, documentation, and long-term maintainability.",
            comprehensive: "Provide a comprehensive review covering security, performance, maintainability, and best practices."
        };
        const focusText = reviewFocus[review_type] || reviewFocus.comprehensive;
        const prompt = `Please perform a ${review_type} code review of the following code.${languageSection}${contextSection}

${focusText}

Code to review:
\`\`\`
${code}
\`\`\`

Please structure your review as follows:
- **SUMMARY**: Overall assessment and key findings
- **STRENGTHS**: What the code does well
- **ISSUES**: Problems found (categorized by severity: Critical, Major, Minor)
- **RECOMMENDATIONS**: Specific improvements and fixes
- **BEST PRACTICES**: Suggestions for following language/framework conventions
- **REFACTORED CODE**: Improved version of critical sections (if applicable)

Rate the overall code quality on a scale of 1-10 and provide reasoning.`;
        return {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }]
        };
    });
    // Architecture design prompt template
    server.registerPrompt("architecture_design", {
        title: "Architecture Design",
        description: "Design system architecture with comprehensive analysis and recommendations",
        argsSchema: {
            requirements: z.string().describe("System requirements and constraints"),
            scale: z.string().optional().describe("Expected system scale: small, medium, large, enterprise"),
            technologies: z.string().optional().describe("Comma-separated list of preferred or required technologies"),
            constraints: z.string().optional().describe("Technical or business constraints")
        }
    }, ({ requirements, scale = "medium", technologies = "", constraints }) => {
        const techSection = technologies ? `\nPreferred Technologies: ${technologies}` : "";
        const constraintsSection = constraints ? `\nConstraints: ${constraints}` : "";
        const prompt = `Design a system architecture for the following requirements:

${requirements}

Scale: ${scale}${techSection}${constraintsSection}

Please provide a comprehensive architecture design with the following sections:

- **SYSTEM OVERVIEW**: High-level description and key objectives
- **ARCHITECTURE DIAGRAM**: Text-based representation of the system components
- **COMPONENT BREAKDOWN**: Detailed description of each major component
- **DATA FLOW**: How data moves through the system
- **TECHNOLOGY STACK**: Recommended technologies and justification
- **SCALABILITY STRATEGY**: How the system will handle growth
- **SECURITY CONSIDERATIONS**: Security measures and best practices
- **DEPLOYMENT STRATEGY**: How to deploy and operate the system
- **MONITORING & OBSERVABILITY**: Logging, metrics, and alerting approach
- **TRADE-OFFS**: Key architectural decisions and their implications
- **MIGRATION PATH**: If replacing an existing system, how to migrate

Focus on practical, proven patterns and provide specific implementation guidance.`;
        return {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }]
        };
    });
    // Debugging assistance prompt template
    server.registerPrompt("debug_assistance", {
        title: "Debug Assistance",
        description: "Get help debugging issues with systematic troubleshooting approach",
        argsSchema: {
            problem_description: z.string().describe("Description of the problem or error"),
            error_message: z.string().optional().describe("Specific error message or stack trace"),
            environment: z.string().optional().describe("Environment details (OS, language version, etc.)"),
            steps_to_reproduce: z.string().optional().describe("Steps to reproduce the issue"),
            attempted_solutions: z.string().optional().describe("Solutions already tried")
        }
    }, ({ problem_description, error_message, environment, steps_to_reproduce, attempted_solutions }) => {
        const errorSection = error_message ? `\nError Message:\n${error_message}` : "";
        const envSection = environment ? `\nEnvironment: ${environment}` : "";
        const stepsSection = steps_to_reproduce ? `\nSteps to Reproduce:\n${steps_to_reproduce}` : "";
        const attemptedSection = attempted_solutions ? `\nAlready Tried:\n${attempted_solutions}` : "";
        const prompt = `Help me debug the following issue:

Problem: ${problem_description}${errorSection}${envSection}${stepsSection}${attemptedSection}

Please provide systematic debugging assistance with the following structure:

- **PROBLEM ANALYSIS**: Break down the issue and identify potential root causes
- **DIAGNOSTIC STEPS**: Specific steps to gather more information
- **LIKELY CAUSES**: Most probable causes ranked by likelihood
- **SOLUTION STRATEGIES**: Recommended approaches to fix the issue
- **PREVENTION**: How to prevent similar issues in the future
- **DEBUGGING TOOLS**: Relevant tools and techniques for this type of issue
- **CODE EXAMPLES**: If applicable, provide code snippets for fixes or diagnostics

Focus on systematic troubleshooting and provide actionable steps.`;
        return {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }]
        };
    });
    // Performance optimization prompt template
    server.registerPrompt("performance_optimization", {
        title: "Performance Optimization",
        description: "Analyze and optimize system or code performance",
        argsSchema: {
            target: z.string().describe("What to optimize (code, database, system, etc.)"),
            current_metrics: z.string().optional().describe("Current performance metrics or benchmarks"),
            performance_goals: z.string().optional().describe("Target performance goals"),
            constraints: z.string().optional().describe("Constraints or limitations to consider")
        }
    }, ({ target, current_metrics, performance_goals, constraints }) => {
        const metricsSection = current_metrics ? `\nCurrent Metrics:\n${current_metrics}` : "";
        const goalsSection = performance_goals ? `\nPerformance Goals:\n${performance_goals}` : "";
        const constraintsSection = constraints ? `\nConstraints:\n${constraints}` : "";
        const prompt = `Provide performance optimization guidance for: ${target}${metricsSection}${goalsSection}${constraintsSection}

Please structure your optimization analysis as follows:

- **PERFORMANCE ASSESSMENT**: Current state analysis and bottleneck identification
- **MEASUREMENT STRATEGY**: How to properly measure and benchmark performance
- **OPTIMIZATION OPPORTUNITIES**: Specific areas for improvement ranked by impact
- **IMPLEMENTATION PLAN**: Step-by-step optimization approach
- **CODE/CONFIG EXAMPLES**: Specific examples of optimizations
- **MONITORING**: How to track performance improvements
- **TRADE-OFFS**: Performance vs. other factors (maintainability, cost, etc.)
- **VALIDATION**: How to verify optimizations are effective

Focus on data-driven optimization with measurable improvements.`;
        return {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }]
        };
    });
    log.info("Successfully registered all prompt templates");
}
/**
 * Utility function to get available prompt templates
 */
export function getAvailablePrompts() {
    return [
        {
            name: "engineering_guidance",
            title: "Engineering Guidance",
            description: "Get comprehensive engineering guidance on technical topics with structured analysis"
        },
        {
            name: "code_review",
            title: "Code Review",
            description: "Comprehensive code review with focus on quality, security, and best practices"
        },
        {
            name: "architecture_design",
            title: "Architecture Design",
            description: "Design system architecture with comprehensive analysis and recommendations"
        },
        {
            name: "debug_assistance",
            title: "Debug Assistance",
            description: "Get help debugging issues with systematic troubleshooting approach"
        },
        {
            name: "performance_optimization",
            title: "Performance Optimization",
            description: "Analyze and optimize system or code performance"
        }
    ];
}
