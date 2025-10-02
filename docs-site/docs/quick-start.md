---
sidebar_position: 3
---

# Quick Start

## 1. Create OpenAPI Spec

```yaml
openapi: 3.0.3
info:
  title: Task API
  version: 1.0.0

paths:
  /api/tasks:
    get:
      tags: [Task]
      operationId: getTasks
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Task'
    post:
      tags: [Task]
      operationId: createTask
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTask'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'

components:
  schemas:
    Task:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
    CreateTask:
      type: object
      properties:
        title:
          type: string
```

## 2. Generate

```bash
npx ngrx-openapi-gen -i api.yaml -o ./generated --api-name TaskApi
```

## 3. Generated Output

```
generated/
└── task-api/
    ├── api-base-path.token.ts
    └── task/
        ├── application/task.store.ts
        └── entities/
            ├── task.model.ts
            └── create-task.model.ts
```

## 4. Configure

```typescript
// app.config.ts
import { TASK_API_BASE_PATH } from './generated/task-api/api-base-path.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    { provide: TASK_API_BASE_PATH, useValue: 'http://localhost:3000' },
  ],
};
```

## 5. Use

```typescript
@Component({
  template: `
    @for (task of store.tasksValue(); track task.id) {
      <div>{{ task.title }}</div>
    }
    <button (click)="add()">Add Task</button>
  `
})
export class TaskListComponent {
  store = inject(TaskStore);
  
  async add() {
    await this.store.createTask({ title: 'New Task' });
    // List refreshes automatically
  }
}
```
