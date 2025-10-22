#!/usr/bin/env bun
/**
 * Check Embedding Status Script
 *
 * Shows embedding coverage and statistics for facts in the database.
 *
 * Usage:
 *   bun run scripts/check-embedding-status.ts
 *   bun run scripts/check-embedding-status.ts --detailed
 *   bun run scripts/check-embedding-status.ts --corpus=<corpus-id>
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

interface EmbeddingStats {
  totalFacts: number;
  embedded: number;
  pending: number;
  failed: number;
  percentage: number;
}

interface CorpusStats extends EmbeddingStats {
  corpusId: string;
  corpusName: string;
}

interface FailedEmbedding {
  factId: string;
  statement: string;
  error: string;
  attemptedAt: Date;
}

async function checkEmbeddingStatus(options: { detailed?: boolean; corpus?: string }) {
  console.log(`${colors.bright}${colors.blue}Checking Embedding Status${colors.reset}\n`);

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

    // Get overall statistics
    const overallStats = await getOverallStats(dataSource, options.corpus);
    displayOverallStats(overallStats);

    // Get stats by corpus
    console.log(`\n${colors.bright}Breakdown by Corpus:${colors.reset}`);
    const corpusStats = await getCorpusStats(dataSource, options.corpus);
    displayCorpusStats(corpusStats);

    // Show failed embeddings if detailed flag is set
    if (options.detailed) {
      console.log(`\n${colors.bright}Failed Embeddings:${colors.reset}`);
      const failedEmbeddings = await getFailedEmbeddings(dataSource, options.corpus);
      displayFailedEmbeddings(failedEmbeddings);
    }

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

async function getOverallStats(
  dataSource: DataSource,
  corpusFilter?: string
): Promise<EmbeddingStats> {
  const whereClause = corpusFilter ? `WHERE f.corpus_id = '${corpusFilter}'` : '';

  const result = await dataSource.query(`
    SELECT
      COUNT(*) as total_facts,
      COUNT(CASE WHEN f.embedding_status = 'embedded' THEN 1 END) as embedded,
      COUNT(CASE WHEN f.embedding_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN f.embedding_status = 'failed' THEN 1 END) as failed
    FROM facts f
    ${whereClause}
  `);

  const row = result[0];
  const total = parseInt(row.total_facts);
  const embedded = parseInt(row.embedded);

  return {
    totalFacts: total,
    embedded: embedded,
    pending: parseInt(row.pending),
    failed: parseInt(row.failed),
    percentage: total > 0 ? Math.round((embedded / total) * 100) : 0,
  };
}

async function getCorpusStats(
  dataSource: DataSource,
  corpusFilter?: string
): Promise<CorpusStats[]> {
  const whereClause = corpusFilter ? `WHERE c.id = '${corpusFilter}'` : '';

  const results = await dataSource.query(`
    SELECT
      c.id as corpus_id,
      c.name as corpus_name,
      COUNT(f.id) as total_facts,
      COUNT(CASE WHEN f.embedding_status = 'embedded' THEN 1 END) as embedded,
      COUNT(CASE WHEN f.embedding_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN f.embedding_status = 'failed' THEN 1 END) as failed
    FROM corpuses c
    LEFT JOIN facts f ON f.corpus_id = c.id
    ${whereClause}
    GROUP BY c.id, c.name
    ORDER BY c.name
  `);

  return results.map((row: any) => {
    const total = parseInt(row.total_facts);
    const embedded = parseInt(row.embedded);

    return {
      corpusId: row.corpus_id,
      corpusName: row.corpus_name,
      totalFacts: total,
      embedded: embedded,
      pending: parseInt(row.pending),
      failed: parseInt(row.failed),
      percentage: total > 0 ? Math.round((embedded / total) * 100) : 0,
    };
  });
}

async function getFailedEmbeddings(
  dataSource: DataSource,
  corpusFilter?: string
): Promise<FailedEmbedding[]> {
  const whereClause = corpusFilter
    ? `WHERE f.embedding_status = 'failed' AND f.corpus_id = '${corpusFilter}'`
    : `WHERE f.embedding_status = 'failed'`;

  const results = await dataSource.query(`
    SELECT
      f.id as fact_id,
      f.statement,
      f.embedding_error as error,
      f.embedding_attempted_at as attempted_at
    FROM facts f
    ${whereClause}
    ORDER BY f.embedding_attempted_at DESC
    LIMIT 20
  `);

  return results.map((row: any) => ({
    factId: row.fact_id,
    statement: row.statement,
    error: row.error || 'Unknown error',
    attemptedAt: row.attempted_at,
  }));
}

function displayOverallStats(stats: EmbeddingStats) {
  console.log(`${colors.bright}Overall Statistics:${colors.reset}`);
  console.log(`  Total Facts:     ${colors.cyan}${stats.totalFacts}${colors.reset}`);
  console.log(`  Embedded:        ${colors.green}${stats.embedded}${colors.reset}`);
  console.log(`  Pending:         ${colors.yellow}${stats.pending}${colors.reset}`);
  console.log(`  Failed:          ${colors.red}${stats.failed}${colors.reset}`);
  console.log(`  Completion:      ${getProgressBar(stats.percentage)} ${colors.bright}${stats.percentage}%${colors.reset}`);
}

function displayCorpusStats(corpusStats: CorpusStats[]) {
  if (corpusStats.length === 0) {
    console.log(`  ${colors.yellow}No corpuses found${colors.reset}`);
    return;
  }

  for (const corpus of corpusStats) {
    console.log(`\n  ${colors.bright}${corpus.corpusName}${colors.reset} (${corpus.corpusId})`);
    console.log(`    Facts: ${corpus.totalFacts} | Embedded: ${colors.green}${corpus.embedded}${colors.reset} | Pending: ${colors.yellow}${corpus.pending}${colors.reset} | Failed: ${colors.red}${corpus.failed}${colors.reset}`);
    console.log(`    ${getProgressBar(corpus.percentage)} ${corpus.percentage}%`);
  }
}

function displayFailedEmbeddings(failedEmbeddings: FailedEmbedding[]) {
  if (failedEmbeddings.length === 0) {
    console.log(`  ${colors.green}No failed embeddings${colors.reset}`);
    return;
  }

  for (const failed of failedEmbeddings) {
    console.log(`\n  ${colors.red}Fact ID:${colors.reset} ${failed.factId}`);
    console.log(`  ${colors.yellow}Statement:${colors.reset} ${failed.statement.substring(0, 80)}...`);
    console.log(`  ${colors.red}Error:${colors.reset} ${failed.error}`);
    console.log(`  ${colors.cyan}Attempted:${colors.reset} ${failed.attemptedAt}`);
  }

  if (failedEmbeddings.length === 20) {
    console.log(`\n  ${colors.yellow}Showing first 20 failed embeddings${colors.reset}`);
  }
}

function getProgressBar(percentage: number): string {
  const barLength = 20;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;

  const greenBar = colors.green + '█'.repeat(filled) + colors.reset;
  const emptyBar = colors.yellow + '░'.repeat(empty) + colors.reset;

  return `[${greenBar}${emptyBar}]`;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: { detailed?: boolean; corpus?: string } = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--detailed' || arg === '-d') {
    options.detailed = true;
  } else if (arg.startsWith('--corpus=')) {
    options.corpus = arg.split('=')[1];
  }
}

// Run the script
checkEmbeddingStatus(options).catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
