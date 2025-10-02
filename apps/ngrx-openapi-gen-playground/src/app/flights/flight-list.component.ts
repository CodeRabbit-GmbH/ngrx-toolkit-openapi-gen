import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlightStore } from '../generated/flight-api/flight/application/flight.store';
import { FlightModel } from '../generated/flight-api/flight/entities/flight.model';

@Component({
  selector: 'app-flight-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">✈️</div>
            <div>
              <h2 class="card-title text-2xl">Flights</h2>
              <p class="text-sm opacity-60">Manage flight schedule</p>
            </div>
          </div>
          <div class="badge badge-primary badge-lg" data-testid="flight-count">{{ flights().length }} flights</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addFlight($event)" class="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            placeholder="From"
            class="input input-bordered flex-1 min-w-24"
            [(ngModel)]="newFlightFrom"
            name="newFlightFrom"
            data-testid="new-flight-from"
          />
          <input
            type="text"
            placeholder="To"
            class="input input-bordered flex-1 min-w-24"
            [(ngModel)]="newFlightTo"
            name="newFlightTo"
            data-testid="new-flight-to"
          />
          <input
            type="datetime-local"
            class="input input-bordered"
            [(ngModel)]="newFlightDate"
            name="newFlightDate"
            data-testid="new-flight-date"
          />
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!newFlightFrom || !newFlightTo"
            data-testid="add-flight-button"
          >
            Add Flight
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="flight-loading">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="flight-error">
            <span>Error loading flights</span>
          </div>
        } @else if (flights().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="flight-empty">
            <div class="text-5xl mb-4">✈️</div>
            <p>No flights found</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="table" data-testid="flight-list">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (flight of flights(); track flight.id) {
                  <tr class="hover" [attr.data-testid]="'flight-item-' + flight.id">
                    <td>
                      <div class="font-semibold flight-route">{{ flight.from }} → {{ flight.to }}</div>
                    </td>
                    <td>
                      <span class="text-sm">{{ formatDate(flight.date) }}</span>
                    </td>
                    <td>
                      <span
                        class="badge"
                        [class.badge-warning]="flight.delayed"
                        [class.badge-success]="!flight.delayed"
                      >
                        {{ flight.delayed ? 'Delayed' : 'On Time' }}
                      </span>
                    </td>
                    <td>
                      <div class="flex gap-2">
                        <button
                          class="btn btn-ghost btn-xs"
                          (click)="toggleDelay(flight)"
                          [disabled]="mutationPending()"
                          [attr.data-testid]="'toggle-delay-' + flight.id"
                        >
                          {{ flight.delayed ? '✅' : '⏰' }}
                        </button>
                        <button
                          class="btn btn-ghost btn-xs delete-btn"
                          (click)="deleteFlight(flight)"
                          [disabled]="mutationPending()"
                          [attr.data-testid]="'delete-flight-' + flight.id"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class FlightListComponent {
  readonly store = inject(FlightStore);

  newFlightFrom = '';
  newFlightTo = '';
  newFlightDate = '';

  readonly flights = this.store.flightsValue;
  readonly isLoading = this.store.flightsIsLoading;
  readonly hasError = computed(() => !!this.store.flightsError());
  readonly mutationPending = computed(() =>
    this.store.createFlightIsPending() ||
    this.store.updateFlightIsPending() ||
    this.store.removeFlightIsPending()
  );

  async addFlight(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newFlightFrom || !this.newFlightTo) return;

    await this.store.createFlight({
      from: this.newFlightFrom,
      to: this.newFlightTo,
      date: this.newFlightDate ? new Date(this.newFlightDate).toISOString() : new Date().toISOString(),
      delayed: false,
    });
    this.newFlightFrom = '';
    this.newFlightTo = '';
    this.newFlightDate = '';
  }

  async toggleDelay(flight: FlightModel): Promise<void> {
    if (!flight.id) return;
    await this.store.updateFlight({
      id: flight.id,
      body: { ...flight, delayed: !flight.delayed },
    });
  }

  async deleteFlight(flight: FlightModel): Promise<void> {
    if (!flight.id) return;
    await this.store.removeFlight({ id: flight.id });
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
}

