import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PassengerStore } from '../generated/flight-api/passenger/application/passenger.store';
import { PassengerModel } from '../generated/flight-api/passenger/entities/passenger.model';

@Component({
  selector: 'app-passenger-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">🧑‍✈️</div>
            <div>
              <h2 class="card-title text-2xl">Passengers</h2>
              <p class="text-sm opacity-60">Manage passenger records</p>
            </div>
          </div>
          <div class="badge badge-primary badge-lg" data-testid="passenger-count">{{ passengers().length }} passengers</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addPassenger($event)" class="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            placeholder="First name"
            class="input input-bordered flex-1 min-w-24"
            [(ngModel)]="newFirstName"
            name="newFirstName"
            data-testid="new-passenger-firstname"
          />
          <input
            type="text"
            placeholder="Last name"
            class="input input-bordered flex-1 min-w-24"
            [(ngModel)]="newName"
            name="newName"
            data-testid="new-passenger-name"
          />
          <select
            class="select select-bordered"
            [(ngModel)]="newStatus"
            name="newStatus"
            data-testid="new-passenger-status"
          >
            <option value="Standard">Standard</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
          </select>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!newFirstName || !newName"
            data-testid="add-passenger-button"
          >
            Add Passenger
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="passenger-loading">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="passenger-error">
            <span>Error loading passengers</span>
          </div>
        } @else if (passengers().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="passenger-empty">
            <div class="text-5xl mb-4">🧑‍✈️</div>
            <p>No passengers found</p>
          </div>
        } @else {
          <div class="space-y-3" data-testid="passenger-list">
            @for (passenger of passengers(); track passenger.id) {
              <div class="flex flex-wrap items-center gap-4 p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors" [attr.data-testid]="'passenger-item-' + passenger.id">
                <!-- Avatar -->
                <div class="avatar placeholder">
                  <div class="w-12 h-12 rounded-full bg-neutral text-neutral-content">
                    <span>{{ getInitials(passenger) }}</span>
                  </div>
                </div>

                <!-- Passenger Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold passenger-name">{{ passenger.firstName }} {{ passenger.name }}</div>
                  <div class="text-sm opacity-60">{{ passenger.bonusMiles?.toLocaleString() }} bonus miles</div>
                </div>

                <!-- Status Badge -->
                <div
                  class="badge"
                  [class.badge-warning]="passenger.passengerStatus === 'Gold'"
                  [class.badge-secondary]="passenger.passengerStatus === 'Silver'"
                  [class.badge-ghost]="passenger.passengerStatus === 'Standard'"
                >
                  {{ passenger.passengerStatus }}
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <select
                    class="select select-bordered select-sm"
                    [ngModel]="passenger.passengerStatus"
                    (change)="updateStatus(passenger, $event)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'passenger-status-' + passenger.id"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                  </select>
                  <button
                    class="btn btn-ghost btn-sm btn-square delete-btn"
                    (click)="deletePassenger(passenger)"
                    [disabled]="mutationPending()"
                    [attr.data-testid]="'delete-passenger-' + passenger.id"
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
export class PassengerListComponent {
  readonly store = inject(PassengerStore);

  newFirstName = '';
  newName = '';
  newStatus = 'Standard';

  readonly passengers = this.store.passengersValue;
  readonly isLoading = this.store.passengersIsLoading;
  readonly hasError = computed(() => !!this.store.passengersError());
  readonly mutationPending = computed(() =>
    this.store.createPassengerIsPending() ||
    this.store.updatePassengerIsPending() ||
    this.store.removePassengerIsPending()
  );

  async addPassenger(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newFirstName || !this.newName) return;

    await this.store.createPassenger({
      firstName: this.newFirstName,
      name: this.newName,
      passengerStatus: this.newStatus,
      bonusMiles: 0,
    });
    this.newFirstName = '';
    this.newName = '';
    this.newStatus = 'Standard';
  }

  async updateStatus(passenger: PassengerModel, event: Event): Promise<void> {
    if (!passenger.id) return;
    const newStatus = (event.target as HTMLSelectElement).value;
    await this.store.updatePassenger({
      id: passenger.id,
      body: { ...passenger, passengerStatus: newStatus },
    });
  }

  async deletePassenger(passenger: PassengerModel): Promise<void> {
    if (!passenger.id) return;
    await this.store.removePassenger({ id: passenger.id });
  }

  getInitials(passenger: PassengerModel): string {
    const first = passenger.firstName?.charAt(0) || '';
    const last = passenger.name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }
}

