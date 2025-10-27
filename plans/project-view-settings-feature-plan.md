# Project View Settings Feature Plan

## Summary

A persistence layer for user-specific project view configurations. Each user will have customizable view settings per project that persist across sessions. Settings include scroll positions, corpus column widths, and fact stack expansion states. The system will automatically save settings on user interactions and restore them when returning to a project view.

---

## Agent Updates

**Responsible Agent:** agent-orchestrator.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Update all agents with ProjectViewSettings domain concept**
   - MUST include: ProjectViewSettings as a user-scoped, project-scoped configuration model
   - MUST include: Relationship between User, Project, and ProjectViewSettings (one setting per user per project)
   - MUST include: Settings are JSON-based and contain scroll positions, corpus configurations, and fact stack states
   - SHOULD NOT: Include specific JSON schema details or implementation patterns

2. **Update .cursorrules with ProjectViewSettings specifications**
   - MUST include: The purpose of ProjectViewSettings in the domain model
   - MUST include: When settings are saved (navigation, refresh, column adjustments, corpus changes)
   - MUST include: When settings are loaded (project view page load)
   - SHOULD NOT: Include component-level implementation details

---

## Database

**Responsible Agent:** database-agent.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Create ProjectViewSettings entity**
   - MUST include: Composite unique constraint on userId and projectId
   - MUST include: JSON column for settings storage
   - MUST include: Foreign key relationships to User and Project with proper cascade behavior
   - MUST include: Timestamps for created and updated
   - SHOULD NOT: Store individual setting fields as separate columns

2. **Add appropriate indexes**
   - MUST include: Index on userId for efficient user-based queries
   - MUST include: Index on projectId for efficient project-based queries
   - SHOULD NOT: Over-index on JSON fields

### Testing Requirements

- MUST verify: Unique constraint prevents duplicate user-project combinations
- MUST verify: Cascade behavior when User or Project is deleted
- MUST verify: JSON column accepts valid JSON and rejects invalid JSON

---

## Backend Business

**Responsible Agent:** business-logic-agent.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Create ProjectViewSettings service**
   - MUST include: Validation that settings JSON matches expected structure
   - MUST include: Logic to handle upsert operations (create if not exists, update if exists)
   - MUST include: Authorization checks ensuring users can only access their own settings
   - MUST include: Validation that referenced project exists and user has access to it
   - SHOULD NOT: Validate every field within the JSON settings structure

2. **Implement CRUD operations**
   - MUST include: Create operation (initial settings creation)
   - MUST include: Read operation (fetch settings for user + project)
   - MUST include: Update operation (modify existing settings)
   - MUST include: Delete operation (remove settings)
   - SHOULD NOT: Allow partial updates without full JSON replacement

### Testing Requirements

- MUST test: Upsert logic correctly creates or updates
- MUST test: Authorization prevents cross-user access
- MUST test: Validation rejects invalid project references
- MUST test: Service handles non-existent settings gracefully

---

## Backend API

**Responsible Agent:** rest-api-agent.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Create ProjectViewSettings endpoints**
   - MUST include: GET endpoint to retrieve settings for current user and specific project
   - MUST include: POST/PUT endpoint to save settings for current user and specific project
   - MUST include: DELETE endpoint to remove settings
   - MUST include: Authentication guard on all endpoints
   - MUST include: Validation that current user matches the userId in the request
   - SHOULD NOT: Allow querying other users' settings

2. **Create DTOs for request/response**
   - MUST include: DTO for settings retrieval with projectId parameter
   - MUST include: DTO for settings update with projectId and settings JSON
   - MUST include: Validation decorators for required fields
   - SHOULD NOT: Include exhaustive validation for every JSON field

3. **Add proper error handling**
   - MUST include: 404 when project doesn't exist
   - MUST include: 403 when user doesn't have access to project
   - MUST include: 400 when settings JSON is malformed
   - SHOULD NOT: Expose internal database errors to client

### Testing Requirements

- MUST test: All CRUD endpoints return correct status codes
- MUST test: Authentication guard blocks unauthenticated requests
- MUST test: Users cannot access other users' settings
- MUST test: Invalid JSON is rejected with appropriate error

---

## Frontend

**Responsible Agent:** frontend-architect-agent.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Create API integration for ProjectViewSettings**
   - MUST include: API service functions for fetching and saving settings
   - MUST include: Type definitions matching backend DTOs
   - SHOULD NOT: Create components for this step

2. **Implement settings persistence triggers**
   - MUST include: Save settings when columns are adjusted
   - MUST include: Save settings when navigating away from project view page
   - MUST include: Save settings on page refresh (beforeunload event)
   - MUST include: Save settings when corpus stack view is adjusted
   - MUST include: Save settings when corpus is added or removed
   - MUST include: Debouncing or throttling to prevent excessive API calls
   - SHOULD NOT: Save on every single scroll event without throttling

3. **Implement settings restoration**
   - MUST include: Load settings when project view page mounts
   - MUST include: Apply scroll positions after DOM is ready
   - MUST include: Apply corpus column widths
   - MUST include: Apply fact stack expansion states
   - MUST include: Graceful handling when saved corpus no longer exists
   - SHOULD NOT: Fail silently if settings fail to load

4. **Update existing components**
   - MUST include: Modify ProjectDetailPage to integrate settings load/save
   - MUST include: Modify CorpusView to use persisted column widths
   - MUST include: Modify FactStack to use persisted expansion states
   - SHOULD NOT: Create new components if existing ones can be modified

### Testing Requirements

- MUST test: Settings are saved when expected triggers occur
- MUST test: Settings are correctly restored on page load
- MUST test: Missing corpus in settings doesn't break the view
- MUST test: Throttling prevents excessive API calls
- Note: Stories not required since this involves API calls

---

## Devops

**Responsible Agent:** devops-agent.md

**AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR.**
**NO SUMMARIES ARE TO BE WRITTEN for each agent section.**

### Main Steps

1. **Update database seeding script**
   - MUST include: Sample ProjectViewSettings for seeded users and projects
   - MUST include: Valid JSON that matches the expected settings structure
   - MUST include: Variety of settings examples (different scroll positions, widths, expansion states)
   - SHOULD NOT: Seed settings for every possible user-project combination

### Testing Requirements

- MUST verify: Seeding script runs without errors
- MUST verify: Seeded settings have valid JSON structure
- MUST verify: Seeded settings reference existing users and projects
