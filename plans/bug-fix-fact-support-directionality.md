# Bug Fix Plan: Remove Directionality from Fact Support Relationships

## Summary

The current implementation of fact support relationships uses directional terminology (supports/supported_by) in the database schema, backend APIs, and frontend code. This creates conceptual complexity and confusion since support relationships should be bidirectional links between facts, not directed relationships. This bug fix will refactor the entire stack to use direction-agnostic terminology and present support relationships as simple links between facts.

**Critical Understanding**: A support relationship is a link between two facts that says "these facts are related through support" - it should NOT imply direction. The current implementation incorrectly treats it as "Fact A supports Fact B" when it should simply be "Fact A and Fact B are linked by support."

---

## IMPORTANT RULES

- **AGENTS MUST BE USED AND ONLY IN THE SECTIONS THEY ARE SPECIFIED FOR**
- **NO SUMMARIES ARE TO BE WRITTEN** for each agent section
- All changes must maintain referential integrity and existing validation rules
- All changes must be backwards compatible during migration
- Testing must verify both old and new behavior during transition

---

## Database

**Agent:** database-agent.md

### 1. Rename Database Table and Columns

**SHOULD:**
- Rename the `fact_support` table to use direction-agnostic naming (e.g., `fact_links` or `fact_relationships`)
- Rename column `fact_id` to a neutral name that doesn't imply "the fact being supported"
- Rename column `support_id` to a neutral name that doesn't imply "the fact doing the supporting"
- Use names like `fact_id_a` and `fact_id_b` OR `source_fact_id` and `target_fact_id` (understanding source/target is arbitrary, not directional)
- Ensure foreign key constraints are recreated with new column names
- Ensure indexes are recreated for the new column names

**SHOULD NOT:**
- Use any terminology suggesting direction (supports, supported_by, supporting, etc.)
- Break existing foreign key relationships during migration
- Lose any existing data during the rename operation
- Change the fundamental relationship structure (still many-to-many between facts)

### 2. Update Database Triggers

**SHOULD:**
- Update the `validate_fact_support_composite` trigger function to use new column names
- Update trigger logic to reference `fact_id_a` and `fact_id_b` (or chosen neutral names)
- Maintain all existing validation rules (same corpus, same context, no self-links)
- Update all variable names in trigger functions to be direction-agnostic
- Update error messages to use neutral terminology

**SHOULD NOT:**
- Remove or weaken any existing validation rules
- Use directional terminology in trigger code or error messages
- Change the validation logic itself (only update names and terminology)

### 3. Create Migration Script

**SHOULD:**
- Create a new migration that renames the table and columns
- Include both UP and DOWN migration paths
- Preserve all existing data during the migration
- Recreate all indexes and constraints with correct references
- Update trigger functions before table rename to avoid breaking constraints
- Test the migration can be rolled back successfully

**SHOULD NOT:**
- Delete and recreate the table (use ALTER TABLE RENAME instead)
- Create a migration without a rollback path
- Assume the table is empty during migration
- Skip index recreation

### 4. Update Entity Definitions

**SHOULD:**
- Update `Fact` entity to remove `supports` and `supportedBy` properties
- Add a single neutral property like `linkedFacts` or `supportLinks` that represents all linked facts
- Update `@JoinTable` decorator to reference new table and column names
- Update all entity decorators to use new database names
- Keep the relationship as `@ManyToMany` since it's still many-to-many

**SHOULD NOT:**
- Maintain both old and new properties (clean break to new model)
- Use directional property names in the entity
- Change the fundamental relationship type (still many-to-many)
- Break TypeORM's ability to load the relationship

### Testing Plan

**SHOULD:**
- Create migration test that runs UP migration, verifies data integrity, runs DOWN migration
- Test that foreign key constraints still work after rename
- Test that triggers still validate correctly with new column names
- Test that existing fact support data is preserved during migration
- Verify indexes are properly recreated and used by query planner
- Test that entity loading still works after schema changes

**SHOULD NOT:**
- Skip testing the DOWN migration path
- Assume indexes are automatically recreated (verify explicitly)
- Test only with empty tables (use seeded data)

---

## Backend Business

**Agent:** business-logic-agent.md

### 1. Update Service Layer Methods

**SHOULD:**
- Rename methods from `addSupport/removeSupport` to neutral names like `linkFacts/unlinkFacts` or `addFactLink/removeFactLink`
- Update service logic to work with single bidirectional relationship instead of two directional ones
- Ensure loading fact relationships returns a single list of linked facts (not separate supports/supportedBy arrays)
- Update all internal logic to use neutral terminology
- Maintain all existing business rules (same corpus, same context, etc.)

**SHOULD NOT:**
- Keep old directional method names
- Return separate arrays for "supports" and "supportedBy" in service responses
- Change validation logic (only terminology and structure)
- Allow relationships that violate existing rules

### 2. Update Repository Queries

