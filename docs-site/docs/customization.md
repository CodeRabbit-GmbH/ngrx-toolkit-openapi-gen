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
  --model-suffix Dto         # Model suffix (default: Model)
```

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
