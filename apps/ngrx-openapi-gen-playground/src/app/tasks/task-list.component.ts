import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStore } from '../generated/tasks-api/task/application/task.store';
import { TaskModel } from '../generated/tasks-api/task/entities/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">✅</div>
            <div>
              <h2 class="card-title text-2xl">Tasks</h2>
              <p class="text-sm opacity-60">Manage your task list</p>
            </div>
          </div>
          <div class="badge badge-primary badge-lg" data-testid="task-count">{{ tasks().length }} items</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addTask($event)" class="join w-full mb-6">
          <input
            type="text"
            placeholder="Add a new task..."
            class="input input-bordered join-item flex-1"
            [(ngModel)]="newTaskTitle"
            name="newTaskTitle"
            data-testid="new-task-input"
          />
          <button
            type="submit"
            class="btn btn-primary join-item"
            [disabled]="!newTaskTitle"
            data-testid="add-task-button"
          >
            Add
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="task-loading">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="task-error">
            <span>Error loading tasks</span>
          </div>
        } @else if (tasks().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="task-empty">
            <div class="text-5xl mb-4">📋</div>
            <p>No tasks found</p>
          </div>
        } @else {
          <div class="space-y-3" data-testid="task-list">
            @for (task of tasks(); track task.id) {
              <div class="entity-item flex flex-wrap items-center gap-4 p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors" [attr.data-testid]="'task-item-' + task.id">
                <!-- Status Dot -->
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  [class.bg-warning]="task.status === 'pending'"
                  [class.bg-info]="task.status === 'in_progress'"
                  [class.bg-success]="task.status === 'completed'"
                ></div>

                <!-- Task Info -->
                <div class="flex-1 min-w-0">
                  <div
                    class="font-semibold task-title"
                    [class.line-through]="task.status === 'completed'"
                    [class.opacity-50]="task.status === 'completed'"
                  >
                    {{ task.title }}
                  </div>
                  @if (task.description) {
                    <div class="text-sm opacity-60 truncate">{{ task.description }}</div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <select
                    class="select select-bordered select-sm"
                    [ngModel]="task.status"
                    (change)="updateTaskStatus(task, $event)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'task-status-' + task.id"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    class="btn btn-ghost btn-sm btn-square delete-btn"
                    (click)="deleteTask(task)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'delete-task-' + task.id"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TaskListComponent {
  readonly store = inject(TaskStore);

  newTaskTitle = '';

  readonly tasks = this.store.tasksValue;
  readonly isLoading = this.store.tasksIsLoading;
  readonly hasError = computed(() => !!this.store.tasksError());
  readonly mutationPending = computed(() =>
    this.store.createTaskIsPending() ||
    this.store.updateTaskIsPending() ||
    this.store.deleteTaskIsPending()
  );

  async addTask(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newTaskTitle) return;

    await this.store.createTask({
      title: this.newTaskTitle,
      description: '',
      status: 'pending',
    });
    this.newTaskTitle = '';
  }

  async updateTaskStatus(task: TaskModel, event: Event): Promise<void> {
    const newStatus = (event.target as HTMLSelectElement).value as 'pending' | 'in_progress' | 'completed';
    await this.store.updateTask({
      id: task.id,
      body: { ...task, status: newStatus },
    });
  }

  async deleteTask(task: TaskModel): Promise<void> {
    await this.store.deleteTask({ id: task.id });
  }
}