**SHOULD:**
- Update TypeORM queries to reference new entity property names
- Update custom repository methods to use new column names
- Ensure relationship loading uses correct join table and columns
- Update any raw SQL queries to reference new table/column names
- Return linked facts as a single unified collection

**SHOULD NOT:**
- Use old table/column names in any queries
- Split linked facts into directional groups in query results
- Break existing query performance (maintain indexes)

### 3. Update Fact Relationship Loading

**SHOULD:**
- Update `findOneWithRelationships` method to load linked facts as single collection
- Ensure the relationship loading is efficient (proper eager/lazy loading)
- Update response structure to provide linked facts without directionality
- Maintain loading of other relationships (basis, dependentFacts, corpus)

**SHOULD NOT:**
- Return directional relationship data in any form
- Create N+1 query problems when loading relationships
- Break existing relationship loading for basis/dependentFacts

### Testing Plan

**SHOULD:**
- Update all existing service tests to use new method names and terminology
- Test that linking two facts creates a single bidirectional relationship
- Test that loading fact relationships returns all linked facts in one collection
- Test that validation rules still enforce same corpus and same context
- Test that unlinking facts properly removes the relationship
- Verify that queries use proper indexes (check query plans)

**SHOULD NOT:**
- Leave any tests using old directional terminology
- Skip testing relationship loading performance
- Assume bidirectional relationships work without explicit testing

---

## Backend API

**Agent:** rest-api-agent.md

### 1. Update API Endpoints

**SHOULD:**
- Rename endpoint from `POST /facts/:id/support` to `POST /facts/:id/links` or `/facts/:id/link-facts`
- Rename endpoint from `DELETE /facts/:id/support/:supportFactId` to `DELETE /facts/:id/links/:linkedFactId`
- Update OpenAPI/Swagger documentation to reflect neutral terminology
- Update API descriptions to explain bidirectional nature of fact links
- Maintain RESTful conventions with new naming

**SHOULD NOT:**
- Keep old directional endpoint paths
- Use "support" terminology in endpoint URLs or descriptions
- Change HTTP methods or status codes
- Break REST conventions

### 2. Update DTOs

**SHOULD:**
- Rename `AddSupportDto` to `LinkFactDto` or `AddFactLinkDto`
- Rename DTO properties to neutral names (e.g., `linkedFactId` instead of `supportFactId`)
- Update validation decorators to use neutral property names
- Update all DTO documentation and examples

**SHOULD NOT:**
- Keep old directional DTO names or properties
- Change validation rules (only names)
- Remove validation decorators

### 3. Update API Response Structure

**SHOULD:**
- Update fact response DTOs to include `linkedFacts` or `links` array instead of `supports`/`supportedBy`
- Return linked facts as a single flat array, not split by direction
- Update `GET /facts/:id/relationships` response to use new structure
- Ensure response includes all necessary fact data for linked facts
- Update all API documentation examples to show new response format

**SHOULD NOT:**
- Return separate `supports` and `supportedBy` arrays
- Include any directional terminology in response field names
- Change response data types (facts should still be fact objects)

### 4. Update Controller Logic

**SHOULD:**
- Update controller methods to call renamed service methods
- Update parameter names to use neutral terminology
- Update response mapping to use new DTO structures
- Update all inline documentation and comments

**SHOULD NOT:**
- Keep old service method calls
- Use directional variable names
- Change error handling logic

### Testing Plan

**SHOULD:**
- Update all e2e tests to use new endpoint paths and DTOs
- Test POST /facts/:id/links creates bidirectional relationship
- Test DELETE /facts/:id/links/:linkedFactId removes relationship correctly
- Test GET /facts/:id/relationships returns linked facts in neutral format
- Test that validation errors still occur for invalid relationships (different corpus, different context)
- Test that both facts in a link can see each other in their linkedFacts array
- Verify API documentation is accurate and complete

**SHOULD NOT:**
- Leave any tests using old endpoint paths or DTOs
- Skip testing the bidirectional nature of links
- Assume relationship data is correct without verification

---

## Frontend

**Agent:** frontend-architect-agent.md

### 1. Update TypeScript Types

**SHOULD:**
- Update `Fact` interface to replace `supports`/`supportedBy` with single `linkedFacts` property
- Update type to be `linkedFacts?: Fact[]` (single array of linked facts)
- Remove all references to directional terminology in types
- Update any union types or discriminated unions using fact support types

**SHOULD NOT:**
- Keep old `supports`/`supportedBy` properties in any interfaces
- Use directional terminology in new type names
- Change other fact properties unrelated to support relationships

### 2. Update API Client Functions

**SHOULD:**
- Rename API client functions from `addSupport/removeSupport` to `linkFacts/unlinkFacts`
- Update API endpoint calls to use new paths (`/facts/:id/links`)
- Update request/response typing to use new DTO types
- Update function parameters to use neutral names (`linkedFactId` instead of `supportFactId`)

