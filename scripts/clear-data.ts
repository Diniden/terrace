#!/usr/bin/env bun
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from backend
config({ path: resolve(__dirname, '../backend/.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'terrace',
  password: process.env.DATABASE_PASSWORD || 'terrace_dev_password',
  database: process.env.DATABASE_NAME || 'terrace',
});

async function clearData() {
  console.log('🗑️  Connecting to database...');

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    console.log('\n🗑️  Clearing data...\n');

    // Delete in order of dependencies (child tables first)
    const tables = [
      { name: 'fact_support', label: 'Fact supports' },
      { name: 'facts', label: 'Facts' },
      { name: 'corpuses', label: 'Corpuses' },
      { name: 'project_members', label: 'Project members' },
      { name: 'projects', label: 'Projects' },
    ];

    for (const table of tables) {
      const result = await dataSource.query(`DELETE FROM ${table.name}`);
      const count = result[1] || 0;
      console.log(`  ✅ Deleted ${count} ${table.label}`);
    }

    console.log('\n✨ All data cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

clearData();
