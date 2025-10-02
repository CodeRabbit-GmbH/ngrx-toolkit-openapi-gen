import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from '../tasks/task-list.component';
import { ProjectListComponent } from '../projects/project-list.component';
import { UserListComponent } from '../users/user-list.component';
import { FlightListComponent } from '../flights/flight-list.component';
import { PassengerListComponent } from '../passengers/passenger-list.component';
import { BookingListComponent } from '../bookings/booking-list.component';
import { AirportListComponent } from '../airports/airport-list.component';

type TabGroup = 'tasks-api' | 'flight-api';
type TasksApiTab = 'tasks' | 'projects' | 'users';
type FlightApiTab = 'flights' | 'passengers' | 'bookings' | 'airports';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TaskListComponent,
    ProjectListComponent,
    UserListComponent,
    FlightListComponent,
    PassengerListComponent,
    BookingListComponent,
    AirportListComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Navbar -->
      <div class="navbar bg-base-300 shadow-lg">
        <div class="flex-1">
          <span class="text-xl font-bold px-4">🚀 NgRx OpenAPI Generator</span>
        </div>
        <div class="flex-none">
          <span class="text-sm opacity-60 px-4">Signal Stores Demo</span>
        </div>
      </div>

      <!-- API Selector -->
      <div class="bg-base-200 px-4 py-2 border-b border-base-300">
        <div class="flex gap-2">
          <button
            class="btn btn-sm"
            [class.btn-primary]="activeGroup === 'tasks-api'"
            [class.btn-ghost]="activeGroup !== 'tasks-api'"
            (click)="setGroup('tasks-api')"
            data-testid="api-tasks"
          >
            📋 Tasks API
          </button>
          <button
            class="btn btn-sm"
            [class.btn-primary]="activeGroup === 'flight-api'"
            [class.btn-ghost]="activeGroup !== 'flight-api'"
            (click)="setGroup('flight-api')"
            data-testid="api-flight"
          >
            ✈️ Flight API
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-base-300 px-4">
        @if (activeGroup === 'tasks-api') {
          <div role="tablist" class="tabs tabs-bordered tabs-lg">
            <button
              role="tab"
              class="tab"
              [class.tab-active]="tasksTab === 'tasks'"
              (click)="tasksTab = 'tasks'"
              data-testid="nav-tasks"
            >
              ✅ Tasks
            </button>
            <button
              role="tab"
              class="tab"
              [class.tab-active]="tasksTab === 'projects'"
              (click)="tasksTab = 'projects'"
              data-testid="nav-projects"
            >
              📁 Projects
            </button>
            <button
              role="tab"
              class="tab"
              [class.tab-active]="tasksTab === 'users'"
              (click)="tasksTab = 'users'"
              data-testid="nav-users"
            >
              👥 Users
            </button>
          </div>
        } @else {
          <div role="tablist" class="tabs tabs-bordered tabs-lg">
            <button
              role="tab"
              class="tab"
              [class.tab-active]="flightTab === 'flights'"
              (click)="flightTab = 'flights'"
              data-testid="nav-flights"
            >
              ✈️ Flights
            </button>
            <button
              role="tab"
              class="tab"
              [class.tab-active]="flightTab === 'passengers'"
              (click)="flightTab = 'passengers'"
              data-testid="nav-passengers"
            >
              🧑‍✈️ Passengers
            </button>
            <button
              role="tab"
              class="tab"
              [class.tab-active]="flightTab === 'bookings'"
              (click)="flightTab = 'bookings'"
              data-testid="nav-bookings"
            >
              🎫 Bookings
            </button>
            <button
              role="tab"
              class="tab"
              [class.tab-active]="flightTab === 'airports'"
              (click)="flightTab = 'airports'"
              data-testid="nav-airports"
            >
              🛫 Airports
            </button>
          </div>
        }
      </div>

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <div class="max-w-4xl mx-auto">
          @if (activeGroup === 'tasks-api') {
            @switch (tasksTab) {
              @case ('tasks') {
                <app-task-list />
              }
              @case ('projects') {
                <app-project-list />
              }
              @case ('users') {
                <app-user-list />
              }
            }
          } @else {
            @switch (flightTab) {
              @case ('flights') {
                <app-flight-list />
              }
              @case ('passengers') {
                <app-passenger-list />
              }
              @case ('bookings') {
                <app-booking-list />
              }
              @case ('airports') {
                <app-airport-list />
              }
            }
          }
        </div>
      </main>

      <!-- Footer -->
      <footer class="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
          <p>Generated with <kbd class="kbd kbd-sm">ngrx-openapi-gen</kbd> • Double AST Approach</p>
        </aside>
      </footer>
    </div>
  `,
})
export class DashboardComponent {
  activeGroup: TabGroup = 'tasks-api';
  tasksTab: TasksApiTab = 'tasks';
  flightTab: FlightApiTab = 'flights';

  setGroup(group: TabGroup): void {
    this.activeGroup = group;
  }
}
