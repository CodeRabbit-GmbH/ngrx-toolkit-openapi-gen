---
sidebar_position: 4
---

# Domain Generation

## Tags Become Domains

OpenAPI **tags** organize operations into domains:

```yaml
paths:
  /api/flights:
    get:
      tags: [Flight]      # → flight/ domain
  /api/passengers:
    get:
      tags: [Passenger]   # → passenger/ domain
```

**Output:**

```
generated/
└── my-api/
    ├── flight/
    │   └── application/flight.store.ts
    └── passenger/
        └── application/passenger.store.ts
```

## Operation Classification

| Pattern | Method | Result |
|---------|--------|--------|
| `/items` | GET | Collection resource |
| `/items/{id}` | GET | Detail resource |
| `/items` | POST | Create mutation |
| `/items/{id}` | PUT/PATCH | Update mutation |
| `/items/{id}` | DELETE | Delete mutation |

### Collection (GET array)

```yaml
/api/tasks:
  get:
    tags: [Task]
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Task'
```

**Generates:** `store.tasksValue()`, `store.tasksIsLoading()`

### Detail (GET by ID)

```yaml
/api/tasks/{id}:
  get:
    tags: [Task]
    parameters:
      - name: id
        in: path
        schema:
          type: string
```

**Generates:** `store.selectedTaskId()`, `store.taskDetailValue()`, `store.selectTask(id)`

### Mutation (POST/PUT/DELETE)

```yaml
/api/tasks:
  post:
    tags: [Task]
    operationId: createTask
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateTask'
```

**Generates:** `store.createTask(data)`, `store.createTaskIsPending()`

## Requirements

### 1. Every operation needs a tag

```yaml
# ✅ Good
/api/tasks:
  get:
    tags: [Task]

# ❌ Bad - won't be generated
/api/tasks:
  get:
    # no tag
```

### 2. Use schema references

```yaml
# ✅ Good - creates TaskModel
schema:
  $ref: '#/components/schemas/Task'

# ⚠️ Works but no model file
schema:
  type: object
  properties:
    id:
      type: string
```

### 3. Use operationId for mutations

```yaml
# ✅ Good
post:
  operationId: createTask  # → store.createTask()

# ⚠️ Works but auto-generated name
post:
  # no operationId
```

## Primitive Arrays

Non-entity arrays are also supported:

```yaml
/api/airports:
  get:
    tags: [Airport]
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
```

**Generates:** `store.getAirportsValue()` returning `string[]`