**SHOULD NOT:**
- Keep old function names
- Use old endpoint paths
- Use directional parameter names

### 3. Update Fact Display Components

**SHOULD:**
- Update `FactStack` component to display linked facts as a single list
- Remove any UI that separates "supports" from "supported by"
- Update labels and headings to use neutral language (e.g., "Linked Facts" instead of "Supports/Supported By")
- Update visual indicators to show bidirectional links without direction arrows
- Ensure linked facts are clearly presented as peers, not hierarchical

**SHOULD NOT:**
- Maintain separate sections for different "directions" of support
- Use directional language in any UI text
- Imply hierarchy or direction in visual design
- Change unrelated fact display behavior

### 4. Update Fact Detail Views

**SHOULD:**
- Update `FactView` page to show linked facts in neutral format
- Update any detail panels to use new data structure
- Update tooltips, labels, and help text to explain bidirectional nature
- Ensure add/remove link UI uses neutral terminology

**SHOULD NOT:**
- Show directional relationship information
- Use old property names when accessing fact data
- Change overall page layout unnecessarily

### 5. Update Utility Functions

**SHOULD:**
- Update `factStackUtils.ts` to work with single `linkedFacts` array
- Remove any logic that combines or separates `supports`/`supportedBy`
- Update any filtering or sorting logic to work with unified linked facts
- Update all variable names to be direction-agnostic

**SHOULD NOT:**
- Keep functions that rely on directional properties
- Maintain separate processing for "supports" vs "supported by"

### 6. Update User Interaction Handlers

**SHOULD:**
- Update click handlers for adding/removing links to call renamed API functions
- Update confirmation messages to use neutral language
- Update success/error messages to reflect bidirectional nature
- Update any forms or modals that manage fact relationships

**SHOULD NOT:**
- Use directional terminology in user-facing messages
- Imply that one fact "supports" another in UI copy
- Change unrelated interaction patterns

### Testing Plan

**SHOULD:**
- Update Storybook stories to use new fact data structure
- Create stories showing linked facts in various states
- Test that FactStack displays linked facts correctly
- Test that adding a link updates both facts' linkedFacts arrays
- Test that removing a link updates both facts
- Test visual presentation is clear and intuitive
- Manual testing of all fact-related pages and components

**SHOULD NOT:**
- Skip updating Storybook stories
- Leave any component tests using old data structures
- Assume UI is clear without user testing

---

## Devops

**Agent:** devops-agent.md

### 1. Update Database Seeding Script

**SHOULD:**
- Update `seed-data.ts` to use new table and column names when creating fact links
- Update seeding logic to create bidirectional relationships properly
- Use new entity property names (`linkedFacts` instead of `supports`)
- Ensure seed data demonstrates the bidirectional nature clearly
- Update any raw SQL in seeding to use new names

**SHOULD NOT:**
- Use old table or column names
- Create directional seed data
- Break the seeding script

### 2. Update Development Database Reset

**SHOULD:**
- Ensure `db-reset.ts` script runs new migrations correctly
- Test that reset + seed creates proper bidirectional relationships
- Verify that development database matches production schema after reset

**SHOULD NOT:**
- Skip testing database reset after migration
- Assume seeding works without verification

### Testing Plan

**SHOULD:**
- Test database reset from clean state
- Test database seeding creates proper fact links
- Verify seeded data can be queried with new entity structure
- Test that development workflow (reset, seed, run) works end-to-end
- Verify no orphaned data or broken relationships in seeded database

**SHOULD NOT:**
- Skip testing full database lifecycle
- Assume scripts work without running them
- Leave broken seed data

---

## Cross-Cutting Concerns

### Documentation Updates

All sections MUST update:
- Inline code comments to remove directional terminology
- Error messages to use neutral language
- Log messages to use neutral terminology
- Developer documentation about the fact relationship model

### Migration Strategy

1. Database migration runs first (changes schema)
2. Backend changes deploy after database migration
3. Frontend changes deploy after backend is verified working
4. Seed scripts updated to match new schema

### Rollback Plan

If issues are discovered:
1. Frontend can rollback independently
2. Backend can rollback independently
3. Database DOWN migration can restore old schema
4. Each layer has independent rollback capability

---

## Definition of Done

This bug fix is complete when:

1. ✅ Database uses neutral table and column names
2. ✅ Database triggers use neutral terminology
3. ✅ Backend entities use single bidirectional relationship property
4. ✅ Backend services use neutral method names
5. ✅ Backend APIs use neutral endpoint paths
6. ✅ Frontend types use neutral property names
7. ✅ Frontend UI shows linked facts without direction
8. ✅ All tests pass with new structure
9. ✅ Seed data uses new schema
10. ✅ Documentation uses neutral terminology throughout
11. ✅ No directional terminology exists anywhere in the codebase related to fact support
12. ✅ Migration can be rolled back successfully
