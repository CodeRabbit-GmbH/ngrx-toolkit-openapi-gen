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
  --prefer-entity-names \    # Use entity-based mutation names
  --shared-entities          # Emit all models into a shared/entities folder
```

## Shared Entities (`--shared-entities`)

When enabled, all generated entity models are placed under `shared/entities` at the root of the generated API output (e.g., `generated/flight-api/shared/entities`). All domain stores import from this shared folder, so entities referenced in multiple domains are generated once and reused. The default remains per-domain entity folders when the flag is not provided.

## Zod Validation (`--zod`)

Enable runtime validation of API responses using [Zod](https://zod.dev).

```bash
npx ngrx-openapi-gen -i api.yaml -o ./generated --api-name MyApi --zod
```

:::tip
Install Zod in your project: `npm install zod`
:::

### Model Validation

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

### Format Validation

OpenAPI `format` properties are mapped to Zod 4 validators:

| OpenAPI Format | Zod Validator |
|----------------|---------------|
| `uuid` | `z.uuid()` |
| `email` | `z.email()` |
| `uri` / `url` | `z.url()` |
| `date` | `z.iso.date()` |
| `date-time` | `z.iso.datetime()` |
| `ipv4` | `z.ipv4()` |
| `ipv6` | `z.ipv6()` |
| `byte` (base64) | `z.base64()` |

**OpenAPI spec:**

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
```

**Generated schema:**

```typescript
export const UserModelSchema = z.object({
  id: z.uuid().optional(),
  email: z.email().optional(),
});
```

### Pattern Validation

OpenAPI `pattern` properties generate regex validators:

**OpenAPI spec:**

```yaml
parameters:
  - name: id
    in: query
    schema:
      type: string
      pattern: '^[a-z0-9]{40}$'
```

**Generated schema:**

```typescript
export const taskParamsSchema = z.string().regex(/^[a-z0-9]{40}$/);
```

### Parameter Schemas File

When `--zod` is enabled, parameter validation schemas are generated in a separate file:

```
task/
├── application/
│   ├── task.store.ts
│   └── task.schemas.ts    # Parameter schemas
└── entities/
    └── task.model.ts
```

**task.schemas.ts:**

```typescript
import { z } from 'zod';

export const tasksParamsSchema = z.object({
  status: z.string().optional(),
  priority: z.number().int().optional()
});
export const taskIdSchema = z.string();
```

**Parameter validation in the store:**

```typescript
setTasksParams(params: { status?: string; priority?: number }): void {
  tasksParamsSchema.parse(params);  // Runtime validation
  patchState(store, { tasksParams: params });
}
```

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

## Store Feature Composition

Every generated store exports both a **feature function** and a **standalone store**:

```typescript
// Generated: task.store.ts

// Feature function - for composition
export function withTasks<_>() {
  return signalStoreFeature(
    withProps(() => ({ _baseUrl: inject(TASK_API_BASE_PATH) })),
    withState({ ... }),
    withResource((store) => ({ ... })),
    withMethods((store) => ({ ... }))
  );
}

// Standalone store - ready to use
export const TaskStore = signalStore(
  { providedIn: 'root' },
  withTasks()
);
```

### Using the Standalone Store

Inject and use directly:

```typescript
@Component({ ... })
export class TaskListComponent {
  store = inject(TaskStore);
}
```

### Composing into Custom Stores

Use `withTasks()` to combine multiple API domains or add custom logic:

```typescript
import { signalStore, withComputed } from '@ngrx/signals';
import { withTasks } from './generated/task-api/task/application/task.store';
import { withProjects } from './generated/task-api/project/application/project.store';

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  
  // Compose multiple API features
  withTasks(),
  withProjects(),
  
  // Add custom computed signals
  withComputed((store) => ({
    tasksByProject: computed(() => {
      const tasks = store.tasksValue();
      const projects = store.projectsValue();
      return projects.map(p => ({
        project: p,
        tasks: tasks.filter(t => t.projectId === p.id)
      }));
    })
  }))
);
```

This pattern enables:
- **Combining multiple API domains** into a single store
- **Adding custom computed signals** that span multiple resources
- **Extending with custom state and methods**
- **Better separation of concerns** in complex applications

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
