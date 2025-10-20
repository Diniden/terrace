# How to Work with the Agent System

This guide explains how to use Claude Code with the multi-agent system in this project.

## Understanding the System

This project has **six specialized agents**, each with expertise in a specific domain. When you request changes, Claude Code will automatically select and embody the appropriate agent(s) based on the files and context involved.

## The Agents at a Glance

| Agent | Focus | Files | Key Skills |
|-------|-------|-------|------------|
| **REST API** | NestJS controllers, DTOs, guards | `backend/src/**/*.controller.ts`, `**/*.dto.ts` | REST APIs, validation, auth |
| **Database** | Entities, migrations, repos | `backend/src/**/*.entity.ts`, `**/migrations/*.ts` | PostgreSQL, TypeORM, graphs |
| **Frontend** | React components, hooks | `frontend/src/**/*.tsx`, `**/*.ts` | React, TypeScript, UX |
| **Business Logic** | Services, graph algorithms | `backend/src/**/*.service.ts`, `graph/**/*.ts` | Domain logic, algorithms |
| **DevOps** | Scripts, automation | `scripts/**/*.ts` | Bun, automation, tooling |
| **Project Manager** | Documentation | `**/*.md`, `.cursorrules` | Technical writing, docs |

## How to Request Work

### Single-Agent Tasks

When your task involves one domain, just ask naturally:

#### Backend API Examples
```
"Create a REST endpoint for creating nodes"
"Add validation to the CreateNodeDto"
"Implement authentication guard for the nodes controller"
```
→ **REST API Agent** will handle this

#### Database Examples
```
"Create an entity for UserProfile with a relationship to Node"
"Add an index to the edges table for faster lookups"
"Write a migration to add a status column to nodes"
```
→ **Database Agent** will handle this

#### Frontend Examples
```
"Create a NodeCard component that displays node information"
"Build a custom hook for fetching and managing nodes"
"Add loading and error states to the Nodes page"
```
→ **Frontend Agent** will handle this

#### Business Logic Examples
```
"Implement a shortest path algorithm between two nodes"
"Add a service method to find all nodes within N hops"
"Implement cycle detection for the graph"
```
→ **Business Logic Agent** will handle this

#### Scripts Examples
```
"Write a script to seed the database with test nodes and edges"
"Create a build script that compiles both backend and frontend"
"Add a script to generate entity boilerplate"
```
→ **DevOps Agent** will handle this

#### Documentation Examples
```
"Update the README with the new graph API endpoints"
"Document the shortest path algorithm in docs/"
"Add examples to the API documentation"
```
→ **Project Manager Agent** will handle this

### Multi-Agent Tasks

For features spanning multiple domains, ask naturally. Claude will coordinate:

#### Full Feature Example
```
"Add a UserProfile feature with CRUD operations"
```

Claude will automatically:
1. **Database Agent**: Create `UserProfile` entity and migration
2. **Business Logic Agent**: Create `UserProfilesService` with logic
3. **REST API Agent**: Create controller and DTOs
4. **Frontend Agent**: Create profile components
5. **Project Manager**: Update documentation

#### Graph Feature Example
```
"Add the ability to find the shortest path between two nodes and display it in the UI"
```

Claude will automatically:
1. **Business Logic Agent**: Implement shortest path algorithm
2. **REST API Agent**: Create API endpoint
3. **Frontend Agent**: Create UI component to display path
4. **Project Manager**: Document the feature

## Effective Communication

### Be Specific About Scope

Good:
```
"Create a Node entity with name, type, and metadata fields"
"Implement BFS traversal in GraphService"
"Add a NodeList component that displays nodes in a table"
```

Less Effective:
```
"Add nodes"  # Too vague
"Make it better"  # Unclear what to improve
"Fix the thing"  # No context
```

### Mention Related Context

```
"Add an edge weight filter to the existing findShortestPath method"
"Update the NodeCard component to show the new status field"
"Create a migration to add the new fields we discussed"
```

### Ask for Explanations

```
"Explain how the graph traversal algorithm works"
"What's the best way to model a many-to-many relationship for nodes?"
"Why did you use a recursive CTE here?"
```

## Agent Coordination

Agents automatically coordinate through:

1. **Shared Types**: DTOs match entities, components use API types
2. **Conventions**: Following `.cursorrules` ensures compatibility
3. **Documentation**: Each change updates relevant docs

### You Don't Need to Specify Agents

❌ Don't say: "Use the Database Agent to create an entity"
✅ Just say: "Create a UserProfile entity"

Claude will automatically invoke the right agent(s).

## Checking Agent Work

### Verify Conventions Were Followed

After an agent makes changes:

