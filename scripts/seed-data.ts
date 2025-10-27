#!/usr/bin/env bun
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { resolve } from "path";
import * as bcrypt from "bcrypt";

// Load environment variables from backend
config({ path: resolve(__dirname, "../backend/.env") });

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  username: process.env.DATABASE_USER || "terrace",
  password: process.env.DATABASE_PASSWORD || "terrace_dev_password",
  database: process.env.DATABASE_NAME || "terrace",
});

enum FactContext {
  CORPUS_GLOBAL = "corpus_global",
  CORPUS_BUILDER = "corpus_builder",
  CORPUS_KNOWLEDGE = "corpus_knowledge",
}

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

// Global fact counter and mapping
let globalFactCounter = 0;
const factIdToNumber = new Map<string, number>();

async function ensureDevUserExists(): Promise<void> {
  const devEmail = "dev@geniant.com";
  const devPassword = "dev123";

  // Check if user already exists
  const existingUser = await dataSource.query(
    "SELECT id FROM users WHERE email = $1",
    [devEmail]
  );

  // Silently skip if user exists
  if (existingUser.length > 0) {
    return;
  }

  // Hash password using bcrypt (10 rounds)
  const hashedPassword = await bcrypt.hash(devPassword, 10);

  // Create dev user with USER role (non-admin)
  await dataSource.query(
    `INSERT INTO users (email, password, "applicationRole")
     VALUES ($1, $2, $3)`,
    [devEmail, hashedPassword, "user"]
  );
}

