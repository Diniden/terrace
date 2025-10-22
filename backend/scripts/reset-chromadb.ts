#!/usr/bin/env bun
/**
 * Reset ChromaDB Script
 *
 * Clears all embeddings from ChromaDB and resets fact embedding status to pending.
 *
 * Usage:
 *   bun run scripts/reset-chromadb.ts              # Prompts for confirmation
 *   bun run scripts/reset-chromadb.ts --confirm    # Skip confirmation prompt
 *   bun run scripts/reset-chromadb.ts --corpus=<id> # Reset only a specific corpus
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

interface ResetOptions {
  confirm?: boolean;
  corpus?: string;
}

async function resetChromaDB(options: ResetOptions) {
  console.log(`${colors.bright}${colors.red}Reset ChromaDB${colors.reset}\n`);

  // Warning
  if (options.corpus) {
    console.log(`${colors.yellow}WARNING: This will delete all embeddings for corpus: ${options.corpus}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}WARNING: This will delete ALL embeddings from ChromaDB${colors.reset}`);
  }
  console.log(`${colors.yellow}and reset fact embedding status to 'pending' in the database.${colors.reset}\n`);

  // Confirmation prompt
  if (!options.confirm) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you sure you want to proceed? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log(`${colors.yellow}Operation cancelled${colors.reset}`);
      process.exit(0);
    }
  }

  console.log('');

  // Check ChromaDB connection
  const chromaHost = process.env.CHROMA_HOST || 'localhost';
  const chromaPort = process.env.CHROMA_PORT || '8000';
  const chromaUrl = `http://${chromaHost}:${chromaPort}`;

  try {
    console.log(`Checking ChromaDB at ${chromaUrl}/api/v1/heartbeat...`);
    await axios.get(`${chromaUrl}/api/v1/heartbeat`);
    console.log(`${colors.green}ChromaDB is running${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}Error: ChromaDB is not running at ${chromaUrl}${colors.reset}`);
    console.error('Please start ChromaDB before running this script.');
    process.exit(1);
  }

  // Initialize database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'terrace',
    password: process.env.DATABASE_PASSWORD || 'terrace_dev_password',
    database: process.env.DATABASE_NAME || 'terrace',
  });

  try {
    await dataSource.initialize();
    console.log(`${colors.green}Connected to database${colors.reset}\n`);

    // Get collection name
    const collectionName = process.env.CHROMA_COLLECTION_NAME || 'facts';

    // Option 1: Delete specific corpus facts
    if (options.corpus) {
      console.log(`${colors.cyan}Fetching facts for corpus: ${options.corpus}${colors.reset}`);

      const facts = await dataSource.query(
        'SELECT id FROM facts WHERE corpus_id = $1',
        [options.corpus]
      );

      if (facts.length === 0) {
        console.log(`${colors.yellow}No facts found for corpus${colors.reset}`);
        return;
      }

      console.log(`Found ${facts.length} facts to delete from ChromaDB\n`);

      // Delete from ChromaDB
      console.log(`${colors.cyan}Deleting embeddings from ChromaDB collection: ${collectionName}${colors.reset}`);
      const factIds = facts.map((f: any) => f.id);

      try {
        await axios.post(`${chromaUrl}/api/v1/collections/${collectionName}/delete`, {
          ids: factIds,
        });
        console.log(`${colors.green}Deleted ${factIds.length} embeddings from ChromaDB${colors.reset}\n`);
      } catch (error) {
        console.error(`${colors.yellow}Warning: Could not delete from ChromaDB (collection may not exist)${colors.reset}\n`);
      }

      // Reset status in database
      console.log(`${colors.cyan}Resetting fact embedding status in database${colors.reset}`);
      const result = await dataSource.query(
        `UPDATE facts
         SET embedding_status = 'pending',
             embedding_error = NULL,
             embedding_attempted_at = NULL
         WHERE corpus_id = $1`,
        [options.corpus]
      );

      console.log(`${colors.green}Reset ${result[1]} facts to pending status${colors.reset}\n`);

    } else {
      // Option 2: Delete entire collection
      console.log(`${colors.cyan}Deleting ChromaDB collection: ${collectionName}${colors.reset}`);

      try {
        await axios.delete(`${chromaUrl}/api/v1/collections/${collectionName}`);
        console.log(`${colors.green}Deleted ChromaDB collection${colors.reset}\n`);
      } catch (error) {
        console.error(`${colors.yellow}Warning: Could not delete collection (may not exist)${colors.reset}\n`);
      }

      // Recreate empty collection
      console.log(`${colors.cyan}Recreating empty collection: ${collectionName}${colors.reset}`);
      try {
        await axios.post(`${chromaUrl}/api/v1/collections`, {
          name: collectionName,
          metadata: { description: 'Fact embeddings for RAG retrieval' },
        });
        console.log(`${colors.green}Created empty collection${colors.reset}\n`);
      } catch (error) {
        console.error(`${colors.yellow}Warning: Could not recreate collection${colors.reset}\n`);
      }

      // Reset all facts in database
      console.log(`${colors.cyan}Resetting all fact embedding statuses in database${colors.reset}`);
      const result = await dataSource.query(
        `UPDATE facts
         SET embedding_status = 'pending',
             embedding_error = NULL,
             embedding_attempted_at = NULL`
      );

      console.log(`${colors.green}Reset ${result[1]} facts to pending status${colors.reset}\n`);
    }

    console.log(`${colors.bright}${colors.green}ChromaDB reset complete${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: ResetOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--confirm') {
    options.confirm = true;
  } else if (arg.startsWith('--corpus=')) {
    options.corpus = arg.split('=')[1];
  }
}

// Run the script
resetChromaDB(options).catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
