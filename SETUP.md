# Setup Guide

This guide will help you get the Terrace project up and running.

## Prerequisites

Before starting, ensure you have:

- [Bun](https://bun.sh) 1.0.0+ installed
- [PostgreSQL](https://www.postgresql.org/) 14+ installed and running
- A code editor (VS Code recommended with Claude Code extension)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# From the project root
bun install
```

This will install dependencies for all workspaces (backend, frontend, and root).

### 2. Configure Environment Variables

#### Backend Environment

```bash
# Copy the example file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
# At minimum, configure your database connection
```

Example `backend/.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=terrace_dev

PORT=3000
NODE_ENV=development

JWT_SECRET=change-this-to-a-random-string
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

#### Frontend Environment

```bash
# Copy the example file
cp frontend/.env.example frontend/.env

# Usually the defaults are fine for local development
```

### 3. Set Up the Database

#### Create the Database

```bash
# Using psql
createdb terrace_dev

# Or using psql command line
psql postgres -c "CREATE DATABASE terrace_dev;"
```

#### Run Migrations (Not yet implemented)

Once the database entities are created, you'll run:
```bash
cd backend
bun run typeorm migration:run
```

For now, the schema will be auto-created by TypeORM in development mode.

### 4. Start Development Servers

#### Option A: Start Everything

```bash
# From project root
bun run dev
```

This will start both the backend and frontend concurrently.

#### Option B: Start Individually

```bash
# Terminal 1 - Backend
cd backend
bun run start:dev

# Terminal 2 - Frontend
cd frontend
bun run dev
```

### 5. Verify Setup

Once running, you should see:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- API docs (Swagger): `http://localhost:3000/api-docs` (when configured)

## Next Steps

### Explore the Agent System

This project uses a multi-agent development system. Read about it:

```bash
# View the agent system guide
cat docs/agents.md

# View individual agent documentation
cat .claude/agents/rest-api-agent.md
cat .claude/agents/database-agent.md
# ... and others
```

### Understand the Architecture

Review the cursor rules to understand conventions:

```bash
# Global rules
cat .cursorrules

# Backend rules
cat backend/.cursorrules

# Frontend rules
cat frontend/.cursorrules

# Scripts rules
cat scripts/.cursorrules

# Docs rules
cat docs/.cursorrules
```

### Create Your First Feature

Try creating a simple feature following the agent system:

1. **Database Agent**: Create entity and repository
2. **Business Logic Agent**: Create service with business logic
3. **REST API Agent**: Create controller and DTOs
4. **Frontend Agent**: Create components and hooks
5. **Project Manager**: Update documentation

### Seed Test Data

Once you have entities, seed the database:

```bash
bun run db:seed
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # On macOS with Homebrew
   brew services list | grep postgresql

   # Start if not running
   brew services start postgresql@14
   ```

2. Check your credentials in `backend/.env`

3. Verify the database exists:
   ```bash
   psql -l | grep terrace_dev
   ```

### Port Already in Use

If ports 3000 or 5173 are in use:

1. Find and kill the process:
   ```bash
   # For port 3000
   lsof -ti:3000 | xargs kill -9

   # For port 5173
   lsof -ti:5173 | xargs kill -9
   ```

2. Or change the ports in `.env` files

### Module Not Found

If you see module errors:

```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules
bun install
```

### TypeScript Errors

Run type checking:

```bash
bun run typecheck
```

Fix any type errors before running the app.

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes (if using git)
git pull

# 2. Install any new dependencies
bun install

# 3. Run migrations (if any new ones)
cd backend && bun run typeorm migration:run

# 4. Start dev servers
cd .. && bun run dev
```

### Before Committing (Future)

```bash
# Format code
bun run format

# Lint code
bun run lint:fix

# Type check
bun run typecheck

# Run tests
bun run test
```

## Available Scripts

From the project root:

```bash
bun run dev              # Start all dev servers
bun run build            # Build everything
bun run test             # Run all tests
bun run format           # Format all code
bun run lint             # Lint all code
bun run typecheck        # Check all types
bun run db:reset         # Reset database
bun run db:seed          # Seed test data
bun run generate         # Generate code
```

## Getting Help

- Read the [main README](./README.md)
- Review [agent documentation](./docs/agents.md)
- Check [.cursorrules](./.cursorrules) for conventions
- Review existing code for patterns

## What's Next?

Now that you're set up:

1. **Read the architecture**: Understand the node-edge graph model
2. **Review the agents**: Learn how each agent works
3. **Study the conventions**: Read `.cursorrules` files
4. **Start building**: Create your first feature!

Happy coding! 🚀