async function seedData() {
  console.log("🌱 Connecting to database...");

  try {
    await dataSource.initialize();
    console.log("✅ Connected to database\n");

    // Reset global counter at start
    globalFactCounter = 0;
    factIdToNumber.clear();

    // Ensure dev user exists
    await ensureDevUserExists();

    // Get all users
    const users = await dataSource.query("SELECT id, email FROM users");

    if (users.length === 0) {
      console.log("⚠️  No users found in database. Please create users first.");
      process.exit(0);
    }

    console.log(`👥 Found ${users.length} user(s)\n`);

    for (const user of users) {
      console.log(`\n📦 Seeding data for user: ${user.email}`);
      const projects = await seedUserProjects(user);
      await seedUserChatMessages(user);
      await seedUserProjectViewSettings(user, projects);
    }

    // Validate context constraints
    console.log("\n🔍 Validating context constraints...");
    await validateContextConstraints();

    console.log("\n\n✨ All data seeded successfully!\n");
    console.log(`📊 Total facts created: ${globalFactCounter}\n`);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

async function seedUserProjects(user: User): Promise<Project[]> {
  const projects: Project[] = [];

  // Project 1: Small (3 corpus, 2 facts each)
  console.log("  📁 Creating small project...");
  const smallProject = await createProject(
    user.id,
    `${user.email.split("@")[0]}'s Small Project`,
    "A compact research project focused on exploring initial concepts and ideas with a small dataset."
  );
  projects.push(smallProject);
  await createCorpusChain(smallProject.id, 3, 2, "    ");

  // Project 2: Medium (8 corpus, 5 facts each)
  console.log("  📁 Creating medium project...");
  const mediumProject = await createProject(
    user.id,
    `${user.email.split("@")[0]}'s Medium Project`,
    "A moderate-sized investigation with multiple corpus entries to track evolving insights and relationships between facts."
  );
  projects.push(mediumProject);
  await createCorpusChain(mediumProject.id, 8, 5, "    ");

  // Project 3: Large (20 corpus, 15 facts each)
  console.log("  📁 Creating large project...");
  const largeProject = await createProject(
    user.id,
    `${user.email.split("@")[0]}'s Large Project`,
    "An extensive research initiative with comprehensive corpus chains for tracking complex fact evolution and detailed knowledge graphs."
  );
  projects.push(largeProject);
  await createCorpusChain(largeProject.id, 20, 15, "    ");

  return projects;
}

async function seedUserChatMessages(user: User) {
  const chatMessages = [
    "How do I create a new project?",
    "What is the difference between a corpus and a project?",
    "Can you explain how fact relationships work?",
    "Show me all the facts in my current corpus",
    "How do I add supporting facts to a statement?",
    "What are the different fact states and what do they mean?",
    "Can you help me understand the basis concept?",
    "How do corpus chains work in this system?",
    "What is the purpose of fact contexts?",
    "Explain the difference between GLOBAL and KNOWLEDGE contexts",
  ];

  console.log("  💬 Creating sample chat messages...");

  // Create 5-10 random chat messages with timestamps spread over the last 7 days
  const messageCount = Math.floor(Math.random() * 6) + 5; // 5-10 messages
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < messageCount; i++) {
    const message = chatMessages[i % chatMessages.length];

    // Generate a timestamp between 7 days ago and now
    const randomTime =
      sevenDaysAgo.getTime() +
      Math.random() * (now.getTime() - sevenDaysAgo.getTime());
    const timestamp = new Date(randomTime);

    await dataSource.query(
      `INSERT INTO chat_messages ("userId", content, "createdAt")
       VALUES ($1, $2, $3)`,
      [user.id, message, timestamp]
    );
  }

  console.log(`    ✓ Created ${messageCount} chat messages`);
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
    [result[0].id, ownerId, "owner"]
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

    console.log(`${indent}📚 Creating "${corpus.name}"...`);

    // Create context-specific facts
    const globalFactIds = await createGlobalFacts(corpus.id, indent + "  ");
    const builderFactIds = await createBuilderFacts(corpus.id, indent + "  ");
    const knowledgeFactIds = await createKnowledgeFacts(
      corpus.id,
      factsPerCorpus,
      indent + "  "
    );

    // Assign basis facts from parent corpus ONLY for KNOWLEDGE facts
    // ALL KNOWLEDGE facts in child corpuses MUST have a basis
    if (corpus.basisCorpusId) {
      if (knowledgeFactIds.length > 0) {
        await assignBasisFacts(
          knowledgeFactIds,
          corpus.basisCorpusId,
          indent + "  "
        );
      }
    } else {
      // Top-level corpus - no basis needed
      console.log(
        `${indent}  ℹ️  Top-level corpus - KNOWLEDGE facts have no basis`
      );
    }

    // Assign sibling facts (2-10 from the same corpus) for KNOWLEDGE facts
    await assignSiblingFacts(knowledgeFactIds);

    const totalFacts =
      globalFactIds.length + builderFactIds.length + knowledgeFactIds.length;
    console.log(
      `${indent}✅ Created "${corpus.name}" with ${totalFacts} total facts\n`
    );

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

async function createGlobalFacts(
  corpusId: string,
  indent: string
): Promise<string[]> {
  const globalStatements = [
    "This corpus focuses on exploring scientific principles and natural phenomena",
    "Core principle: Facts should be verifiable and evidence-based",
    "This knowledge base emphasizes empirical observations and theoretical frameworks",
    "Fundamental approach: Build understanding through interconnected facts",
  ];

  const factIds: string[] = [];
  const count = Math.floor(Math.random() * 2) + 2; // 2-3 global facts

  console.log(
    `${indent}🌍 Creating ${count} CORPUS_GLOBAL facts (basis_id must be null)...`
  );

  for (let i = 0; i < count; i++) {
    globalFactCounter++;
    const factNumber = globalFactCounter;
    const originalStatement = globalStatements[i % globalStatements.length];
    const statement = `Fact: ${factNumber}\n${originalStatement}`;

    const result = await dataSource.query(
      `INSERT INTO facts (corpus_id, statement, context, basis_id, state)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [corpusId, statement, FactContext.CORPUS_GLOBAL, null, "ready"]
    );
    const factId = result[0].id;
    factIds.push(factId);
    factIdToNumber.set(factId, factNumber);
  }

  console.log(`${indent}  ✓ Created ${count} GLOBAL facts`);
  return factIds;
}

async function createBuilderFacts(
  corpusId: string,
  indent: string
): Promise<string[]> {
  const builderStatements = [
    "Auto-generate facts using natural language processing for scientific domains",
    "Follow this guideline: Cross-reference statements with established scientific databases",
    "When creating facts, prioritize peer-reviewed sources and academic publications",
    "Apply validation rule: All measurements must include units and error margins",
    "Use template: [Subject] + [Action/Property] + [Object/Value] for fact generation",
  ];

  const factIds: string[] = [];
  const count = Math.floor(Math.random() * 2) + 2; // 2-3 builder facts

  console.log(
    `${indent}🔧 Creating ${count} CORPUS_BUILDER facts (basis_id must be null)...`
  );

  for (let i = 0; i < count; i++) {
    globalFactCounter++;
    const factNumber = globalFactCounter;
    const originalStatement = builderStatements[i % builderStatements.length];
    const statement = `Fact: ${factNumber}\n${originalStatement}`;

    const result = await dataSource.query(
      `INSERT INTO facts (corpus_id, statement, context, basis_id, state)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [corpusId, statement, FactContext.CORPUS_BUILDER, null, "ready"]
    );
    const factId = result[0].id;
    factIds.push(factId);
    factIdToNumber.set(factId, factNumber);
  }

  console.log(`${indent}  ✓ Created ${count} BUILDER facts`);
  return factIds;
}

async function createKnowledgeFacts(
  corpusId: string,
  count: number,
  indent: string
): Promise<string[]> {
  const knowledgeStatements = [
    "The sky is blue during the day due to Rayleigh scattering",
    "Water boils at 100°C at sea level (1 atm pressure)",
    "The Earth orbits around the Sun in an elliptical path",
    "Photosynthesis requires sunlight, water, and carbon dioxide",
    "Gravity pulls objects toward the Earth at 9.8 m/s²",
    "The speed of light is constant at 299,792,458 m/s in vacuum",
    "Mitochondria are the powerhouse of the cell, producing ATP",
    "DNA contains genetic information encoded in nucleotide sequences",
    "The periodic table organizes elements by atomic number and properties",
    "Atoms are made of protons, neutrons, and electrons",
    "Carbon has four valence electrons enabling complex molecules",
    "Enzymes catalyze biochemical reactions by lowering activation energy",
    "The human body has 206 bones in adults",
    "Blood carries oxygen to cells via hemoglobin in red blood cells",
    "The brain controls the nervous system through neural networks",
    "Muscles contract and relax to create movement via actin-myosin interaction",
    "The heart pumps blood throughout the body at 60-100 beats per minute",
    "Lungs facilitate gas exchange between air and blood",
    "The liver detoxifies harmful substances and metabolizes nutrients",
    "Neurons transmit electrical signals via action potentials",
  ];

  const states = ["clarify", "conflict", "ready", "confirmed", "rejected"];
  const factIds: string[] = [];

  console.log(
    `${indent}📖 Creating ${count} CORPUS_KNOWLEDGE facts (can have basis_id)...`
  );

  for (let i = 0; i < count; i++) {
    globalFactCounter++;
    const factNumber = globalFactCounter;
    const originalStatement =
      knowledgeStatements[i % knowledgeStatements.length];
    const statement = `Fact: ${factNumber}\n${originalStatement}`;
    const state = states[i % states.length];

    const result = await dataSource.query(
      `INSERT INTO facts (corpus_id, statement, context, state)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [corpusId, statement, FactContext.CORPUS_KNOWLEDGE, state]
    );
    const factId = result[0].id;
    factIds.push(factId);
    factIdToNumber.set(factId, factNumber);
  }

  console.log(`${indent}  ✓ Created ${count} KNOWLEDGE facts`);
  return factIds;
}

async function assignBasisFacts(
  factIds: string[],
  parentCorpusId: string,
  indent: string
): Promise<void> {
  // Get ONLY CORPUS_KNOWLEDGE facts from the parent corpus
  const parentFacts = await dataSource.query(
    `SELECT id FROM facts WHERE corpus_id = $1 AND context = $2`,
    [parentCorpusId, FactContext.CORPUS_KNOWLEDGE]
  );

  if (parentFacts.length === 0) {
    console.error(
      `${indent}❌ ERROR: No KNOWLEDGE facts in parent corpus to assign as basis`
    );
    throw new Error(
      `Cannot create child corpus facts: parent corpus has no KNOWLEDGE facts to use as basis`
    );
  }

  console.log(
    `${indent}🔗 Assigning basis facts from parent corpus (${parentFacts.length} available)...`
  );

  let assignedCount = 0;

  // Assign a random basis fact from parent corpus KNOWLEDGE facts to EACH fact
  for (const factId of factIds) {
    const randomBasisFact =
      parentFacts[Math.floor(Math.random() * parentFacts.length)];

    const basisFactNumber = factIdToNumber.get(randomBasisFact.id);

    if (basisFactNumber === undefined) {
      console.error(
        `${indent}❌ ERROR: Basis fact ${randomBasisFact.id} not found in fact number mapping`
      );
      throw new Error(`Cannot find fact number for basis fact`);
    }

    // Get current statement and prepend basis information
    const currentFact = await dataSource.query(
      `SELECT statement FROM facts WHERE id = $1`,
      [factId]
    );

    const currentStatement = currentFact[0].statement;
    // Insert "Basis: X\n" after the "Fact: X\n" line
    const factLineEnd = currentStatement.indexOf("\n");
    const updatedStatement =
      currentStatement.substring(0, factLineEnd + 1) +
      `Basis: ${basisFactNumber}\n` +
      currentStatement.substring(factLineEnd + 1);

    await dataSource.query(
      `UPDATE facts SET basis_id = $1, statement = $2 WHERE id = $3`,
      [randomBasisFact.id, updatedStatement, factId]
    );
    assignedCount++;
  }

  console.log(
    `${indent}  ✓ Assigned basis to ALL ${assignedCount}/${factIds.length} KNOWLEDGE facts`
  );

  // Verify all facts have basis assigned
  const factsWithoutBasis = await dataSource.query(
    `SELECT id FROM facts WHERE id = ANY($1) AND basis_id IS NULL`,
    [factIds]
  );

  if (factsWithoutBasis.length > 0) {
    console.error(
      `${indent}❌ ERROR: ${factsWithoutBasis.length} facts still missing basis!`
    );
    throw new Error(`Failed to assign basis to all facts in child corpus`);
  }
}

async function assignSiblingFacts(factIds: string[]): Promise<void> {
  if (factIds.length < 2) {
    return; // Need at least 2 facts to create siblings
  }

  // Track which pairs have already been created to avoid duplicates
  const createdPairs = new Set<string>();

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

    // Create bidirectional fact_links relationships
    // Note: fact_id_a and fact_id_b are neutral positions - no directionality
    for (const siblingId of selectedSiblings) {
      // Create a normalized pair key (alphabetically ordered) to prevent duplicates
      const pairKey = [factId, siblingId].sort().join('|');

      // Only insert if we haven't already created this pair
      if (!createdPairs.has(pairKey)) {
        await dataSource.query(
          `INSERT INTO fact_links (fact_id_a, fact_id_b) VALUES ($1, $2)`,
          [factId, siblingId]
        );
        createdPairs.add(pairKey);
      }
    }
  }
}

async function seedUserProjectViewSettings(
  user: User,
  projects: Project[]
): Promise<void> {
  console.log("  ⚙️  Creating sample ProjectViewSettings...");

  // Seed settings for 2 out of 3 projects to create variety
  const projectsToSeed = projects.slice(0, 2);

  for (const project of projectsToSeed) {
    // Get corpuses for this project
    const corpuses = await dataSource.query(
      `SELECT id, name FROM corpuses WHERE project_id = $1 ORDER BY "createdAt"`,
      [project.id]
    );

    if (corpuses.length === 0) {
      continue;
    }

    // Get some facts from the first corpus for expanded stacks
    const firstCorpusFacts = await dataSource.query(
      `SELECT id FROM facts WHERE corpus_id = $1 LIMIT 5`,
      [corpuses[0].id]
    );

    // Build settings JSON with variety of configurations
    const corpusSettings: Record<string, any> = {};

    // Configure settings for first 2-3 corpuses (not all)
    const corpusesToConfigure = corpuses.slice(0, Math.min(3, corpuses.length));

    for (let i = 0; i < corpusesToConfigure.length; i++) {
      const corpus = corpusesToConfigure[i];
      const isFirstCorpus = i === 0;

      corpusSettings[corpus.id] = {
        scrollPosition: 0,
        columnWidth: 1,
        stackView: isFirstCorpus ? true : false,
        expandedStacks:
          isFirstCorpus && firstCorpusFacts.length > 0
            ? [firstCorpusFacts[0].id, firstCorpusFacts[1]?.id].filter(Boolean)
            : [],
      };
    }

    const settings = {
      corpuses: corpusSettings,
    };

    // Insert ProjectViewSettings
    await dataSource.query(
      `INSERT INTO project_view_settings (user_id, project_id, settings)
       VALUES ($1, $2, $3)`,
      [user.id, project.id, JSON.stringify(settings)]
    );

    console.log(
      `    ✓ Created view settings for "${project.name}" (${Object.keys(corpusSettings).length} corpus configs)`
    );
  }

  console.log(
    `  ✅ Created view settings for ${projectsToSeed.length}/${projects.length} projects`
  );
}

async function validateContextConstraints(): Promise<void> {
  // Check for GLOBAL facts with basis_id
  const invalidGlobalFacts = await dataSource.query(
    `SELECT id, statement FROM facts
     WHERE context = $1 AND basis_id IS NOT NULL`,
    [FactContext.CORPUS_GLOBAL]
  );

  if (invalidGlobalFacts.length > 0) {
    console.error(
      "  ❌ ERROR: Found CORPUS_GLOBAL facts with basis_id (must be null):"
    );
    invalidGlobalFacts.forEach((fact: any) => {
      console.error(`    - ${fact.id}: ${fact.statement.substring(0, 60)}...`);
    });
    throw new Error(
      "Context constraint violation: GLOBAL facts cannot have basis_id"
    );
  }

  // Check for BUILDER facts with basis_id
  const invalidBuilderFacts = await dataSource.query(
    `SELECT id, statement FROM facts
     WHERE context = $1 AND basis_id IS NOT NULL`,
    [FactContext.CORPUS_BUILDER]
  );

  if (invalidBuilderFacts.length > 0) {
    console.error(
      "  ❌ ERROR: Found CORPUS_BUILDER facts with basis_id (must be null):"
    );
    invalidBuilderFacts.forEach((fact: any) => {
      console.error(`    - ${fact.id}: ${fact.statement.substring(0, 60)}...`);
    });
    throw new Error(
      "Context constraint violation: BUILDER facts cannot have basis_id"
    );
  }

  // Check for KNOWLEDGE facts with basis pointing to non-KNOWLEDGE facts
  const invalidKnowledgeBasis = await dataSource.query(
    `SELECT f.id, f.statement, b.context as basis_context
     FROM facts f
     JOIN facts b ON f.basis_id = b.id
     WHERE f.context = $1 AND b.context != $1`,
    [FactContext.CORPUS_KNOWLEDGE]
  );

  if (invalidKnowledgeBasis.length > 0) {
    console.error(
      "  ❌ ERROR: Found CORPUS_KNOWLEDGE facts with non-KNOWLEDGE basis:"
    );
    invalidKnowledgeBasis.forEach((fact: any) => {
      console.error(
        `    - ${fact.id}: basis has context ${fact.basis_context}`
      );
    });
    throw new Error(
      "Context constraint violation: KNOWLEDGE facts must reference KNOWLEDGE basis"
    );
  }

  // Check that ALL KNOWLEDGE facts in child corpuses have a basis
  const knowledgeFactsWithoutBasisInChildCorpuses = await dataSource.query(
    `SELECT f.id, f.statement, c.name as corpus_name
     FROM facts f
     JOIN corpuses c ON f.corpus_id = c.id
     WHERE f.context = $1
       AND f.basis_id IS NULL
       AND c.basis_corpus_id IS NOT NULL`,
    [FactContext.CORPUS_KNOWLEDGE]
  );

  if (knowledgeFactsWithoutBasisInChildCorpuses.length > 0) {
    console.error(
      "  ❌ ERROR: Found CORPUS_KNOWLEDGE facts in child corpuses without basis:"
    );
    knowledgeFactsWithoutBasisInChildCorpuses.forEach((fact: any) => {
      console.error(
        `    - ${fact.id} in "${fact.corpus_name}": ${fact.statement.substring(0, 60)}...`
      );
    });
    throw new Error(
      "Constraint violation: KNOWLEDGE facts in child corpuses must have basis from parent corpus"
    );
  }

  // Show statistics
  const stats = await dataSource.query(
    `SELECT
       context,
       COUNT(*) as count,
       COUNT(basis_id) as with_basis,
       COUNT(*) - COUNT(basis_id) as without_basis
     FROM facts
     GROUP BY context
     ORDER BY context`
  );

  console.log("  ✅ All context constraints validated successfully!\n");
  console.log("  📊 Fact Statistics by Context:");
  stats.forEach((stat: any) => {
    const contextName = stat.context.replace("corpus_", "").toUpperCase();
    console.log(
      `    ${contextName}: ${stat.count} total (${stat.with_basis} with basis, ${stat.without_basis} without)`
    );
  });
}

seedData();
