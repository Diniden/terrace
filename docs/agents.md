# Agent System Guide

## Overview

The Terrace project uses a multi-agent development system where specialized Claude agents handle different aspects of development. Each agent is an expert in their domain with specific responsibilities and conventions.

## Philosophy

The agent system is designed to:
- **Separate concerns**: Each agent focuses on their domain expertise
- **Maintain quality**: Agents follow strict conventions and best practices
- **Stay synchronized**: All agents keep documentation and rules up to date
- **Work together**: Agents coordinate across domains when needed
- **Ensure safety**: Agents can only modify project files, not external systems

## Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Global Rules                         │
│                  (.cursorrules)                         │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   REST API    │   │   Database    │   │   Frontend    │
│     Agent     │   │     Agent     │   │   Architect   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Business     │   │    DevOps     │   │   Project     │
│    Logic      │   │     Agent     │   │   Manager     │
└───────────────┘   └───────────────┘   └───────────────┘
```

## The Agents

### 1. REST API Agent

**Role**: TypeScript genius specializing in NestJS REST APIs

**Responsibilities**:
- Design and implement RESTful endpoints
- Create DTOs with validation
- Implement guards and middleware
- Add Swagger documentation
- Handle errors consistently

**Domain**:
- `backend/src/**/*.controller.ts`
- `backend/src/**/*.dto.ts`
- `backend/src/**/*.guard.ts`
- `backend/src/**/*.interceptor.ts`
- `backend/src/**/*.filter.ts`

**Key Skills**:
- HTTP semantics and status codes
- Input validation with class-validator
- Authentication and authorization
- Request/response transformation
- API versioning

**Documentation**: [.claude/agents/rest-api-agent.md](../.claude/agents/rest-api-agent.md)

### 2. Database Agent

**Role**: ORM and graph expert specializing in PostgreSQL and TypeORM

**Responsibilities**:
- Design entity models
- Model node-edge graph structures
- Create and manage migrations
- Implement custom repositories
- Optimize database queries

**Domain**:
- `backend/src/**/*.entity.ts`
- `backend/src/database/migrations/*.ts`
- `backend/src/**/*.repository.ts`

**Key Skills**:
- Relational database design
- Graph modeling in relational databases
- PostgreSQL advanced features (CTEs, JSONB, etc.)
- Query optimization
- Migration management

**Documentation**: [.claude/agents/database-agent.md](../.claude/agents/database-agent.md)

### 3. Frontend Architect Agent

**Role**: React and TypeScript expert

**Responsibilities**:
- Build React components
- Implement state management
- Create custom hooks
- Optimize performance
- Ensure accessibility

**Domain**:
- `frontend/src/**/*.tsx`
- `frontend/src/**/*.ts`
- `frontend/src/**/*.css`

**Key Skills**:
- Modern React patterns
- TypeScript advanced types
- Performance optimization
- Accessibility (a11y)
- CSS and styling

**Documentation**: [.claude/agents/frontend-architect-agent.md](../.claude/agents/frontend-architect-agent.md)

### 4. Business Logic Agent

**Role**: Graph operations expert specializing in domain logic

**Responsibilities**:
- Implement business logic in services
- Create graph algorithms
- Handle complex workflows
- Validate business rules
- Manage transactions

**Domain**:
- `backend/src/**/*.service.ts`
- `backend/src/graph/**/*.ts`

**Key Skills**:
- Domain-driven design
- Graph algorithms (BFS, DFS, shortest path, etc.)
- SOLID principles
- Design patterns
- Complex business rules

**Documentation**: [.claude/agents/business-logic-agent.md](../.claude/agents/business-logic-agent.md)

### 5. DevOps Agent

**Role**: Bun scripting expert

**Responsibilities**:
- Write automation scripts
- Create build tools
- Implement development utilities
- Database seeding scripts
- Code generators

**Domain**:
- `scripts/**/*.ts`
- `package.json` scripts
- Build configuration

**Key Skills**:
- Bun runtime and APIs
- TypeScript scripting
- Process management
- File operations
- CLI tools

**Documentation**: [.claude/agents/devops-agent.md](../.claude/agents/devops-agent.md)

### 6. Project Manager Agent

**Role**: Documentation expert

**Responsibilities**:
- Maintain READMEs
- Write documentation
- Keep API docs current
- Update changelogs
- Manage knowledge base

**Domain**:
- `README.md`
- `docs/**/*.md`
- `CHANGELOG.md`
- `.cursorrules`

**Key Skills**:
- Technical writing
- Markdown
- Documentation organization
- API documentation
- Architecture diagrams

**Documentation**: [.claude/agents/project-manager-agent.md](../.claude/agents/project-manager-agent.md)

## How Agents Work Together

### Example: Adding a New Feature

Let's say we want to add a "User Profile" feature. Here's how agents collaborate:

#### 1. Database Agent Creates Entities
```typescript
@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  bio: string;

  // More fields...
}
```

#### 2. Business Logic Agent Creates Service
```typescript
@Injectable()
export class UserProfilesService {
  constructor(
    private readonly userProfilesRepository: Repository<UserProfile>,
  ) {}

