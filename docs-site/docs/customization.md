---
sidebar_position: 8
---

# Customization

## CLI Options

```bash
npx ngrx-openapi-gen \
  -i api.yaml \              # Input spec
  -o ./generated \           # Output directory
  --api-name MyApi \         # API name (required)
  --zod \                    # Enable Zod validation
  --prefer-entity-names      # Use entity-based mutation names
```

## Zod Validation (`--zod`)

Enable runtime validation of API responses using [Zod](https://zod.dev).

```bash
npx ngrx-openapi-gen -i api.yaml -o ./generated --api-name MyApi --zod
```

**Generated model (with `--zod`):**

```typescript
import { z } from 'zod';

export interface TaskModel {
  id?: string;
  title?: string;
  status?: 'pending' | 'completed';
}

export const TaskModelSchema: z.ZodType<TaskModel> = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['pending', 'completed']).optional(),
});
```

**Generated store validates responses automatically:**

```typescript
tasks: httpResource<TaskModel[]>(() => ({
  url: `${store._baseUrl}/tasks`,
  parse: (data: unknown) => z.array(TaskModelSchema).parse(data)
}), { defaultValue: [] })
```

:::tip
Install Zod in your project: `npm install zod`
:::

## Mutation Naming (`--prefer-entity-names`)

Controls how mutation methods are named.

```bash
# Default: uses operationId from OpenAPI spec
npx ngrx-openapi-gen -i api.yaml -o ./generated --api-name MyApi
# → addPet, updatePet, deletePet

# With flag: uses entity-based names
npx ngrx-openapi-gen -i api.yaml -o ./generated --api-name MyApi --prefer-entity-names
# → createPet, updatePet, removePet
```

| HTTP Method | Default (operationId) | `--prefer-entity-names` |
|-------------|----------------------|-------------------------|
| POST | `addPet` | `createPet` |
| PUT | `updatePet` | `updatePet` |
| DELETE | `deletePet` | `removePet` |

When duplicates occur (e.g., two POST endpoints for the same entity), it falls back to `operationId`.

## Base URL Configuration

### Static

```typescript
{ provide: MY_API_BASE_PATH, useValue: 'https://api.example.com' }
```

### Environment-based

```typescript
{ provide: MY_API_BASE_PATH, useValue: environment.apiUrl }
```

### Multiple APIs

```typescript
providers: [
  { provide: TASKS_API_BASE_PATH, useValue: 'http://localhost:3000' },
  { provide: FLIGHTS_API_BASE_PATH, useValue: 'https://api.flights.com' },
]
```

## Facade Pattern

Simplify store usage with a facade:

```typescript
@Injectable({ providedIn: 'root' })
export class TaskFacade {
  private store = inject(TaskStore);
  
  readonly tasks = this.store.tasksValue;
  readonly pendingTasks = computed(() => 
    this.tasks().filter(t => t.status === 'pending')
  );
  
  async complete(id: string) {
    const task = this.tasks().find(t => t.id === id);
    if (task) {
      await this.store.updateTask({ id, body: { ...task, status: 'completed' } });
    }
  }
}
```

## Nx Integration

```json
// project.json
{
  "targets": {
    "generate-stores": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "npx ngrx-openapi-gen -i src/api.yaml -o src/app/generated --api-name MyApi"
        ]
      }
    }
  }
}
```

## Git Ignore Generated Files

```bash
# .gitignore
src/app/generated/*
!src/app/generated/.gitkeep
```
