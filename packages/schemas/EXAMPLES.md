# Usage Examples

## API Server Examples

### Environment Validation

```typescript
import { validateEnv } from './config/env.js';

// Validate environment variables on startup
const env = validateEnv();
console.log(`Server running on port ${env.PORT}`);
```

### Request Validation

```typescript
import { createProjectSchema, type CreateProjectInput } from '@vakkya/schemas';
import type { FastifyRequest, FastifyReply } from 'fastify';

app.post('/projects', async (req: FastifyRequest, reply: FastifyReply) => {
  // Validate request body
  const result = createProjectSchema.safeParse(req.body);
  
  if (!result.success) {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.errors[0].message,
      },
    });
  }
  
  // Type-safe data
  const data: CreateProjectInput = result.data;
  
  // Create project
  const project = await prisma.project.create({
    data: {
      name: data.name,
      userId: req.user.id,
      widgetToken: generateToken(),
    },
  });
  
  return project;
});
```

### Using Constants

```typescript
import { MAX_PROJECTS_PER_USER, ERROR_CODES } from '@vakkya/schemas';

async function createProject(userId: string, name: string) {
  const userProjects = await prisma.project.count({ where: { userId } });
  
  if (userProjects >= MAX_PROJECTS_PER_USER) {
    throw new Error(ERROR_CODES.PROJECT_LIMIT_REACHED);
  }
  
  // Create project...
}
```

## Dashboard Examples

### Form Validation with React Hook Form

```typescript
import { createProjectSchema, type CreateProjectInput } from '@vakkya/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreateProjectForm() {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const onSubmit = async (data: CreateProjectInput) => {
    const project = await apiClient.createProject(data);
    console.log('Created:', project);
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <button type="submit">Create</button>
    </form>
  );
}
```

### Type-Safe API Client

```typescript
import type { Project, CreateProjectInput } from '@vakkya/schemas';

class ApiClient {
  async createProject(data: CreateProjectInput): Promise<Project> {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    
    return response.json();
  }
  
  async getProjects(): Promise<Project[]> {
    const response = await fetch('/api/projects');
    return response.json();
  }
}
```

### File Upload Validation

```typescript
import { documentUploadSchema, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@vakkya/schemas';

function DocumentUpload() {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = documentUploadSchema.safeParse({ file });
    
    if (!result.success) {
      alert(result.error.errors[0].message);
      return;
    }
    
    // Upload file
    uploadDocument(file);
  };
  
  return (
    <div>
      <input
        type="file"
        accept={ALLOWED_FILE_TYPES.map(t => `.${t}`).join(',')}
        onChange={handleFileChange}
      />
      <p>Max size: {MAX_FILE_SIZE / 1024 / 1024}MB</p>
    </div>
  );
}
```

### React Query with Types

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Project, CreateProjectInput } from '@vakkya/schemas';

function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });
}

function useCreateProject() {
  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: (data) => apiClient.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

## Voice Agent Examples (Python)

### Type Hints

```python
from typing import TypedDict

class CreateConversationInput(TypedDict):
    projectId: str
    sessionId: str

class ConversationTurn(TypedDict):
    userQuery: str
    agentResponse: str
    timestamp: str

async def create_conversation(data: CreateConversationInput) -> dict:
    # Create conversation in API
    response = await api_client.post('/conversations', json=data)
    return response.json()
```

### Constants

```python
# Replicate constants from schemas package
MAX_CONTEXT_LENGTH = 4000
DEFAULT_TOP_K = 5
EMBEDDING_MODEL = 'text-embedding-3-small'

async def query_rag(query: str, project_id: str) -> list[str]:
    # Query vector database
    results = await db.similarity_search(
        query=query,
        project_id=project_id,
        top_k=DEFAULT_TOP_K
    )
    return results
```

## Testing Examples

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createProjectSchema } from '@vakkya/schemas';

describe('Project validation', () => {
  it('should accept valid project name', () => {
    const result = createProjectSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });
  
  it('should reject empty name', () => {
    const result = createProjectSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
```

### Property-Based Tests

```typescript
import { fc, test } from '@fast-check/vitest';
import { createProjectSchema } from '@vakkya/schemas';

test.prop([fc.string({ minLength: 1, maxLength: 100 })])(
  'should accept any valid string as project name',
  (name) => {
    const result = createProjectSchema.safeParse({ name: name.trim() });
    expect(result.success).toBe(true);
  }
);
```