1. Check if `.cursorrules` was updated (if patterns changed)
2. Verify tests were added (for business logic)
3. Ensure documentation was updated (for APIs)
4. Check type safety (no `any` types)

### Example Review Checklist

After adding a new API endpoint:
- [ ] Entity exists and has proper indexes
- [ ] Service has business logic (not in controller)
- [ ] Controller is thin and uses proper DTOs
- [ ] DTOs have validation decorators
- [ ] Swagger documentation is present
- [ ] Tests are written
- [ ] API docs are updated
- [ ] `.cursorrules` reflects any new patterns

## Common Workflows

### Adding a New Resource

```
"Add a Comment resource that can be attached to nodes"
```

Agents will handle:
1. Database: Entity, repository, migration
2. Business Logic: Service with CRUD operations
3. REST API: Controller and DTOs
4. Frontend: Components and hooks
5. DevOps: Update seed script
6. Documentation: Update API docs

### Implementing a Graph Feature

```
"Add functionality to find all nodes of type X within 3 hops of a given node"
```

Agents will handle:
1. Business Logic: Algorithm implementation
2. Database: Optimized query/repository method
3. REST API: Endpoint to expose functionality
4. Frontend: UI to trigger and display results
5. Documentation: Algorithm explanation

### Refactoring

```
"Refactor the node services to use a repository pattern"
```

Agents will handle:
1. Database: Create custom repository
2. Business Logic: Update service to use repository
3. Documentation: Update architecture docs
4. Project Manager: Update relevant `.cursorrules`

## Understanding `.cursorrules`

Each directory has a `.cursorrules` file that defines conventions for that domain.

### When Agents Update Rules

Agents will update `.cursorrules` when:
- New patterns are introduced
- Conventions change
- Best practices evolve

### When You Should Check Rules

Before making changes:
```
"What are the current conventions for creating DTOs?"
```

After seeing unfamiliar patterns:
```
"Why is the entity structured this way?"
```

## Advanced Usage

### Requesting Specific Patterns

```
"Implement the Comment entity using the same pattern as Node"
"Create the frontend component following the NodeCard example"
"Write this migration similar to CreateNodesTable"
```

### Cross-Domain Coordination

```
"Update the node endpoints to return edge counts, and update the frontend to display it"
```

Claude will coordinate:
1. Business Logic: Add edge count query
2. REST API: Update response DTO
3. Frontend: Update type and component

### Custom Requests

```
"Create a new script to generate graph visualizations"
"Add monitoring to the shortest path algorithm"
"Implement caching for frequently accessed nodes"
```

## Tips for Success

### 1. Start Small
Begin with simple requests to understand agent behavior:
```
"Create a simple Node entity"
"Add a GET endpoint for nodes"
"Create a basic NodeCard component"
```

### 2. Build Incrementally
Add complexity gradually:
```
"Now add validation to the CreateNodeDto"
"Add error handling to the nodes service"
"Add loading states to NodeCard"
```

### 3. Ask for Context
When unsure:
```
"Show me the current structure of the Node entity"
"What validation is currently on CreateNodeDto?"
"How is error handling done in other services?"
```

### 4. Request Reviews
After changes:
```
"Review the changes we just made for best practices"
"Check if the new code follows project conventions"
"Verify the tests cover all edge cases"
```

### 5. Understand Decisions
Ask why:
```
"Why did you use a recursive CTE instead of a loop?"
"Why is this service method async?"
"Why did you add this index?"
```

## Troubleshooting

### Agent Seems Confused

Try being more specific:
```
❌ "Fix the node thing"
✅ "Fix the validation error in CreateNodeDto for the name field"
```

### Multiple Agents Needed Clarification

Provide more context:
```
"I want to add user authentication. This includes:
- JWT tokens in the backend
- Login/register endpoints
- Protected routes in the frontend
- Auth state management"
```

### Pattern Not Being Followed

Ask explicitly:
```
"Update this to follow the patterns in backend/.cursorrules"
"Refactor this component to match the conventions in frontend/.cursorrules"
```

## Remember

1. **Agents are autonomous**: They know their domain and conventions
2. **Coordination is automatic**: Just describe what you want
3. **Rules are maintained**: Agents keep `.cursorrules` current
4. **Quality is built-in**: Agents follow best practices
5. **Ask questions**: Agents can explain their decisions

## Getting Started

Ready to try it? Start with:

```
"Create a simple Tag entity that can be associated with nodes"
```

And watch the agents coordinate to build the feature across the entire stack!

---

For more details, see:
- [Agent System Guide](./docs/agents.md)
- [Global Rules](./.cursorrules)
- [Individual Agent Documentation](./.claude/agents/)
