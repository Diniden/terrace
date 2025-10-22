# Chat History Navigation Feature Plan

## Summary
Add keyboard-driven chat history navigation to the footer LLM chat input. Users can press UP arrow to cycle backward through their previous chat messages, and DOWN arrow to move forward through history. Messages are loaded from the server, the history index resets on submission, and each submitted message is persisted to the database.

---

## Database
**Agent:** database-agent.md

### 1. Create chat message entity
- SHOULD store user association via foreign key
- SHOULD store message content (text)
- SHOULD store timestamp for chronological ordering
- SHOULD include indexes on user_id and timestamp for efficient retrieval
- DO NOT store LLM responses, only user input messages
- DO NOT include soft-delete functionality unless explicitly requested

### 2. Create migration for chat messages
- SHOULD create the chat_messages table with proper constraints
- SHOULD ensure foreign key relationships cascade appropriately
- DO NOT modify existing entities unless necessary for relationships

### Testing
- Verify migration runs successfully up and down
- Verify foreign key constraints work correctly
- Verify indexes are created as expected

---

## Backend Business
**Agent:** business-logic-agent.md

### 1. Create chat message service
- SHOULD implement method to retrieve user's chat history in reverse chronological order
- SHOULD implement method to create/save new chat messages
- SHOULD support pagination or offset-based retrieval for performance
- MUST validate that users can only access their own chat history
- DO NOT implement complex filtering or search at this stage
- DO NOT cache results unless performance becomes an issue

### 2. Handle business validation
- SHOULD validate message content is not empty before saving
- SHOULD validate user exists before associating message
- MUST ensure user authorization for accessing chat history
- DO NOT implement message content sanitization unless security concerns arise

### Testing
- Unit tests for service methods
- Verify correct ordering of messages
- Verify user isolation (users cannot access other users' history)
- Verify empty message validation

---

## Backend API
**Agent:** rest-api-agent.md

### 1. Create chat history endpoints
- SHOULD implement GET endpoint for retrieving user's chat history
- SHOULD implement POST endpoint for creating new chat messages
- MUST include proper authentication guards on both endpoints
- SHOULD support query parameters for pagination/offset on GET endpoint
- SHOULD return messages in reverse chronological order (newest first)
- DO NOT implement DELETE or UPDATE endpoints unless explicitly requested
- DO NOT expose other users' chat history

### 2. Create DTOs
- SHOULD create DTO for chat message creation with validation
- SHOULD create response DTO for chat message with all necessary fields
- SHOULD validate message content length and format
- DO NOT include complex validation rules beyond basic requirements

### 3. Add Swagger documentation
- SHOULD document all endpoints with proper descriptions
- SHOULD include example requests and responses
- SHOULD document authentication requirements

### Testing
- E2E tests for GET chat history endpoint
- E2E tests for POST chat message endpoint
- Verify authentication is enforced
- Verify user can only access their own history
- Verify pagination/offset works correctly

---

## Frontend
**Agent:** frontend-architect-agent.md

### 1. Update footer chat component with keyboard handling
- ✅ SHOULD detect UP arrow key press in the input field
- ✅ SHOULD only trigger history navigation when cursor is at position 0 (beginning/top)
- ✅ SHOULD prevent default UP arrow behavior when navigating history
- ✅ MUST set cursor to beginning of input after loading historical message
- ✅ SHOULD maintain a local history index counter (starts at 0)
- ✅ SHOULD increment history index on each UP press
- ✅ SHOULD reset history index to 0 on message submission
- ✅ IMPLEMENTED: DOWN arrow navigation to move forward through history
  - Triggers only when cursor is at the end of the textarea
  - Decrements history index to move toward more recent messages
  - Restores the original draft when returning to index 0
  - Sets cursor to end after loading message

### 2. Integrate API calls for chat history
- SHOULD fetch chat history from backend using the new GET endpoint
- SHOULD handle loading and error states appropriately
- SHOULD cache fetched history locally to avoid redundant API calls
- MUST only fetch history for authenticated users
- DO NOT implement real-time sync or websocket updates at this stage

### 3. Update chat submission logic
- SHOULD send new message to backend POST endpoint on submission
- SHOULD reset history index to 0 after successful submission
- SHOULD append new message to local cache after submission
- MUST clear input field after submission
- DO NOT modify existing chat display/rendering logic

### 4. Maintain existing component structure
- SHOULD keep component props-driven where possible
- DO NOT create new components if modifications fit within existing structure
- DO NOT modify global state management unless necessary

### Testing
- Storybook stories for keyboard interaction states (if component is props-driven)
- Manual testing for UP arrow navigation flow
- Verify cursor positioning after history load
- Verify history index resets on submission
- Verify API integration works correctly

---

## Devops
**Agent:** devops-agent.md

### 1. Update database seeding script
- SHOULD add sample chat messages for test users
- SHOULD include variety of message content for realistic testing
- SHOULD associate messages with existing seeded users
- SHOULD include timestamps that create realistic chronological ordering
- DO NOT seed excessive amounts of data unless testing pagination
- DO NOT include sensitive or inappropriate content in seed data

### Testing
- Verify seeding script runs without errors
- Verify seeded chat messages appear correctly in database
- Verify seeded data works with backend API endpoints

---

## Testing Overview
Each section above includes specific testing requirements. The overall testing strategy should ensure:
- Database: Migration integrity, constraint validation, index creation
- Backend Business: Service method correctness, user isolation, validation
- Backend API: Endpoint functionality, authentication, E2E flows
- Frontend: Keyboard interaction, API integration, state management
- Devops: Seed data integrity and usability
