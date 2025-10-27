# ProjectViewSettings API Endpoints

## Base Path
`/project-view-settings`

## Authentication
All endpoints require JWT authentication via `@UseGuards(JwtAuthGuard)`.

## Endpoints

### 1. GET /project-view-settings/:projectId
**Description**: Retrieve settings for current user and specific project

**Path Parameters**:
- `projectId` (required, UUID): The project ID to retrieve settings for

**Response**:
- `200 OK`: Returns `SettingsResponseDto` or `null` if settings don't exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User doesn't have access to the project

**Example Request**:
```
GET /project-view-settings/7158ad17-4ef3-4c55-87b9-3ec723a9cc84
```

**Example Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "projectId": "uuid",
  "settings": {
    "scrollPositions": { "corpus1": 100 },
    "corpusColumnWidths": { "corpus1": 300 },
    "factStackExpansionStates": { "fact1": true }
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

---

### 2. POST /project-view-settings
**Description**: Create new settings for current user and specific project

**Request Body** (`SaveSettingsDto`):
- `projectId` (required, UUID): The project ID
- `settings` (required, object): Settings JSON object

**Response**:
- `201 Created`: Returns `SettingsResponseDto`
- `400 Bad Request`: Settings already exist (use PUT) or invalid JSON
- `403 Forbidden`: User doesn't have access to the project
- `404 Not Found`: Project doesn't exist

**Example Request**:
```json
{
  "projectId": "uuid",
  "settings": {
    "scrollPositions": { "corpus1": 100 },
    "corpusColumnWidths": { "corpus1": 300 }
  }
}
```

---

### 3. PUT /project-view-settings
**Description**: Update existing settings for current user and specific project

**Request Body** (`SaveSettingsDto`):
- `projectId` (required, UUID): The project ID
- `settings` (required, object): Settings JSON object (full replacement)

**Response**:
- `200 OK`: Returns `SettingsResponseDto`
- `400 Bad Request`: Invalid JSON
- `403 Forbidden`: User doesn't have access to the project
- `404 Not Found`: Project doesn't exist or settings don't exist

**Note**: This performs a full replacement of the settings JSON, not a partial update.

---

### 4. POST /project-view-settings/upsert
**Description**: Create or update settings (create if not exists, update if exists)

**Request Body** (`SaveSettingsDto`):
- `projectId` (required, UUID): The project ID
- `settings` (required, object): Settings JSON object

**Response**:
- `200 OK`: Returns `SettingsResponseDto`
- `400 Bad Request`: Invalid JSON
- `403 Forbidden`: User doesn't have access to the project
- `404 Not Found`: Project doesn't exist

**Note**: This is the recommended endpoint for frontend usage as it handles both create and update cases.

---

### 5. DELETE /project-view-settings/:projectId
**Description**: Delete settings for current user and specific project

**Path Parameters**:
- `projectId` (required, UUID): The project ID to delete settings for

**Response**:
- `204 No Content`: Settings deleted successfully (or didn't exist)
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User doesn't have access to the project

**Example Request**:
```
DELETE /project-view-settings/7158ad17-4ef3-4c55-87b9-3ec723a9cc84
```

---

## Authorization Rules

1. **User Isolation**: Users can ONLY access their own settings. The `userId` is derived from the JWT token and cannot be specified in the request.

2. **Project Access**: Users must have access to the project (owner, member, or admin) to manage settings for that project.

3. **Application Admins**: Users with `ApplicationRole.ADMIN` have access to all projects.

---

## Settings JSON Structure

The `settings` field is a flexible JSON object that can contain any structure. The following keys are commonly used:

```typescript
{
  scrollPositions?: Record<string, number>;
  corpusColumnWidths?: Record<string, number>;
  factStackExpansionStates?: Record<string, boolean>;
  [key: string]: any; // Additional custom fields
}
```

Basic validation ensures:
- `settings` must be a valid JSON object (not array, string, etc.)
- Optional keys (`scrollPositions`, `corpusColumnWidths`, `factStackExpansionStates`) must be objects if present

---

## Error Responses

All error responses follow the standard NestJS format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common error scenarios:
- `400`: Invalid JSON structure, settings already exist (POST only)
- `401`: Missing or invalid JWT token
- `403`: User doesn't have access to project or trying to access another user's settings
- `404`: Project doesn't exist or settings don't exist (PUT/DELETE only)

---

## Testing

Unit tests: `project-view-settings.controller.spec.ts`
E2E tests: `test/project-view-settings.e2e-spec.ts`

Run tests:
```bash
# Unit tests
bun test project-view-settings.controller.spec.ts

# E2E tests
bun run test:e2e project-view-settings.e2e-spec.ts
```
