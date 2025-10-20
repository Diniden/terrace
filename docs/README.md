# Documentation Index

Welcome to the Terrace project documentation!

## Quick Links

### Getting Started
- **[Main README](../README.md)** - Project overview and features
- **[Setup Guide](../SETUP.md)** - Step-by-step installation
- **[Agent Usage Guide](../AGENT-USAGE.md)** - How to work with agents
- **[Project Summary](../PROJECT-SUMMARY.md)** - Complete overview

### Agent System
- **[Agent System Guide](./agents.md)** - Deep dive into the agent architecture
- **[REST API Agent](../.claude/agents/rest-api-agent.md)** - NestJS API expert
- **[Database Agent](../.claude/agents/database-agent.md)** - PostgreSQL & TypeORM expert
- **[Frontend Architect](../.claude/agents/frontend-architect-agent.md)** - React expert
- **[Business Logic Agent](../.claude/agents/business-logic-agent.md)** - Graph algorithms expert
- **[DevOps Agent](../.claude/agents/devops-agent.md)** - Bun scripts expert
- **[Project Manager](../.claude/agents/project-manager-agent.md)** - Documentation expert

### Conventions
- **[Global Rules](../.cursorrules)** - Project-wide standards
- **[Backend Rules](../backend/.cursorrules)** - NestJS conventions
- **[Frontend Rules](../frontend/.cursorrules)** - React conventions
- **[Scripts Rules](../scripts/.cursorrules)** - Automation conventions
- **[Docs Rules](./.cursorrules)** - Documentation style guide

## Documentation Structure

This documentation is organized into several sections:

### 1. Getting Started (Root Directory)
Quick start guides and overviews for new developers.

### 2. Agent System (This Directory + .claude/)
Comprehensive guides on how the multi-agent system works and how to use it effectively.

### 3. Conventions (.cursorrules Files)
Detailed conventions and patterns for each domain of the project.

### 4. In-Code Documentation
JSDoc comments, type definitions, and inline documentation throughout the codebase.

## What to Read First

### New to the Project?
1. [README.md](../README.md) - Understand what the project is
2. [SETUP.md](../SETUP.md) - Get everything running
3. [AGENT-USAGE.md](../AGENT-USAGE.md) - Learn how to work with agents

### Ready to Develop?
1. [Agent System Guide](./agents.md) - Understand the agent architecture
2. Relevant [.cursorrules](../.cursorrules) files - Learn the conventions
3. Individual agent docs - Deep dive into specific domains

### Need a Reference?
1. [PROJECT-SUMMARY.md](../PROJECT-SUMMARY.md) - Complete project reference
2. [.cursorrules](../.cursorrules) files - Convention reference
3. Agent documentation - Domain-specific patterns

## Topics Coming Soon

As the project develops, documentation will be added for:

- **Architecture Overview** - System design and component interaction
- **API Reference** - Complete REST API documentation
- **Database Schema** - Entity relationship diagrams and table structure
- **Graph Operations** - Graph algorithm implementations and usage
- **Development Guide** - Workflows, patterns, and best practices
- **Deployment Guide** - How to deploy the application
- **Contributing Guide** - How to contribute to the project
- **Troubleshooting** - Common issues and solutions

## Documentation Standards

All documentation follows these principles:

1. **Always Current** - Updated with code changes
2. **Example-Driven** - Working code examples
3. **Clear Structure** - Easy to scan and navigate
4. **Comprehensive** - Covers all use cases
5. **Accessible** - Written for different skill levels

See [Documentation Rules](./.cursorrules) for detailed style guidelines.

## Contributing to Documentation

When contributing:

1. Follow the [Documentation Rules](./.cursorrules)
2. Update relevant docs when changing code
3. Add examples for new features
4. Keep language clear and concise
5. Test all code examples

The **Project Manager Agent** will help maintain documentation quality and consistency.

## Getting Help

If you can't find what you're looking for:

1. Check the [README](../README.md) for quick answers
2. Search through the documentation
3. Review relevant `.cursorrules` files
4. Ask the agents for clarification
5. Check code examples in the project

## Documentation Feedback

If you find issues with the documentation:

- Unclear explanations
- Outdated information
- Missing examples
- Broken links
- Typos or errors

Please update the documentation or note the issue for the Project Manager Agent to address.

## Quick Reference Card

### Project Roles
- **REST API** → Controllers, DTOs, Guards
- **Database** → Entities, Migrations, Repos
- **Frontend** → Components, Hooks, Pages
- **Business Logic** → Services, Algorithms
- **DevOps** → Scripts, Automation
- **Project Manager** → Documentation

### Key Commands
```bash
bun run dev          # Start development
bun run build        # Build project
bun run test         # Run tests
bun run db:reset     # Reset database
bun run generate     # Generate code
```

### Key Files
- `.cursorrules` - Conventions for each directory
- `*.md` - Documentation files
- `package.json` - Scripts and dependencies
- `.env` - Environment configuration

---

This documentation is maintained by the Project Manager Agent and kept in sync with the codebase.

Last Updated: 2025-10-20
