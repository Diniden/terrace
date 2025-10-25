# Fact View Feature Plan

## Summary

Create a dedicated Fact View page that displays a single fact with complete relationship context. When a user clicks the "view" button on any fact, they navigate to this page which shows:

1. The basis fact (if one exists) displayed prominently above the current fact
2. Supporting facts within the current corpus that support the viewed fact
3. Derived/child facts that use the viewed fact as their basis

The page follows the same visual structure and styling as the Corpus View page, with clear section headers, proper spacing, and all standard fact actions available. Users can add new facts directly into relationships from this view using add buttons in each section.

Navigation uses the same back-button pattern as Corpus View, with the header showing "{corpus name} - Fact" to maintain context awareness.

---

## Backend API

**Agent: rest-api-agent.md**

### 1. Create endpoint to fetch fact with all relationship context

- Create GET endpoint at `/facts/:id/relationships` or enhance existing `/facts/:id` endpoint
- MUST return the fact with these relationships loaded:
  - `basis` (single fact or null)
  - `supports` (array of facts that the viewed fact supports)
  - `supportedBy` (array of facts that support the viewed fact)
  - `dependentFacts` (array of facts that have this fact as their basis)
  - `corpus` (with corpus name for header display)
- DO use existing authorization patterns (JwtAuthGuard, CurrentUser decorator)
- DO verify user has at least VIEWER role on the project before returning data
- DO use existing FactService.findOne method as base, extend with additional relations
- DO NOT create duplicate authorization logic
- DO NOT load unnecessary nested relationships beyond what's needed for display

### 2. Enhance fact creation endpoint for relationship assignment

- Enhance existing POST `/facts` endpoint to accept optional `supportedById` parameter
- This parameter pre-assigns the new fact as supporting an existing fact
- MUST validate the target fact exists and is in same corpus
- MUST validate both facts have compatible contexts (same context type)
- DO use existing validation patterns from addSupport method
- DO return the newly created fact with relationships loaded
- DO NOT duplicate corpus/project access validation logic

### 3. Testing requirements

- Write controller tests for the relationships endpoint
- Test unauthorized access is properly blocked
- Test with facts that have no relationships (nulls/empty arrays)
- Test with facts that have all relationship types populated
- Test fact creation with `supportedById` parameter
- Test validation errors for invalid relationship assignments
- DO follow existing test patterns in fact.controller.spec.ts
- DO NOT write integration tests (only unit tests for controllers)

---

## Backend Business

**Agent: business-logic-agent.md**

### 1. Create service method to fetch complete fact relationships

- Add method `findOneWithRelationships(id: string, user: User)` to FactService
- MUST load these specific relations: basis, supports, supportedBy, dependentFacts, corpus
- DO reuse existing `checkProjectAccess` authorization method
- DO use TypeORM's relations array to load all data in one query
- DO NOT make separate queries for each relationship type
- DO NOT load more than 2 levels deep in relationships

### 2. Enhance fact creation to support pre-assigned relationships

- Modify existing `create` method to accept optional `supportedById` parameter
- After creating the fact, automatically call `addSupport` to establish the relationship
- MUST validate context compatibility before establishing relationship
- MUST validate both facts are in the same corpus
- DO use existing validation from `addSupport` method
- DO trigger embedding only after all relationships are established
- DO NOT create circular relationships
- DO NOT bypass existing validation rules

### 3. Add helper method to find child facts (facts with this as basis)

- Create query method to find all facts where `basisId` equals the target fact's id
- MUST filter to only return facts in the same corpus or derived corpuses
- DO add efficient database index on `basisId` column if not present
- DO return facts ordered by creation date (newest first)
- DO NOT load deeply nested relationships for child facts

### 4. Testing requirements

- Write service tests for `findOneWithRelationships` method
- Test authorization validation works correctly
- Test relationship loading is complete and accurate
- Test child facts query returns correct results
- Test fact creation with `supportedById` establishes relationship correctly
- DO follow existing patterns in fact.service.spec.ts
- DO mock repository methods properly
- DO NOT test database-level constraints (those are database layer responsibility)

