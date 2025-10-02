import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingStore } from '../generated/flight-api/booking/application/booking.store';
import { FlightStore } from '../generated/flight-api/flight/application/flight.store';
import { PassengerStore } from '../generated/flight-api/passenger/application/passenger.store';
import { FlightBookingModel } from '../generated/flight-api/booking/entities/flight-booking.model';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="text-3xl">🎫</div>
            <div>
              <h2 class="card-title text-2xl">Bookings</h2>
              <p class="text-sm opacity-60">Manage flight bookings</p>
            </div>
          </div>
          <div class="badge badge-primary badge-lg" data-testid="booking-count">{{ bookings().length }} bookings</div>
        </div>

        <!-- Add Form -->
        <form (submit)="addBooking($event)" class="flex flex-wrap gap-2 mb-6">
          <select
            class="select select-bordered flex-1 min-w-32"
            [(ngModel)]="selectedPassengerId"
            name="selectedPassengerId"
            data-testid="new-booking-passenger"
          >
            <option [ngValue]="null" disabled>Select Passenger</option>
            @for (p of passengers(); track p.id) {
              <option [ngValue]="p.id">{{ p.firstName }} {{ p.name }}</option>
            }
          </select>
          <select
            class="select select-bordered flex-1 min-w-32"
            [(ngModel)]="selectedFlightId"
            name="selectedFlightId"
            data-testid="new-booking-flight"
          >
            <option [ngValue]="null" disabled>Select Flight</option>
            @for (f of flights(); track f.id) {
              <option [ngValue]="f.id">{{ f.from }} → {{ f.to }}</option>
            }
          </select>
          <select
            class="select select-bordered"
            [(ngModel)]="selectedClass"
            name="selectedClass"
            data-testid="new-booking-class"
          >
            <option [ngValue]="1">First Class</option>
            <option [ngValue]="2">Business</option>
            <option [ngValue]="3">Economy</option>
          </select>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!selectedPassengerId || !selectedFlightId"
            data-testid="add-booking-button"
          >
            Book Flight
          </button>
        </form>

        <div class="divider"></div>

        <!-- Content -->
        @if (isLoading()) {
          <div class="flex justify-center py-12" data-testid="booking-loading">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        } @else if (hasError()) {
          <div class="alert alert-error" data-testid="booking-error">
            <span>Error loading bookings</span>
          </div>
        } @else if (bookings().length === 0) {
          <div class="text-center py-12 opacity-60" data-testid="booking-empty">
            <div class="text-5xl mb-4">🎫</div>
            <p>No bookings found</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="table" data-testid="booking-list">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Flight</th>
                  <th>Class</th>
                  <th>Seat</th>
                  <th>Booked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (booking of bookings(); track booking.id) {
                  <tr class="hover" [attr.data-testid]="'booking-item-' + booking.id">
                    <td>
                      <div class="font-semibold booking-passenger">{{ getPassengerName(booking.passengerId) }}</div>
                    </td>
                    <td>
                      <div class="booking-flight">{{ getFlightRoute(booking.flightId) }}</div>
                    </td>
                    <td>
                      <span class="badge" [class]="getClassBadge(booking.flightClass)">
                        {{ getClassName(booking.flightClass) }}
                      </span>
                    </td>
                    <td>
                      <span class="font-mono">{{ booking.seat }}</span>
                    </td>
                    <td>
                      <span class="text-sm">{{ formatDate(booking.bookingDate) }}</span>
                    </td>
                    <td>
                      <button
                        class="btn btn-ghost btn-xs delete-btn"
                        (click)="deleteBooking(booking)"
                        [disabled]="mutationPending()"
                        [attr.data-testid]="'delete-booking-' + booking.id"
                      >
                        🗑️
                      </button>
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
export class BookingListComponent {
  readonly bookingStore = inject(BookingStore);
  readonly flightStore = inject(FlightStore);
  readonly passengerStore = inject(PassengerStore);

  selectedPassengerId: number | null = null;
  selectedFlightId: number | null = null;
  selectedClass = 2;

  readonly bookings = this.bookingStore.flightBookingsValue;
  readonly flights = this.flightStore.flightsValue;
  readonly passengers = this.passengerStore.passengersValue;
  readonly isLoading = this.bookingStore.flightBookingsIsLoading;
  readonly hasError = computed(() => !!this.bookingStore.flightBookingsError());
  readonly mutationPending = computed(() =>
    this.bookingStore.createFlightBookingIsPending() ||
    this.bookingStore.updateFlightBookingIsPending() ||
    this.bookingStore.removeFlightBookingIsPending()
  );

  async addBooking(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.selectedPassengerId || !this.selectedFlightId) return;

    await this.bookingStore.createFlightBooking({
      passengerId: this.selectedPassengerId,
      flightId: this.selectedFlightId,
      flightClass: this.selectedClass,
    });
    this.selectedPassengerId = null;
    this.selectedFlightId = null;
    this.selectedClass = 2;
  }

  async deleteBooking(booking: FlightBookingModel): Promise<void> {
    if (!booking.id) return;
    await this.bookingStore.removeFlightBooking({ id: booking.id });
  }

  getPassengerName(passengerId: number | undefined): string {
    if (!passengerId) return 'Unknown';
    const p = this.passengers().find(x => x.id === passengerId);
    return p ? `${p.firstName} ${p.name}` : `Passenger #${passengerId}`;
  }

  getFlightRoute(flightId: number | undefined): string {
    if (!flightId) return 'Unknown';
    const f = this.flights().find(x => x.id === flightId);
    return f ? `${f.from} → ${f.to}` : `Flight #${flightId}`;
  }

  getClassName(flightClass: number | undefined): string {
    switch (flightClass) {
      case 1: return 'First';
      case 2: return 'Business';
      case 3: return 'Economy';
      default: return 'Unknown';
    }
  }

  getClassBadge(flightClass: number | undefined): string {
    switch (flightClass) {
      case 1: return 'badge-warning';
      case 2: return 'badge-info';
      default: return 'badge-ghost';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}

