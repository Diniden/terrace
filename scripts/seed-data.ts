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

interface User {
  id: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  ownerId: string;
}

interface Corpus {
  id: string;
  name: string;
  projectId: string;
  basisCorpusId: string | null;
}

async function seedData() {
  console.log('🌱 Connecting to database...');

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Get all users
    const users = await dataSource.query('SELECT id, email FROM users');

    if (users.length === 0) {
      console.log('⚠️  No users found in database. Please create users first.');
      process.exit(0);
    }

    console.log(`👥 Found ${users.length} user(s)\n`);

    for (const user of users) {
      console.log(`\n📦 Seeding data for user: ${user.email}`);
      await seedUserProjects(user);
    }

    console.log('\n\n✨ All data seeded successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

async function seedUserProjects(user: User) {
  // Project 1: Small (3 corpus, 2 facts each)
  console.log('  📁 Creating small project...');
  const smallProject = await createProject(
    user.id,
    `${user.email.split('@')[0]}'s Small Project`,
    'A compact research project focused on exploring initial concepts and ideas with a small dataset.'
  );
  await createCorpusChain(smallProject.id, 3, 2, '    ');

  // Project 2: Medium (8 corpus, 5 facts each)
  console.log('  📁 Creating medium project...');
  const mediumProject = await createProject(
    user.id,
    `${user.email.split('@')[0]}'s Medium Project`,
    'A moderate-sized investigation with multiple corpus entries to track evolving insights and relationships between facts.'
  );
  await createCorpusChain(mediumProject.id, 8, 5, '    ');

  // Project 3: Large (20 corpus, 15 facts each)
  console.log('  📁 Creating large project...');
  const largeProject = await createProject(
    user.id,
    `${user.email.split('@')[0]}'s Large Project`,
    'An extensive research initiative with comprehensive corpus chains for tracking complex fact evolution and detailed knowledge graphs.'
  );
  await createCorpusChain(largeProject.id, 20, 15, '    ');
}

async function createProject(
  ownerId: string,
  name: string,
  description: string
): Promise<Project> {
  const result = await dataSource.query(
    `INSERT INTO projects (name, owner_id, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, owner_id as "ownerId"`,
    [name, ownerId, description]
  );

  // Also add owner as member
  await dataSource.query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)`,
    [result[0].id, ownerId, 'owner']
  );

  return result[0];
}

async function createCorpusChain(
  projectId: string,
  corpusCount: number,
  factsPerCorpus: number,
  indent: string
): Promise<void> {
  let previousCorpusId: string | null = null;

  for (let i = 1; i <= corpusCount; i++) {
    const corpus = await createCorpus(
      projectId,
      `Corpus ${i}`,
      previousCorpusId
    );

    const factIds = await createFacts(corpus.id, factsPerCorpus);

    // Assign basis facts from parent corpus if it exists
    if (corpus.basisCorpusId) {
      await assignBasisFacts(factIds, corpus.basisCorpusId);
    }

    // Assign sibling facts (2-10 from the same corpus)
    await assignSiblingFacts(factIds);

    console.log(`${indent}✅ Created "${corpus.name}" with ${factIds.length} facts`);

    previousCorpusId = corpus.id;
  }
}

async function createCorpus(
  projectId: string,
  name: string,
  basisCorpusId: string | null
): Promise<Corpus> {
  const result = await dataSource.query(
    `INSERT INTO corpuses (name, project_id, basis_corpus_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, project_id as "projectId", basis_corpus_id as "basisCorpusId"`,
    [name, projectId, basisCorpusId]
  );

  return result[0];
}

async function createFacts(corpusId: string, count: number): Promise<string[]> {
  const factStatements = [
    'The sky is blue during the day',
    'Water boils at 100°C at sea level',
    'The Earth orbits around the Sun',
    'Photosynthesis requires sunlight',
    'Gravity pulls objects toward the Earth',
    'The speed of light is constant',
    'Mitochondria are the powerhouse of the cell',
    'DNA contains genetic information',
    'The periodic table organizes elements',
    'Atoms are made of protons, neutrons, and electrons',
    'Carbon has four valence electrons',
    'Enzymes catalyze biochemical reactions',
    'The human body has 206 bones',
    'Blood carries oxygen to cells',
    'The brain controls the nervous system',
    'Muscles contract and relax to create movement',
    'The heart pumps blood throughout the body',
    'Lungs facilitate gas exchange',
    'The liver detoxifies harmful substances',
    'Neurons transmit electrical signals',
  ];

  const states = ['clarify', 'conflict', 'ready', 'confirmed', 'rejected'];
  const factIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const statement = factStatements[i % factStatements.length];
    const state = states[i % states.length];

    const result = await dataSource.query(
      `INSERT INTO facts (corpus_id, statement, state) VALUES ($1, $2, $3) RETURNING id`,
      [corpusId, `${statement} (Fact ${i + 1})`, state]
    );
    factIds.push(result[0].id);
  }

  return factIds;
}

async function assignBasisFacts(
  factIds: string[],
  parentCorpusId: string
): Promise<void> {
  // Get all facts from the parent corpus
  const parentFacts = await dataSource.query(
    `SELECT id FROM facts WHERE corpus_id = $1`,
    [parentCorpusId]
  );

  if (parentFacts.length === 0) {
    return; // No parent facts to assign
  }

  // Assign a random basis fact from parent corpus to each fact
  for (const factId of factIds) {
    const randomBasisFact =
      parentFacts[Math.floor(Math.random() * parentFacts.length)];

    await dataSource.query(
      `UPDATE facts SET basis_id = $1 WHERE id = $2`,
      [randomBasisFact.id, factId]
    );
  }
}

async function assignSiblingFacts(factIds: string[]): Promise<void> {
  if (factIds.length < 2) {
    return; // Need at least 2 facts to create siblings
  }

  for (const factId of factIds) {
    // Pick 2-10 random sibling facts (excluding the fact itself)
    const siblingCount = Math.floor(Math.random() * 9) + 2; // 2 to 10
    const otherFactIds = factIds.filter((id) => id !== factId);

    // Shuffle and take the first siblingCount facts
    const shuffled = otherFactIds.sort(() => 0.5 - Math.random());
    const selectedSiblings = shuffled.slice(
      0,
      Math.min(siblingCount, otherFactIds.length)
    );

    // Create fact_support relationships
    for (const siblingId of selectedSiblings) {
      await dataSource.query(
        `INSERT INTO fact_support (fact_id, support_id) VALUES ($1, $2)`,
        [factId, siblingId]
      );
    }
  }
}

seedData();
