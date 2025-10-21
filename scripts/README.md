# Scripts Directory

This directory contains automation scripts and utilities for the Terrace project.

## Interactive Script Runner

### Usage

Run the interactive script runner with:

```bash
bun run run
```

or directly:

```bash
./scripts/run-script.ts
```

This will launch an interactive terminal UI that displays all available npm scripts and custom TypeScript scripts organized by category. You can:

- Browse scripts by category (Development, Build, Testing, Database, Docker, etc.)
- See detailed descriptions for each script
- Run any script with a single selection
- View success/error status after execution (green for success, red for errors)
- Run multiple scripts in sequence
- Exit when done

### Features

- **Interactive Terminal UI**: Built with @clack/prompts for a beautiful CLI experience
- **Categorized Scripts**: Scripts are organized by category for easy navigation
- **Colored Output**: Uses picocolors for colored success/error messages
- **Error Handling**: Proper exit code handling and error reporting
- **Loop Support**: After running a script, you can choose to run another or exit

## Configuration

Script metadata is defined in `scripts/scripts-config.json`:

```json
{
  "scripts": {
    "dev": {
      "description": "Start all development servers using mprocs",
      "category": "Development"
    }
  },
  "customScripts": {
    "seed-data.ts": {
      "description": "Seed test data for all users",
      "category": "Database"
    }
  }
}
```

### Adding New Scripts

1. **NPM Scripts**: Add to `package.json` scripts section
2. **Custom Scripts**: Create a `.ts` file in the `scripts/` directory
3. **Metadata**: Add description and category to `scripts-config.json`

## Available Scripts

### Development
- `run` - Interactive terminal UI to select and run scripts
- `dev` - Start all development servers using mprocs (backend, frontend, storybook)
- `dev:legacy` - Start development servers using legacy dev.ts script

### Build
- `build` - Build both backend and frontend for production
- `build:backend` - Build only the backend application
- `build:frontend` - Build only the frontend application
- `build:clean` - Clean build directories and rebuild everything

### Testing
- `test` - Run all tests (backend and frontend)
- `test:backend` - Run backend unit tests
- `test:frontend` - Run frontend unit tests
- `test:e2e` - Run end-to-end tests with Playwright
- `test:e2e:ui` - Run end-to-end tests with Playwright UI mode
- `test:e2e:debug` - Run end-to-end tests in debug mode

### Database
- `db:reset` - Drop, recreate, and migrate database schema
- `db:seed` - Seed database with sample data
- `db:clear` - Clear all data from database tables (keeps schema)
- `db:seed-test` - Seed database with test data (projects, corpus, facts)

### Docker
- `docker:start` - Start PostgreSQL database with Docker Compose
- `docker:stop` - Stop PostgreSQL database containers
- `docker:restart` - Restart PostgreSQL database containers
- `docker:down` - Stop and remove database containers and volumes
- `docker:logs` - View PostgreSQL container logs
- `docker:psql` - Connect to PostgreSQL database with psql client
- `docker:reset` - Reset database by stopping, removing, and restarting containers
- `docker:status` - Check status of Docker containers

### Code Quality
- `format` - Format all code files with Prettier
- `format:check` - Check if all files are formatted correctly
- `lint` - Lint TypeScript files with ESLint
- `lint:fix` - Lint and automatically fix issues
- `typecheck` - Type check both backend and frontend TypeScript
- `typecheck:backend` - Type check backend TypeScript files
- `typecheck:frontend` - Type check frontend TypeScript files

### Code Generation
- `generate` - Generate code scaffolding (entity, service, controller, component)

## Custom Scripts

### Database Scripts

#### seed-data.ts
Seeds the database with test data for all users. Creates three projects per user:
- Small project: 3 corpus with 2 facts each
- Medium project: 8 corpus with 5 facts each
- Large project: 20 corpus with 15 facts each

Each corpus is linked to the previous one in a chain (basis_corpus_id).

Usage:
```bash
bun run db:seed-test
```

#### clear-data.ts
Clears all data from database tables while preserving the schema. Deletes in order:
1. Fact supports
2. Facts
3. Corpuses
4. Project members
5. Projects

Usage:
```bash
bun run db:clear
```

## Dependencies

The script runner uses the following dependencies (all pinned to exact versions):

- `@clack/prompts@0.11.0` - Beautiful CLI prompts
- `picocolors@1.1.1` - Terminal color formatting
- `dotenv@17.2.3` - Environment variable management
- `typeorm@0.3.27` - Database ORM for scripts

## Integration with mprocs

While the script runner is not meant to be run within mprocs (it's interactive), you can add it to mprocs.yaml if needed:

```yaml
procs:
  script-runner:
    shell: "bun run scripts/run-script.ts"
    env:
      NODE_ENV: development
```

However, it's recommended to run it separately in its own terminal since it's designed for interactive use.

## Best Practices

1. **Script Naming**: Use descriptive kebab-case names for custom scripts
2. **Shebang**: Always include `#!/usr/bin/env bun` at the top of custom scripts
3. **Executable**: Make scripts executable with `chmod +x scripts/your-script.ts`
4. **Error Handling**: Always handle errors and exit with proper exit codes
5. **Output**: Use console.log with emojis and colors for clear status updates
6. **Documentation**: Add descriptions to scripts-config.json for all scripts

## TypeScript Configuration

Custom scripts should use TypeScript for type safety. They have access to:
- Bun runtime APIs
- Node.js APIs
- All installed dependencies
- Project environment variables
