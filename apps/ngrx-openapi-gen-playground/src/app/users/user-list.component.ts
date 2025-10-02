import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserStore } from '../generated/tasks-api/user/application/user.store';
import { UserModel } from '../generated/tasks-api/user/entities/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">👥</div>
            <div>
              <h2 class="card-title text-2xl">Users</h2>
              <p class="text-sm opacity-60">Team members</p>
            </div>
          </div>
          <div class="badge badge-accent badge-lg" data-testid="user-count">{{ users().length }} members</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addUser($event)" class="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            placeholder="Name"
            class="input input-bordered flex-1"
            [(ngModel)]="newUserName"
            name="newUserName"
            data-testid="new-user-name-input"
          />
          <input
            type="email"
            placeholder="Email"
            class="input input-bordered flex-1"
            [(ngModel)]="newUserEmail"
            name="newUserEmail"
            data-testid="new-user-email-input"
          />
          <button
            type="submit"
            class="btn btn-accent"
            [disabled]="!newUserName || !newUserEmail"
            data-testid="add-user-button"
          >
            Add User
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="user-loading">
            <span class="loading loading-spinner loading-lg text-accent"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="user-error">
            <span>Error loading users</span>
          </div>
        } @else if (users().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="user-empty">
            <div class="text-5xl mb-4">👤</div>
            <p>No users found</p>
          </div>
        } @else {
          <div class="space-y-3" data-testid="user-list">
            @for (user of users(); track user.id) {
              <div class="entity-item flex flex-wrap items-center gap-4 p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors" [attr.data-testid]="'user-item-' + user.id">
                <!-- Avatar -->
                <div class="flex-shrink-0">
                  @if (user.avatarUrl) {
                    <img 
                      [src]="user.avatarUrl" 
                      [alt]="user.name"
                      class="w-12 h-12 rounded-full object-cover ring-2 ring-primary ring-offset-base-100 ring-offset-2"
                    />
                  } @else {
                    <div class="w-12 h-12 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                      <span class="text-sm font-semibold">{{ getInitials(user.name) }}</span>
                    </div>
                  }
                </div>

                <!-- User Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold user-name">{{ user.name }}</div>
                  <div class="text-sm opacity-60 truncate user-email">{{ user.email }}</div>
                </div>

                <!-- Role Badge -->
                <div
                  class="badge hidden sm:flex"
                  [class.badge-error]="user.role === 'admin'"
                  [class.badge-info]="user.role === 'member'"
                  [class.badge-neutral]="user.role === 'viewer'"
                >
                  {{ (user.role || 'member') | titlecase }}
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <select
                    class="select select-bordered select-sm"
                    [ngModel]="user.role"
                    (change)="updateUserRole(user, $event)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'user-role-' + user.id"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    class="btn btn-ghost btn-sm btn-square delete-btn"
                    (click)="deleteUser(user)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'delete-user-' + user.id"
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
export class UserListComponent {
  readonly store = inject(UserStore);

  newUserName = '';
  newUserEmail = '';

  readonly users = this.store.usersValue;
  readonly isLoading = this.store.usersIsLoading;
  readonly hasError = computed(() => !!this.store.usersError());
  readonly mutationPending = computed(() =>
    this.store.createUserIsPending() ||
    this.store.updateUserIsPending() ||
    this.store.deleteUserIsPending()
  );

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  async addUser(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newUserName || !this.newUserEmail) return;

    // Generate random avatar from placeholder service
    const avatarId = Math.floor(Math.random() * 70) + 1;
    const avatarUrl = `https://i.pravatar.cc/150?img=${avatarId}`;

    await this.store.createUser({
      name: this.newUserName,
      email: this.newUserEmail,
      role: 'member',
      avatarUrl,
    });
    this.newUserName = '';
    this.newUserEmail = '';
  }

  async updateUserRole(user: UserModel, event: Event): Promise<void> {
    const newRole = (event.target as HTMLSelectElement).value as 'admin' | 'member' | 'viewer';
    await this.store.updateUser({
      id: user.id,
      body: { ...user, role: newRole },
    });
  }

  async deleteUser(user: UserModel): Promise<void> {
    await this.store.deleteUser({ id: user.id });
  }
}
