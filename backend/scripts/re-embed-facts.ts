#!/usr/bin/env bun
/**
 * Re-embed Facts Script
 *
 * Re-embeds all facts or facts matching specific criteria.
 *
 * Usage:
 *   bun run scripts/re-embed-facts.ts                    # Re-embed all facts
 *   bun run scripts/re-embed-facts.ts --corpus=<id>      # Re-embed facts in a corpus
 *   bun run scripts/re-embed-facts.ts --status=pending   # Re-embed pending facts
 *   bun run scripts/re-embed-facts.ts --status=failed    # Retry failed facts
 *   bun run scripts/re-embed-facts.ts --limit=100        # Limit number of facts
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

interface ReEmbedOptions {
  corpus?: string;
  status?: 'pending' | 'failed' | 'all';
  limit?: number;
  dryRun?: boolean;
}

interface Fact {
  id: string;
  statement: string;
  corpusId: string;
}

async function reEmbedFacts(options: ReEmbedOptions) {
  console.log(`${colors.bright}${colors.blue}Re-embedding Facts${colors.reset}\n`);

  // Validate RAG service is running
  const ragServiceUrl = process.env.RAG_SERVICE_URL || 'http://localhost:8001';

  try {
    console.log(`Checking RAG service at ${ragServiceUrl}/health...`);
    await axios.get(`${ragServiceUrl}/health`);
    console.log(`${colors.green}RAG service is running${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}Error: RAG service is not running at ${ragServiceUrl}${colors.reset}`);
    console.error('Please start the RAG service before running this script.');
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

    // Get facts to re-embed
    const facts = await getFactsToReEmbed(dataSource, options);

    if (facts.length === 0) {
      console.log(`${colors.yellow}No facts found matching criteria${colors.reset}`);
      return;
    }

    console.log(`Found ${colors.cyan}${facts.length}${colors.reset} facts to re-embed\n`);

    if (options.dryRun) {
      console.log(`${colors.yellow}DRY RUN - No embeddings will be created${colors.reset}\n`);
      for (const fact of facts) {
        console.log(`  Would re-embed: ${fact.id} - ${fact.statement.substring(0, 50)}...`);
      }
      return;
    }

    // Re-embed facts
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];
      const progress = `[${i + 1}/${facts.length}]`;

      try {
        console.log(`${colors.cyan}${progress}${colors.reset} Re-embedding fact ${fact.id}...`);

        // Call RAG service to embed
        await axios.post(`${ragServiceUrl}/embed`, {
          fact_id: fact.id,
          statement: fact.statement,
          context_id: fact.corpusId,
        });

        // Update status in database
        await dataSource.query(
          `UPDATE facts
           SET embedding_status = 'embedded',
               embedding_error = NULL,
               embedding_attempted_at = NOW()
           WHERE id = $1`,
          [fact.id]
        );

        console.log(`${colors.green}${progress} Success${colors.reset}`);
        successCount++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`${colors.red}${progress} Failed: ${errorMessage}${colors.reset}`);

        // Update failure status in database
        await dataSource.query(
          `UPDATE facts
           SET embedding_status = 'failed',
               embedding_error = $1,
               embedding_attempted_at = NOW()
           WHERE id = $2`,
          [errorMessage, fact.id]
        );

        failureCount++;
      }

      // Add small delay to avoid overwhelming the service
      if (i < facts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`  Total:    ${facts.length}`);
    console.log(`  Success:  ${colors.green}${successCount}${colors.reset}`);
    console.log(`  Failed:   ${colors.red}${failureCount}${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

async function getFactsToReEmbed(
  dataSource: DataSource,
  options: ReEmbedOptions
): Promise<Fact[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Filter by corpus
  if (options.corpus) {
    conditions.push(`f.corpus_id = $${paramIndex++}`);
    params.push(options.corpus);
  }

  // Filter by status
  if (options.status && options.status !== 'all') {
    conditions.push(`f.embedding_status = $${paramIndex++}`);
    params.push(options.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = options.limit ? `LIMIT ${options.limit}` : '';

  const query = `
    SELECT
      f.id,
      f.statement,
      f.corpus_id as corpus_id
    FROM facts f
    ${whereClause}
    ORDER BY f.created_at ASC
    ${limitClause}
  `;

  const results = await dataSource.query(query, params);

  return results.map((row: any) => ({
    id: row.id,
    statement: row.statement,
    corpusId: row.corpus_id,
  }));
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: ReEmbedOptions = {
  status: 'all',
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith('--corpus=')) {
    options.corpus = arg.split('=')[1];
  } else if (arg.startsWith('--status=')) {
    const status = arg.split('=')[1];
    if (status === 'pending' || status === 'failed' || status === 'all') {
      options.status = status;
    } else {
      console.error(`${colors.red}Invalid status: ${status}${colors.reset}`);
      console.error('Valid statuses: pending, failed, all');
      process.exit(1);
    }
  } else if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
}

// Run the script
reEmbedFacts(options).catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
