import { resolve } from 'path';
import { Generator, GeneratedFile } from './generator';
import { loadOpenApiDocument } from './openapi-loader';
import { OpenApiDocument } from './parser';

const fixturesDir = resolve(__dirname, '../__fixtures__');

describe('Generator', () => {
  const generator = new Generator({
    apiName: 'FlightApi',
    basePathToken: 'FLIGHT_API_BASE_PATH',
  });

  describe('generate', () => {
    let doc: OpenApiDocument;
    let files: GeneratedFile[];

    beforeAll(async () => {
      doc = await loadOpenApiDocument(
        resolve(fixturesDir, 'simple-flight.yaml')
      );
      files = generator.generate(doc);
    });

    it('generates base path token file in API folder', () => {
      const tokenFile = files.find(
        (f) => f.path === 'flight-api/api-base-path.token.ts'
      );
      expect(tokenFile).toBeDefined();
      expect(tokenFile?.content).toContain('InjectionToken');
      expect(tokenFile?.content).toContain('FLIGHT_API_BASE_PATH');
    });

    it('generates entity models for Flight domain', () => {
      const flightModel = files.find(
        (f) => f.path === 'flight-api/flight/entities/flight.model.ts'
      );
      expect(flightModel).toBeDefined();
      expect(flightModel?.content).toContain('export interface FlightModel');
      expect(flightModel?.content).toContain('id: string;');
      expect(flightModel?.content).toContain(
        "status: 'scheduled' | 'delayed';"
      );
    });

    it('generates entity models for Booking domain', () => {
      const bookingModel = files.find(
        (f) => f.path === 'flight-api/booking/entities/booking.model.ts'
      );
      expect(bookingModel).toBeDefined();
      expect(bookingModel?.content).toContain('export interface BookingModel');
    });

    it('generates store for Flight domain', () => {
      const flightStore = files.find(
        (f) => f.path === 'flight-api/flight/application/flight.store.ts'
      );
      expect(flightStore).toBeDefined();
      expect(flightStore?.content).toContain(
        'export const FlightStore = signalStore('
      );
    });

    it('generates store for Booking domain', () => {
      const bookingStore = files.find(
        (f) => f.path === 'flight-api/booking/application/booking.store.ts'
      );
      expect(bookingStore).toBeDefined();
      expect(bookingStore?.content).toContain(
        'export const BookingStore = signalStore('
      );
    });

    it('flight store uses withResource for collection', () => {
      const flightStore = files.find(
        (f) => f.path === 'flight-api/flight/application/flight.store.ts'
      );
      expect(flightStore?.content).toContain('withResource');
      expect(flightStore?.content).toContain('httpResource<FlightModel[]>');
    });

    it('flight store uses withMutations for create/delete', () => {
      const flightStore = files.find(
        (f) => f.path === 'flight-api/flight/application/flight.store.ts'
      );
      expect(flightStore?.content).toContain('withMutations');
      expect(flightStore?.content).toContain('httpMutation');
      expect(flightStore?.content).toContain('createFlight');
      // DELETE operations use operationId since response is void (no entity)
      expect(flightStore?.content).toContain('deleteFlight');
    });

    it('flight store imports from ngrx-toolkit', () => {
      const flightStore = files.find(
        (f) => f.path === 'flight-api/flight/application/flight.store.ts'
      );
      expect(flightStore?.content).toContain(
        "from '@angular-architects/ngrx-toolkit'"
      );
    });

    it('generates detail resource for getFlight', () => {
      const flightStore = files.find(
        (f) => f.path === 'flight-api/flight/application/flight.store.ts'
      );
      // Detail resources use state-based selection pattern
      expect(flightStore?.content).toContain('flightDetail');
      expect(flightStore?.content).toContain('selectedFlightId');
    });
  });

  describe('parseDocument', () => {
    it('returns ApiSpec for debugging', async () => {
      const doc = await loadOpenApiDocument(
        resolve(fixturesDir, 'simple-flight.yaml')
      );
      const spec = generator.parseDocument(doc);

      expect(spec.apiName).toBe('FlightApi');
      expect(spec.basePathToken).toBe('FLIGHT_API_BASE_PATH');
      expect(spec.domains.length).toBeGreaterThan(0);
    });
  });
});

describe('Generator with CRUD fixture', () => {
  const generator = new Generator({
    apiName: 'TaskApi',
  });

  let doc: OpenApiDocument;
  let files: GeneratedFile[];

  beforeAll(async () => {
    doc = await loadOpenApiDocument(resolve(fixturesDir, 'crud.yaml'));
    files = generator.generate(doc);
  });

  it('generates all CRUD operations', () => {
    const taskStore = files.find(
      (f) => f.path === 'task-api/task/application/task.store.ts'
    );
    expect(taskStore).toBeDefined();

    // Collection (GET /tasks)
    expect(taskStore?.content).toContain('tasks: httpResource<TaskModel[]>');

    // Detail (GET /tasks/{id}) - uses state-based selection pattern
    expect(taskStore?.content).toContain('taskDetail');
    expect(taskStore?.content).toContain('selectedTaskId');

    // Create (POST /tasks)
    expect(taskStore?.content).toContain('createTask');

    // Update (PUT /tasks/{id})
    expect(taskStore?.content).toContain('updateTask');

    // Delete (DELETE /tasks/{id}) - uses operationId since response is void
    expect(taskStore?.content).toContain('deleteTask');
  });

  it('handles query parameters in collection', () => {
    const taskStore = files.find(
      (f) => f.path === 'task-api/task/application/task.store.ts'
    );
    expect(taskStore?.content).toContain('withState');
    expect(taskStore?.content).toContain('tasksParams');
  });
});

describe('Generator with primitive array fixture', () => {
  const generator = new Generator({
    apiName: 'PrimitiveApi',
  });

  let doc: OpenApiDocument;
  let files: GeneratedFile[];

  beforeAll(async () => {
    doc = await loadOpenApiDocument(
      resolve(fixturesDir, 'primitive-array.yaml')
    );
    files = generator.generate(doc);
  });

  it('generates store for Airport domain with primitive string array', () => {
    const airportStore = files.find(
      (f) => f.path === 'primitive-api/airport/application/airport.store.ts'
    );
    expect(airportStore).toBeDefined();
    expect(airportStore?.content).toContain(
      'export const AirportStore = signalStore('
    );
  });

  it('Airport store uses httpResource with Array<string> type', () => {
    const airportStore = files.find(
      (f) => f.path === 'primitive-api/airport/application/airport.store.ts'
    );
    expect(airportStore?.content).toContain('httpResource<Array<string>>');
    expect(airportStore?.content).toContain('getAirports');
  });

  it('generates store for Category domain with primitive number array', () => {
    const categoryStore = files.find(
      (f) => f.path === 'primitive-api/category/application/category.store.ts'
    );
    expect(categoryStore).toBeDefined();
    expect(categoryStore?.content).toContain('httpResource<Array<number>>');
    expect(categoryStore?.content).toContain('getCategories');
  });

  it('does not generate entity models for primitive arrays', () => {
    const airportModel = files.find((f) => f.path.includes('airport/entities'));
    expect(airportModel).toBeUndefined();
  });
});
