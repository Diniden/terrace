# Terrace

A full-stack application built with NestJS, React, and PostgreSQL, featuring a multi-agent development system and node-edge graph data structures.

## Features

- **Node-Edge Graph System**: Store and query complex graph structures using PostgreSQL
- **REST API**: Built with NestJS and TypeScript
- **Modern Frontend**: React with TypeScript and Vite
- **Multi-Agent Development**: Specialized Claude agents for different aspects of development
- **Type-Safe**: Full TypeScript coverage across backend and frontend
- **Fast Development**: Powered by Bun for scripts and package management

## Tech Stack

- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Frontend**: React with TypeScript and Vite
- **Runtime**: Bun for scripts and package management
- **Graph Operations**: Custom algorithms with PostgreSQL recursive CTEs

## Prerequisites

- [Bun](https://bun.sh) 1.0.0 or higher
- [PostgreSQL](https://www.postgresql.org/) 14 or higher
- Node.js 20+ (for tooling compatibility)

## Quick Start

### Installation

```bash
# Install dependencies for all workspaces
bun install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your configuration
# Update database credentials, API URLs, etc.
```

### Database Setup

```bash
# Create PostgreSQL database
createdb terrace_dev

# Run migrations and seed data
bun run db:reset
```

### Development

```bash
# Start all development servers (backend + frontend) with mprocs
bun run dev
```

This uses **mprocs** to run both backend and frontend concurrently with:
- Clean process management
- Easy navigation between service logs
- Single command to stop all services (Ctrl+C or 'q')

The backend will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

**Note**: All tests assume servers are running. Keep `bun run dev` running in one terminal while developing and testing.

## Project Structure

```
terrace/
├── .claude/
│   └── agents/              # Agent system definitions
│       ├── rest-api-agent.md
│       ├── database-agent.md
│       ├── frontend-architect-agent.md
│       ├── business-logic-agent.md
│       ├── devops-agent.md
│       └── project-manager-agent.md
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── ...
│   └── .cursorrules         # Backend-specific rules
├── frontend/                # React UI
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── ...
│   └── .cursorrules         # Frontend-specific rules
├── scripts/                 # Bun automation scripts
│   └── .cursorrules         # Scripts-specific rules
├── docs/                    # Documentation
│   └── .cursorrules         # Documentation rules
├── .cursorrules             # Global project rules
└── package.json             # Workspace configuration
```

## Agent System

This project uses a **multi-agent development system** where specialized Claude agents handle different aspects of development. Each agent is an expert in their domain and follows strict conventions defined in `.cursorrules` files.

### Available Agents

#### 1. REST API Agent (TypeScript Genius)
- **Domain**: Controllers, DTOs, Guards, Interceptors, Filters
- **Expertise**: NestJS, RESTful APIs, Validation, Authentication
- **Files**: [.claude/agents/rest-api-agent.md](.claude/agents/rest-api-agent.md)

#### 2. Database Agent (ORM & Graph Expert)
- **Domain**: Entities, Migrations, Repositories
- **Expertise**: PostgreSQL, TypeORM, Graph Modeling, Query Optimization
- **Files**: [.claude/agents/database-agent.md](.claude/agents/database-agent.md)

#### 3. Frontend Architect Agent (React Expert)
- **Domain**: Components, Hooks, State Management, UI/UX
- **Expertise**: React, TypeScript, Performance, Accessibility
- **Files**: [.claude/agents/frontend-architect-agent.md](.claude/agents/frontend-architect-agent.md)

#### 4. Business Logic Agent (Graph Operations Expert)
- **Domain**: Services, Graph Algorithms, Domain Logic
- **Expertise**: Business Rules, Graph Traversal, Algorithms
- **Files**: [.claude/agents/business-logic-agent.md](.claude/agents/business-logic-agent.md)

#### 5. DevOps Agent (Bun Scripts Expert)
- **Domain**: Scripts, Automation, Build Tools
- **Expertise**: Bun, TypeScript Scripting, Developer Tools
- **Files**: [.claude/agents/devops-agent.md](.claude/agents/devops-agent.md)

#### 6. Project Manager Agent (Documentation Expert)
- **Domain**: READMEs, Documentation, Guides
- **Expertise**: Technical Writing, Markdown, Knowledge Management
- **Files**: [.claude/agents/project-manager-agent.md](.claude/agents/project-manager-agent.md)

### Agent Principles

All agents follow these core principles:

1. **Scope Restriction**: Agents only modify files within this project
2. **No CI/CD**: Agents don't manage git push, pull requests, or CI/CD
3. **Cursor Rules Maintenance**: All agents must keep `.cursorrules` files up to date
4. **Type Safety**: All code must be properly typed with TypeScript
5. **Testing**: All business logic must be tested
6. **Documentation**: All public APIs must be documented

### How to Use Agents

When working with Claude Code in this project:

1. Claude will automatically detect which agent should handle your request based on the files involved
2. Each agent follows the conventions in their respective `.cursorrules` file
3. Agents coordinate across domains when needed
4. All agents maintain documentation and cursor rules as they work

## Available Scripts

### Development
```bash
bun run dev              # Start all development servers
```

### Building
```bash
bun run build            # Build both backend and frontend
bun run build:backend    # Build backend only
bun run build:frontend   # Build frontend only
bun run build:clean      # Clean and rebuild everything
```

### Testing
```bash
# Unit/Integration tests (assumes server is running)
bun run test             # Run all tests
bun run test:backend     # Run backend tests
bun run test:frontend    # Run frontend tests

# E2E tests with Playwright (assumes server is running)
bun run test:e2e         # Run E2E tests (headless)
bun run test:e2e:ui      # Interactive UI mode
bun run test:e2e:debug   # Debug mode
```

**Important**: Keep `bun run dev` running in a separate terminal before running tests.

### Database
```bash
bun run db:reset         # Drop, migrate, and seed database
bun run db:seed          # Seed database with test data
```

### Code Generation
```bash
bun run generate entity UserProfile    # Generate entity
bun run generate service UserProfile   # Generate service
bun run generate controller Users      # Generate controller
bun run generate component UserCard    # Generate React component
```

### Code Quality
```bash
bun run format           # Format all code
bun run format:check     # Check formatting
bun run lint             # Lint all code
bun run lint:fix         # Fix linting issues
bun run typecheck        # Check TypeScript types
```

## Graph Data Model

The application uses a node-edge graph model stored in PostgreSQL:

### Nodes
- Represent entities in your domain
- Have types, names, and flexible metadata (JSONB)
- Support soft deletes

### Edges
- Represent relationships between nodes
- Can be directed or undirected
- Have types, weights, and properties
- Support graph algorithms (shortest path, traversal, etc.)

### Example
```typescript
// Create nodes
const user = await nodesService.create({
  name: 'John Doe',
  type: 'user',
  metadata: { email: 'john@example.com' }
});

const project = await nodesService.create({
  name: 'My Project',
  type: 'project',
  metadata: { status: 'active' }
});

// Create edge
const membership = await edgesService.create({
  sourceNodeId: user.id,
  targetNodeId: project.id,
  type: 'member-of',
  properties: { role: 'owner' }
});

// Find connected nodes
const userProjects = await graphService.findConnectedNodes(user.id, 2);

// Find shortest path
const path = await graphService.findShortestPath(user.id, anotherUser.id);
```

## Documentation

Detailed documentation is available in the [docs](./docs) directory:

- [Architecture Overview](./docs/architecture.md) - System design and architecture
- [API Reference](./docs/api.md) - Complete API documentation
- [Database Schema](./docs/database.md) - Database structure and migrations
- [Graph Operations](./docs/graph-operations.md) - Graph algorithms and usage
- [Development Guide](./docs/development.md) - Development workflows
- [Agent System Guide](./docs/agents.md) - How the agent system works

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=terrace_dev

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## Development Workflow

### 1. Planning a Feature
- Review relevant `.cursorrules` files
- Identify which agents will be involved
- Plan database changes first (migrations)
- Design API endpoints
- Plan frontend components

### 2. Implementation
- Start with database entities and migrations
- Implement services with business logic
- Create API controllers and DTOs
- Build frontend components
- Write tests for each layer

### 3. Documentation
- Update API documentation
- Update relevant READMEs
- Update `.cursorrules` if patterns changed
- Add examples if needed

## Testing

### Backend Tests
```bash
cd backend
bun test                 # Unit tests
bun test:e2e             # E2E tests
bun test:cov             # Coverage report
```

### Frontend Tests
```bash
cd frontend
bun test                 # Unit tests
bun test:ui              # Interactive UI
```

## Cursor Rules System

The project uses a hierarchical cursor rules system:

```
.cursorrules (Global rules - always apply)
├── backend/.cursorrules (Backend-specific)
├── frontend/.cursorrules (Frontend-specific)
├── scripts/.cursorrules (Scripts-specific)
└── docs/.cursorrules (Documentation-specific)
```

**Important**: All agents must keep these files synchronized with code changes. When patterns change, update the relevant `.cursorrules` file.

## Constraints

The agent system has the following constraints:

- ✅ Can modify any file within this project
- ✅ Can run tests, builds, and local scripts
- ✅ Can interact with the local database
- ❌ Cannot perform git push or CI/CD operations
- ❌ Cannot modify files outside this project
- ❌ Cannot install global dependencies

## Contributing

When contributing to this project:

1. Follow the conventions in `.cursorrules` files
2. Write tests for new features
3. Update documentation
4. Ensure all type checks pass
5. Format code with Prettier
6. Update `.cursorrules` if you introduce new patterns

## License

[Your License Here]

## Support

For issues and questions:
- Review the [documentation](./docs)
- Check the [agent guides](./.claude/agents)
- Review `.cursorrules` for conventions
- Check existing code for patterns

---

Built with the multi-agent development system powered by [Claude Code](https://claude.com/claude-code).
