# Docker PostgreSQL Setup

This project uses Docker to manage a PostgreSQL database for local development.

## Prerequisites

- Docker Desktop installed and running
- Bun package manager installed

## Quick Start

1. **Start all services (recommended)**
   ```bash
   bun run dev
   ```
   This will start PostgreSQL, backend, and frontend using mprocs.

2. **Or start database only**
   ```bash
   bun run docker:start
   ```

## Database Configuration

The PostgreSQL container is configured with the following defaults:

- **Host**: localhost
- **Port**: 5432
- **Database**: terrace
- **User**: terrace
- **Password**: terrace_dev_password

You can customize these by creating a `.env` file in the root directory:

```bash
cp .env.example .env
# Edit .env with your preferred values
```

## Available Commands

### Docker Management

- `bun run docker:start` - Start PostgreSQL container
- `bun run docker:stop` - Stop PostgreSQL container
- `bun run docker:restart` - Restart PostgreSQL container
- `bun run docker:down` - Stop and remove container
- `bun run docker:logs` - View container logs
- `bun run docker:psql` - Connect to PostgreSQL CLI
- `bun run docker:reset` - Reset database (removes all data)
- `bun run docker:status` - Check container status

### Using mprocs

When you run `bun run dev`, mprocs will manage three processes:

1. **postgres** - PostgreSQL database container
2. **backend** - NestJS API server
3. **frontend** - React development server

Navigate between processes in mprocs using:
- `1`, `2`, `3` - Switch to specific process
- `Ctrl+A` - Show all processes
- `q` - Quit mprocs

## Database Connection

### Backend Connection

The backend connects to PostgreSQL using environment variables. Make sure to create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

The `DATABASE_URL` should be:
```
postgresql://terrace:terrace_dev_password@localhost:5432/terrace
```

### Direct Connection

You can connect directly to the database using:

```bash
# Using the helper script
bun run docker:psql

# Or using psql directly
psql postgresql://terrace:terrace_dev_password@localhost:5432/terrace
```

## Data Persistence

Database data is persisted in a Docker volume named `terrace_postgres_data`. This means your data will survive container restarts.

To completely reset the database:
```bash
bun run docker:reset
```

## Troubleshooting

### Port 5432 already in use

If you have PostgreSQL installed locally and running on port 5432:

1. Stop local PostgreSQL:
   ```bash
   # macOS with Homebrew
   brew services stop postgresql

   # Linux with systemd
   sudo systemctl stop postgresql
   ```

2. Or change the port in `docker-compose.yml`:
   ```yaml
   ports:
     - '5433:5432'  # Use port 5433 instead
   ```

### Container won't start

Check the logs:
```bash
bun run docker:logs
```

Make sure Docker Desktop is running:
```bash
docker ps
```

### Database connection refused

Wait a few seconds after starting the container for PostgreSQL to initialize:
```bash
bun run docker:start
# Wait 5-10 seconds
bun run docker:status
```

## Manual Docker Commands

If you prefer using Docker commands directly:

```bash
# Start
docker-compose up -d postgres

# Stop
docker-compose stop postgres

# View logs
docker-compose logs -f postgres

# Remove everything (including volumes)
docker-compose down -v
```

## Initial Database Setup

The database is automatically initialized with:
- UUID extension for generating unique identifiers
- Empty schema ready for migrations

Your NestJS backend will handle creating tables through TypeORM migrations or entities.