---

## Frontend

**Agent: frontend-architect-agent.md**

### 1. Create FactView page component

- Create new page at `/frontend/src/pages/FactView.tsx`
- Use route parameter `:factId` to identify which fact to display
- MUST use the same page structure as CorpusView:
  - PageHeader with corpus name + " - Fact" as title
  - Back button that navigates to the fact's corpus view
  - Main body with three distinct sections (vertical layout)
  - PageFooter component (reuse existing)
- DO reuse existing page layout CSS patterns from CorpusView
- DO NOT create new layout structure, follow CorpusView patterns exactly

### 2. Implement three-section layout in body

- **First Section: Basis Fact Display**
  - MUST show the basis fact if it exists (fact.basis)
  - Display corpus name faintly above the fact card
  - Show a faint horizontal divider line below
  - If no basis exists, show empty state or skip section entirely
  - DO use FactCard component for display
  - DO pass the existing onUpdate handler for inline editing

- **Second Section: Supporting Facts Display**
  - MUST display all facts that support the current fact (fact.supportedBy)
  - Show section header "Supporting Facts" with corpus name displayed faintly
  - Show all facts with same context as viewed fact only
  - Include "+ Add" button positioned same as CorpusView sections
  - DO use FactCard component for each fact
  - DO reuse corpusView region styling patterns

- **Third Section: Derived Facts Display**
  - MUST display all facts that have the current fact as their basis (fact.dependentFacts)
  - Show section header "Derived Facts" with corpus name displayed faintly
  - Include "+ Add" button positioned same as CorpusView sections
  - DO use FactCard component for each fact
  - DO reuse corpusView region styling patterns

### 3. Implement add fact functionality for sections

- **Supporting Facts Add Button:**
  - When clicked, create new fact in same corpus with same context
  - Immediately establish support relationship to viewed fact
  - Use `supportedById` parameter in creation API call
  - DO reload fact data after creation completes
  - DO handle API errors gracefully with error states

- **Derived Facts Add Button:**
  - When clicked, create new fact in same corpus with same context
  - Set `basisId` to the viewed fact's id
  - DO validate context allows basis before calling API
  - DO reload fact data after creation completes

### 4. Add navigation from FactCard view button

- Modify FactCard component's view button handler
- Navigate to `/corpus/:corpusId/fact/:factId` route
- DO use react-router's useNavigate hook
- DO pass the corpusId and factId from fact data
- DO NOT create navigation logic in FactCard, use callback prop

### 5. Create CSS stylesheet for FactView

- Create `/frontend/src/pages/FactView.css`
- MUST mirror the section structure from CorpusView.css
- Use same spacing variables, color variables, and layout patterns
- Sections should be vertically stacked with clear visual separation
- DO use existing CSS custom properties (--spacing-*, --color-*, etc.)
- DO maintain consistent styling with CorpusView page
- DO NOT introduce new color schemes or spacing patterns

### 6. Create route in App router

- Add route path `/corpus/:corpusId/fact/:factId` to route configuration
- DO place route near other fact/corpus routes for organization
- DO NOT create nested routes, keep flat structure

### 7. Testing requirements

- Create Storybook stories for FactView page component
- Test with fact that has no relationships (empty states)
- Test with fact that has only basis
- Test with fact that has only supporting facts
- Test with fact that has only derived facts
- Test with fact that has all relationship types
- DO use mock data with proper Fact type structure
- DO NOT test with live API calls in stories
- DO NOT create stories for components with API dependencies (this is just page structure)

---

## Testing Requirements Summary

### Backend Testing
- Controller: Endpoint authorization, relationship loading, parameter validation
- Service: Relationship queries, access control, fact creation with relationships
- Focus on unit tests, mock repositories properly
- Follow existing test patterns in codebase

### Frontend Testing
- Storybook stories for FactView page with various relationship states
- Test empty states, single relationships, multiple relationships
- Use mock Fact data with proper TypeScript types
- DO NOT test API integration in stories
