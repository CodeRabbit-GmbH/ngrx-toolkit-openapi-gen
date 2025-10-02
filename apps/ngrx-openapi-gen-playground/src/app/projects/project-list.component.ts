import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../generated/tasks-api/project/application/project.store';
import { ProjectModel } from '../generated/tasks-api/project/entities/project.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">📁</div>
            <div>
              <h2 class="card-title text-2xl">Projects</h2>
              <p class="text-sm opacity-60">Organize your work</p>
            </div>
          </div>
          <div class="badge badge-secondary badge-lg" data-testid="project-count">{{ projects().length }} items</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addProject($event)" class="join w-full mb-6">
          <input
            type="text"
            placeholder="Add a new project..."
            class="input input-bordered join-item flex-1"
            [(ngModel)]="newProjectName"
            name="newProjectName"
            data-testid="new-project-input"
          />
          <button
            type="submit"
            class="btn btn-secondary join-item"
            [disabled]="!newProjectName"
            data-testid="add-project-button"
          >
            Add
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="project-loading">
            <span class="loading loading-spinner loading-lg text-secondary"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="project-error">
            <span>Error loading projects</span>
          </div>
        } @else if (projects().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="project-empty">
            <div class="text-5xl mb-4">📂</div>
            <p>No projects found</p>
          </div>
        } @else {
          <div class="space-y-3" data-testid="project-list">
            @for (project of projects(); track project.id) {
              <div class="entity-item flex flex-wrap items-center gap-4 p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors" [attr.data-testid]="'project-item-' + project.id">
                <!-- Status Badge -->
                <div
                  class="badge"
                  [class.badge-success]="project.status === 'active'"
                  [class.badge-warning]="project.status === 'draft'"
                  [class.badge-neutral]="project.status === 'archived'"
                >
                  {{ project.status | titlecase }}
                </div>

                <!-- Project Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold project-name">{{ project.name }}</div>
                  @if (project.description) {
                    <div class="text-sm opacity-60 truncate">{{ project.description }}</div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <select
                    class="select select-bordered select-sm"
                    [ngModel]="project.status"
                    (change)="updateProjectStatus(project, $event)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'project-status-' + project.id"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    class="btn btn-ghost btn-sm btn-square delete-btn"
                    (click)="deleteProject(project)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'delete-project-' + project.id"
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
export class ProjectListComponent {
  readonly store = inject(ProjectStore);

  newProjectName = '';

  readonly projects = this.store.projectsValue;
  readonly isLoading = this.store.projectsIsLoading;
  readonly hasError = computed(() => !!this.store.projectsError());
  readonly mutationPending = computed(() =>
    this.store.createProjectIsPending() ||
    this.store.updateProjectIsPending() ||
    this.store.deleteProjectIsPending()
  );

  async addProject(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newProjectName) return;

    await this.store.createProject({
      name: this.newProjectName,
      description: '',
      status: 'draft',
    });
    this.newProjectName = '';
  }

  async updateProjectStatus(project: ProjectModel, event: Event): Promise<void> {
    const newStatus = (event.target as HTMLSelectElement).value as 'active' | 'draft' | 'archived';
    await this.store.updateProject({
      id: project.id,
      body: { ...project, status: newStatus },
    });
  }

  async deleteProject(project: ProjectModel): Promise<void> {
    await this.store.deleteProject({ id: project.id });
  }
}
