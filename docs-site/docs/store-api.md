---
sidebar_position: 6
---

# Generated Store API

## Collection Signals

For `GET /api/tasks` returning an array:

| Signal | Type | Description |
|--------|------|-------------|
| `tasksValue()` | `TaskModel[]` | Data array |
| `tasksIsLoading()` | `boolean` | Loading state |
| `tasksError()` | `Error \| undefined` | Error if failed |
| `tasksHasValue()` | `boolean` | Has loaded |

```typescript
@Component({
  template: `
    @if (store.tasksIsLoading()) {
      <p>Loading...</p>
    } @else {
      @for (task of store.tasksValue(); track task.id) {
        <div>{{ task.title }}</div>
      }
    }
  `
})
export class TaskListComponent {
  store = inject(TaskStore);
}
```

## Query Parameters

For endpoints with query params:

| API | Description |
|-----|-------------|
| `tasksParams()` | Current params |
| `setTasksParams(params)` | Update params |

```typescript
// Filter by status
store.setTasksParams({ status: 'pending' });

// Clear filters
store.setTasksParams({});
```

## Detail Signals

For `GET /api/tasks/{id}`:

| API | Description |
|-----|-------------|
| `selectedTaskId()` | Currently selected ID |
| `selectTask(id)` | Set selection |
| `taskDetailValue()` | Selected item |
| `taskDetailIsLoading()` | Loading state |

```typescript
// Select an item
store.selectTask('123');

// Access detail
const task = store.taskDetailValue();

// Clear selection
store.selectTask(undefined);
```

## Mutations

For POST/PUT/DELETE operations:

| API | Description |
|-----|-------------|
| `createTask(data)` | Trigger mutation |
| `createTaskIsPending()` | Loading state |
| `createTaskResult()` | Success result |
| `createTaskError()` | Error if failed |

```typescript
// Create
await store.createTask({ title: 'New Task' });

// Update
await store.updateTask({ id: '123', body: { title: 'Updated' } });

// Delete
await store.deleteTask({ id: '123' });

// All mutations auto-refresh the collection
```

## Auto-Refresh

Mutations automatically reload the related collection on success:

```typescript
await store.createTask({ title: 'Task' });
// store.tasksValue() now includes the new task
```

## Signal Reference

| Feature | Signal Pattern |
|---------|----------------|
| Collection | `{name}Value`, `{name}IsLoading`, `{name}Error` |
| Params | `{name}Params`, `set{Name}Params` |
| Detail | `selected{Name}Id`, `{name}DetailValue`, `select{Name}` |
| Mutation | `{name}`, `{name}IsPending`, `{name}Result`, `{name}Error` |
