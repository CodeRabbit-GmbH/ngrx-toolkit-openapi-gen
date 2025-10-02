---
sidebar_position: 5
---

# OpenAPI Requirements

## Supported Version

OpenAPI **3.0.x** and **3.1.x**

## Required Elements

| Element | Required | Purpose |
|---------|----------|---------|
| `tags` on operations | ✅ Yes | Domain organization |
| `operationId` | Recommended | Clean method names |
| `$ref` schemas | Recommended | Reusable models |

## Type Mapping

| OpenAPI | TypeScript |
|---------|------------|
| `string` | `string` |
| `number`, `integer` | `number` |
| `boolean` | `boolean` |
| `array` | `Array<T>` |
| `object` | Interface |
| `$ref` | Referenced interface |

## Enums

```yaml
status:
  type: string
  enum: [pending, active]
```

→ `status: 'pending' | 'active'`

## Nullable

```yaml
description:
  type: string
  nullable: true
```

→ `description: string | null`

## Query Parameters

```yaml
/api/tasks:
  get:
    parameters:
      - name: status
        in: query
        schema:
          type: string
```

**Generates:**
- `store.tasksParams()` - current params
- `store.setTasksParams({ status: 'pending' })` - update params

## Path Parameters

```yaml
/api/tasks/{id}:
  get:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
```

**Generates:** State-based selection with `store.selectTask(id)`

## Request Bodies

```yaml
post:
  requestBody:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/CreateTask'
```

**Generates:** `store.createTask(data: CreateTaskModel)`

## Response Handling

Success responses (`2xx`) determine the return type:

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Task'
  '204':
    description: No Content  # void
```
