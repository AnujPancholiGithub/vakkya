# @vakkya/schemas

Shared TypeScript types, Zod validation schemas, and constants for Vakkya.

## Purpose

This package provides a single source of truth for:
- **Types**: TypeScript interfaces for all data models
- **Validation**: Zod schemas for form and API validation
- **Constants**: Shared configuration values and limits

## Usage

### In API Server

```typescript
import { createProjectSchema, type Project, MAX_PROJECTS_PER_USER } from '@vakkya/schemas';

// Validate request body
const result = createProjectSchema.safeParse(req.body);

// Use types
const project: Project = await prisma.project.create({
  data: { name: result.data.name, userId }
});

// Use constants
if (userProjects.length >= MAX_PROJECTS_PER_USER) {
  throw new Error('Project limit reached');
}
```

### In Dashboard

```typescript
import { createProjectSchema, type Project } from '@vakkya/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Form validation
const form = useForm({
  resolver: zodResolver(createProjectSchema)
});

// Type-safe API responses
const projects: Project[] = await apiClient.getProjects();
```

### In Voice Agent

```typescript
from vakkya_schemas import CreateConversationInput, AddConversationTurnInput

# Type hints for Python
def create_conversation(data: CreateConversationInput) -> Conversation:
    ...
```

## Structure

```
src/
├── types.ts         # TypeScript interfaces
├── validation.ts    # Zod schemas
├── constants.ts     # Shared constants
└── index.ts         # Main export
```

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check
```

## Adding New Schemas

1. Add TypeScript interface to `types.ts`
2. Add Zod schema to `validation.ts`
3. Export from `index.ts`
4. Rebuild package: `pnpm build`

## Type Safety

All schemas include TypeScript type inference:

```typescript
import { createProjectSchema, type CreateProjectInput } from '@vakkya/schemas';

// Inferred type matches schema
type Input = z.infer<typeof createProjectSchema>;
// Same as: type Input = CreateProjectInput
```

## Validation Examples

### Form Validation

```typescript
const result = createProjectSchema.safeParse(formData);

if (!result.success) {
  console.error(result.error.errors);
  // [{ path: ['name'], message: 'Project name is required' }]
}
```

### API Request Validation

```typescript
app.post('/projects', async (req, reply) => {
  const result = createProjectSchema.safeParse(req.body);
  
  if (!result.success) {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.errors[0].message
      }
    });
  }
  
  // result.data is type-safe
  const project = await createProject(result.data);
  return project;
});
```

## Constants Reference

### File Limits
- `MAX_FILE_SIZE`: 10MB
- `ALLOWED_FILE_TYPES`: ['pdf', 'txt', 'md']

### Project Limits
- `MAX_PROJECTS_PER_USER`: 10
- `MAX_PROJECT_NAME_LENGTH`: 100

### Document Processing
- `CHUNK_SIZE`: 1000 characters
- `CHUNK_OVERLAP`: 200 characters
- `EMBEDDING_DIMENSIONS`: 1536
- `EMBEDDING_MODEL`: 'text-embedding-3-small'

### RAG Settings
- `DEFAULT_TOP_K`: 5 results
- `MAX_CONTEXT_LENGTH`: 4000 characters

## Error Codes

```typescript
import { ERROR_CODES } from '@vakkya/schemas';

throw new Error(ERROR_CODES.PROJECT_LIMIT_REACHED);
```

Available codes:
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`
- `PROJECT_LIMIT_REACHED`
- `FILE_TOO_LARGE`
- `INVALID_FILE_TYPE`
- `PROCESSING_FAILED`
