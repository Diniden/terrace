# Agent System Updates - NestJS Expertise & MCP Browser Testing

## Overview
All agents have been updated with the following enhancements:
1. **NestJS Expertise**: All backend agents are now NestJS experts
2. **MCP Browser Access**: All agents can use Playwright for E2E testing
3. **Live Server Testing**: Tests assume servers are running via mprocs
4. **Updated Testing Paradigm**: Single-run tests against live development environment

## Global Changes

### Technology Stack (Updated in `.cursorrules`)
- Process Manager: **mprocs** for concurrent backend/frontend
- E2E Testing: **Playwright** with MCP browser access
- Development: Servers always running via `bun run dev`
- Testing: Single-run commands against live server

### Testing Philosophy
**OLD**: Start servers, run tests, stop servers
**NEW**: Assume servers running, execute tests, use MCP browser for validation

### Key Commands
- `bun run dev` → Start all services (mprocs)
- `bun run test` → Unit tests (backend + frontend)
- `bun run test:e2e` → E2E tests with Playwright
- `bun run test:e2e:ui` → Interactive E2E testing
- `bun run test:e2e:debug` → Debug E2E tests

## Agent-Specific Updates

### 1. REST API Agent
**Enhanced with**:
- NestJS module system expertise
- Dependency injection mastery
- All NestJS decorators knowledge
- MCP browser access for API testing
- E2E test examples with Playwright

**New Testing Approach**:
```typescript
// Test against running server
test('API endpoint works', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/nodes');
  expect(response.ok()).toBeTruthy();
});
```

### 2. Database Agent
**Enhanced with**:
- NestJS TypeORM integration expertise
- NestJS repository patterns
- Dependency injection for repositories
- Testing database operations against live server

**Key Additions**:
- Understanding of `@InjectRepository()` decorator
- NestJS module imports for TypeORM
- Testing strategies with NestJS Test module

### 3. Business Logic Agent
**Enhanced with**:
- NestJS service patterns expertise
- `@Injectable()` decorator mastery
- Dependency injection for services
- NestJS lifecycle hooks knowledge
- Testing services with NestJS Test utilities

**Key Additions**:
- Service provider registration in modules
- Scoped providers (REQUEST, TRANSIENT)
- Dynamic modules for services
- Testing with mock dependencies

### 4. Frontend Architect Agent
**Enhanced with**:
- MCP browser access for UI testing
- Playwright component testing
- E2E test writing for React components
- Integration testing with backend API

**New Testing Approach**:
```typescript
test('Component renders data from API', async ({ page }) => {
  await page.goto('http://localhost:5173/nodes');
  await page.waitForSelector('[data-testid="node-list"]');
  expect(await page.locator('[data-testid="node-item"]').count()).toBeGreaterThan(0);
});
```

### 5. DevOps Agent
**Enhanced with**:
- mprocs configuration expertise
- Playwright setup and configuration
- E2E test infrastructure
- Browser automation scripts

**Key Additions**:
- `mprocs.yaml` configuration
- `playwright.config.ts` setup
- Browser automation utilities
- Test data generation for E2E tests

### 6. Project Manager Agent
**Enhanced with**:
- Documentation of mprocs workflow
- Playwright testing guides
- NestJS best practices documentation
- Updated architecture diagrams

## Configuration Files Created

### `mprocs.yaml`
```yaml
procs:
  backend:
    shell: "cd backend && bun run start:dev"
  frontend:
    shell: "cd frontend && bun run dev"
```

### `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  // Note: Servers NOT started by Playwright
});
```

### Updated `package.json` Scripts
```json
{
  "dev": "mprocs",
  "test": "bun run test:backend && bun run test:frontend",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

## NestJS Expertise Requirements

### All Backend Agents Must Know:

#### Module System
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Node, Edge])],
  controllers: [NodesController],
  providers: [NodesService, GraphService],
  exports: [NodesService],
})
export class NodesModule {}
```

#### Dependency Injection
```typescript
@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: Repository<Node>,
    private readonly graphService: GraphService,
  ) {}
}
```

#### Decorators
- `@Module()`, `@Controller()`, `@Injectable()`
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`
- `@Param()`, `@Query()`, `@Body()`, `@Headers()`
- `@UseGuards()`, `@UseInterceptors()`, `@UsePipes()`
- `@InjectRepository()`, `@Inject()`

#### Testing Utilities
```typescript
import { Test, TestingModule } from '@nestjs/testing';

const module: TestingModule = await Test.createTestingModule({
  controllers: [NodesController],
  providers: [
    NodesService,
    {
      provide: getRepositoryToken(Node),
      useValue: mockRepository,
    },
  ],
}).compile();
```

## MCP Browser Access Patterns

### Testing User Flows
```typescript
test('User can create a node via UI', async ({ page }) => {
  await page.goto('http://localhost:5173/nodes/new');

  // Fill form
  await page.fill('[name="name"]', 'Test Node');
  await page.fill('[name="type"]', 'entity');

  // Submit
  await page.click('button[type="submit"]');

  // Verify redirect and API call
  await page.waitForURL('**/nodes');
  await expect(page.locator('text=Test Node')).toBeVisible();
});
```

### Testing API Integration
```typescript
test('Frontend and backend integration', async ({ page, request }) => {
  // Create via API
  const response = await request.post('http://localhost:3000/api/nodes', {
    data: { name: 'API Node', type: 'entity' },
  });
  expect(response.ok()).toBeTruthy();

  // Verify in UI
  await page.goto('http://localhost:5173/nodes');
  await expect(page.locator('text=API Node')).toBeVisible();
});
```

## Migration Guide for Existing Code

### OLD: Starting Servers in Tests
```typescript
// ❌ OLD WAY - Don't do this
beforeAll(async () => {
  app = await NestFactory.create(AppModule);
  await app.listen(3000);
});

afterAll(async () => {
  await app.close();
});
```

### NEW: Test Against Running Server
```typescript
// ✅ NEW WAY - Server already running via mprocs
describe('NodesController (e2e)', () => {
  it('GET /api/nodes', async () => {
    // Server is already running at localhost:3000
    const response = await fetch('http://localhost:3000/api/nodes');
    expect(response.ok).toBe(true);
  });
});
```

## Benefits of New Approach

1. **Faster Tests**: No server startup/teardown overhead
2. **Realistic Testing**: Test actual running environment
3. **Interactive Validation**: Use MCP browser to verify manually
4. **Hot Reload Compatible**: Tests work with live reloading
5. **Simplified CI/CD**: Same tests in development and production

## Quick Reference

### Development Workflow
1. Start: `bun run dev` (starts mprocs)
2. Code: Make changes (auto-reload)
3. Test: `bun run test` (unit tests)
4. Validate: `bun run test:e2e:ui` (interactive)
5. Commit: Tests pass ✅

### Agent Responsibilities
- **REST API**: Controllers, DTOs, Guards (NestJS expert)
- **Database**: Entities, Migrations, Repos (NestJS expert)
- **Business Logic**: Services, Graph algorithms (NestJS expert)
- **Frontend**: Components, Hooks (Playwright testing)
- **DevOps**: Scripts, mprocs, Playwright setup
- **Project Manager**: Documentation updates

## Summary

All agents are now:
- ✅ NestJS experts (backend agents)
- ✅ Aware of mprocs for process management
- ✅ Using Playwright for E2E testing
- ✅ Testing against live servers
- ✅ Capable of interactive browser testing with MCP

The development experience is now:
- Faster (no server restarts)
- More realistic (test live environment)
- More interactive (MCP browser access)
- More consistent (same setup everywhere)
