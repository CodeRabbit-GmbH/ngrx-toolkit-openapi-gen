import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AirportStore } from '../generated/flight-api/airport/application/airport.store';

@Component({
  selector: 'app-airport-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">🛫</div>
            <div>
              <h2 class="card-title text-2xl">Airports</h2>
              <p class="text-sm opacity-60">Airport codes</p>
            </div>
          </div>
          <div class="badge badge-info badge-lg" data-testid="airport-count">{{ airports().length }} airports</div>
        </div>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="airport-loading">
            <span class="loading loading-spinner loading-lg text-info"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="airport-error">
            <span>Error loading airports</span>
          </div>
        } @else if (airports().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="airport-empty">
            <div class="text-5xl mb-4">✈️</div>
            <p>No airports found</p>
          </div>
        } @else {
          <div class="flex flex-wrap gap-2" data-testid="airport-list">
            @for (airport of airports(); track airport) {
              <div class="badge badge-lg badge-outline" [attr.data-testid]="'airport-item-' + airport">
                {{ airport }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AirportListComponent {
  readonly store = inject(AirportStore);

  readonly airports = this.store.getApiAirportValue;
  readonly isLoading = this.store.getApiAirportIsLoading;
  readonly hasError = computed(() => !!this.store.getApiAirportError());
}