  async findByUserId(userId: string): Promise<UserProfile> {
    // Business logic
  }
}
```

#### 3. REST API Agent Creates Controller
```typescript
@Controller('user-profiles')
export class UserProfilesController {
  constructor(private readonly service: UserProfilesService) {}

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    return this.service.findByUserId(userId);
  }
}
```

#### 4. Frontend Architect Creates Component
```typescript
export const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { profile, loading } = useUserProfile(userId);

  if (loading) return <Spinner />;
  return <div>{profile.bio}</div>;
};
```

#### 5. DevOps Agent Creates Test Data Script
```typescript
// scripts/seed-user-profiles.ts
async function seedUserProfiles() {
  // Generate test data
}
```

#### 6. Project Manager Updates Documentation
```markdown
## User Profiles API

### Get User Profile
GET /api/user-profiles/:userId
```

## Cursor Rules System

### Hierarchy

```
.cursorrules                    # Global rules (always apply)
├── backend/.cursorrules        # Backend conventions
├── frontend/.cursorrules       # Frontend conventions
├── scripts/.cursorrules        # Scripts conventions
└── docs/.cursorrules           # Documentation style
```

### Rule Precedence

1. **Global rules** always apply
2. **Local rules** add domain-specific conventions
3. In conflict, **global rules win**

### Keeping Rules Updated

**Critical**: When you change patterns or conventions, update the relevant `.cursorrules` file!

Example: If you introduce a new DTO validation pattern, update `backend/.cursorrules`:

```markdown
## New Pattern: Custom Validators

When validating complex business rules, create custom validators:

\`\`\`typescript
@ValidatorConstraint({ name: 'isValidNodeType', async: false })
export class IsValidNodeType implements ValidatorConstraintInterface {
  validate(type: string) {
    return ['entity', 'relation', 'attribute'].includes(type);
  }
}
\`\`\`
```

## Agent Communication

### Integration Points

Agents communicate through:

1. **Shared conventions** in `.cursorrules`
2. **Type definitions** (interfaces, DTOs)
3. **API contracts** (DTOs match entities)
4. **Documentation** (architecture decisions)

### Cross-Domain Changes

When a change affects multiple agents:

1. **Plan the change** across domains
2. **Update each domain** in logical order
3. **Update documentation**
4. **Update relevant `.cursorrules`**
5. **Test the integration**

## Best Practices

### For All Agents

1. ✅ Read relevant `.cursorrules` before starting
2. ✅ Follow existing patterns in the codebase
3. ✅ Update `.cursorrules` when patterns change
4. ✅ Write tests for new functionality
5. ✅ Update documentation
6. ✅ Use TypeScript strictly (no `any`)
7. ✅ Handle errors gracefully

### Agent-Specific

Each agent has detailed best practices in their documentation file.

## Constraints

### What Agents CAN Do

- ✅ Modify any file within this project
- ✅ Run tests, builds, and local scripts
- ✅ Create, read, update, delete files
- ✅ Run database migrations
- ✅ Install project dependencies

### What Agents CANNOT Do

- ❌ Git push or manage CI/CD
- ❌ Modify files outside the project
- ❌ Install global dependencies
- ❌ Access external systems beyond the database
- ❌ Ignore TypeScript errors

## Working with Agents

### Starting a New Task

1. Identify which agents will be involved
2. Review their domain in `.cursorrules`
3. Check existing code for patterns
4. Plan changes across domains
5. Implement in logical order

### During Development

1. Follow conventions in `.cursorrules`
2. Write type-safe code
3. Add tests as you go
4. Update docs continuously
5. Keep patterns consistent

### Finishing Up

1. Verify all tests pass
2. Update all affected documentation
3. Update `.cursorrules` if needed
4. Review integration points
5. Clean up temporary code

## Troubleshooting

### Pattern Conflicts

If you see inconsistent patterns:
1. Check `.cursorrules` for the intended pattern
2. Update code to match conventions
3. Update `.cursorrules` if pattern is outdated

### Cross-Agent Issues

If changes affect multiple domains:
1. Review integration points
2. Check type compatibility
3. Verify API contracts
4. Test the full flow

### Documentation Out of Date

If documentation is stale:
1. Invoke the Project Manager agent
2. Update affected documentation
3. Verify examples still work
4. Update related docs

## Advanced Topics

### Custom Agents

You can create custom agents by:
1. Creating a new `.md` file in `.claude/agents/`
2. Defining role, domain, and expertise
3. Adding best practices and examples
4. Updating this guide

### Agent Evolution

As the project grows:
1. Patterns will evolve
2. New conventions will emerge
3. Keep `.cursorrules` synchronized
4. Document decisions in docs

## Resources

- [Global Rules](../.cursorrules)
- [Backend Rules](../backend/.cursorrules)
- [Frontend Rules](../frontend/.cursorrules)
- [Scripts Rules](../scripts/.cursorrules)
- [Docs Rules](../docs/.cursorrules)

## Summary

The agent system provides:
- **Expertise**: Each agent is a specialist
- **Consistency**: Conventions are enforced
- **Quality**: Best practices are followed
- **Maintainability**: Documentation stays current
- **Safety**: Changes are scoped to the project

By leveraging specialized agents with clear responsibilities and strict conventions, we maintain a high-quality codebase that scales with complexity.
