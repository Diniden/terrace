#!/usr/bin/env bun
/**
 * Database Reset Script
 *
 * This script performs a complete database reset by:
 * 1. Dropping the entire PostgreSQL database (all schema and data)
 * 2. Recreating the database from scratch
 * 3. Running all TypeORM migrations
 *
 * Usage:
 *   bun run db:reset              # Run with default settings
 *   bun scripts/db-reset.ts       # Direct execution
 *   npm run db:reset              # Via npm
 *
 * Requirements:
 *   - PostgreSQL must be running in Docker (docker-compose up -d postgres)
 *   - Database credentials in backend/.env or environment variables
 *
 * Safety:
 *   - Script will verify PostgreSQL connectivity before proceeding
 *   - Gracefully handles case where database doesn't exist
 *   - All steps have clear error reporting
 *
 * Environment Variables (from backend/.env):
 *   DATABASE_HOST     - PostgreSQL host (default: localhost)
 *   DATABASE_PORT     - PostgreSQL port (default: 5432)
 *   DATABASE_USER     - Database user (default: terrace)
 *   DATABASE_PASSWORD - Database password (default: terrace_dev_password)
 *   DATABASE_NAME     - Database name (default: terrace)
 */

import { $ } from "bun";
import { resolve } from "path";

interface DbConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

async function loadEnvConfig(): Promise<DbConfig> {
  // Default values from .env.example or environment variables
  const config: DbConfig = {
    host: process.env.DATABASE_HOST || "localhost",
    port: process.env.DATABASE_PORT || "5432",
    user: process.env.DATABASE_USER || "terrace",
    password: process.env.DATABASE_PASSWORD || "terrace_dev_password",
    database: process.env.DATABASE_NAME || "terrace",
  };

  return config;
}

async function checkPostgresConnection(config: DbConfig): Promise<boolean> {
  try {
    const pgIsReady =
      await $`docker-compose exec -T postgres pg_isready -U ${config.user}`;
    return pgIsReady.exitCode === 0;
  } catch {
    return false;
  }
}

async function dropDatabase(config: DbConfig): Promise<void> {
  console.log("1️⃣  Dropping database completely...");

  try {
    // First, terminate all connections to the database
    const terminateCmd = `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${config.database}'
      AND pid <> pg_backend_pid();
    `;

    await $`docker-compose exec -T postgres psql -U ${config.user} -d postgres -c ${terminateCmd}`;

    // Now drop the database
    const dropCmd = `DROP DATABASE IF EXISTS ${config.database};`;

    await $`docker-compose exec -T postgres psql -U ${config.user} -d postgres -c ${dropCmd}`;

    console.log(`   ✓ Database '${config.database}' dropped\n`);
  } catch (error) {
    console.error("   ⚠️  Warning: Could not drop database");
    console.error(`   Error: ${error}\n`);
    // Don't exit - database might not exist yet
  }
}

async function createDatabase(config: DbConfig): Promise<void> {
  console.log("2️⃣  Creating fresh database...");

  try {
    const createCmd = `CREATE DATABASE ${config.database} WITH OWNER ${config.user} ENCODING 'UTF8';`;

    await $`docker-compose exec -T postgres psql -U ${config.user} -d postgres -c ${createCmd}`;

    console.log(`   ✓ Database '${config.database}' created\n`);
  } catch (error) {
    console.error("   ❌ Failed to create database");
    console.error(`   Error: ${error}`);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  console.log("3️⃣  Running all migrations...");

  const backendDir = resolve(__dirname, "../backend");

  try {
    await $`bun run migration:run`.cwd(backendDir);
    console.log("   ✓ All migrations completed successfully\n");
  } catch (error) {
    console.error("   ❌ Migration failed");
    console.error(`   Error: ${error}`);
    throw error;
  }
}

async function resetDatabase() {
  console.log("🔄 Complete Database Reset\n");
  console.log("This will:");
  console.log("  - Drop the entire database and all schema");
  console.log("  - Recreate the database from scratch");
  console.log("  - Run all migrations\n");

  const config = await loadEnvConfig();

  // Verify PostgreSQL is running
  console.log("Checking PostgreSQL connection...");
  const isConnected = await checkPostgresConnection(config);

  if (!isConnected) {
    console.error(
      "❌ PostgreSQL is not running or not accessible via Docker."
    );
    console.error(
      "   Please run: docker-compose up -d postgres"
    );
    process.exit(1);
  }

  console.log("✓ PostgreSQL is accessible\n");

  // Step 1: Drop the database completely
  await dropDatabase(config);

  // Step 2: Create a fresh database
  await createDatabase(config);

  // Step 3: Run all migrations
  await runMigrations();

  console.log("✅ Database reset complete!");
  console.log(`   Database '${config.database}' has been recreated from scratch.`);
  console.log("   All schema has been removed and migrations have been applied.\n");
}

// Main execution
resetDatabase().catch((error) => {
  console.error("\n❌ Error resetting database:", error);
  process.exit(1);
});
