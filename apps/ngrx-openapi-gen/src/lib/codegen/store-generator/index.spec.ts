import { StoreGenerator } from './index';
import { DomainSpec, EntitySpec, OperationSpec } from '../../spec';

describe('StoreGenerator', () => {
  const generator = new StoreGenerator({
    basePathToken: 'FLIGHT_API_BASE_PATH',
  });

  const flightEntity: EntitySpec = {
    name: 'Flight',
    schemaRef: '#/components/schemas/Flight',
    primaryKey: 'id',
    properties: [
      { name: 'id', schema: { type: 'string' }, optional: false },
      { name: 'number', schema: { type: 'string' }, optional: false },
    ],
  };

  const getFlightsOp: OperationSpec = {
    operationId: 'getFlights',
    method: 'get',
    path: '/api/flights',
    kind: 'collection',
    entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
    pathParams: [],
    queryParams: [
      { name: 'status', location: 'query', schema: { type: 'string' }, required: false },
    ],
    successStatusCodes: ['200'],
  };

  const getFlightOp: OperationSpec = {
    operationId: 'getFlight',
    method: 'get',
    path: '/api/flights/{id}',
    kind: 'detail',
    entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
    pathParams: [
      { name: 'id', location: 'path', schema: { type: 'string' }, required: true },
    ],
    queryParams: [],
    successStatusCodes: ['200'],
  };

  const createFlightOp: OperationSpec = {
    operationId: 'createFlight',
    method: 'post',
    path: '/api/flights',
    kind: 'mutation',
    entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
    pathParams: [],
    queryParams: [],
    requestBody: { $ref: '#/components/schemas/Flight' },
    successStatusCodes: ['201'],
  };

  const deleteFlightOp: OperationSpec = {
    operationId: 'deleteFlight',
    method: 'delete',
    path: '/api/flights/{id}',
    kind: 'mutation',
    entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
    pathParams: [
      { name: 'id', location: 'path', schema: { type: 'string' }, required: true },
    ],
    queryParams: [],
    successStatusCodes: ['204'],
  };

  const flightDomain: DomainSpec = {
    name: 'Flight',
    entities: [flightEntity],
    operations: [getFlightsOp, getFlightOp, createFlightOp, deleteFlightOp],
  };

  describe('generateStore', () => {
    const result = generator.generateStore(flightDomain);

    it('generates correct file path', () => {
      expect(result.path).toBe('flight/application/flight.store.ts');
    });

    it('generates store with correct name', () => {
      expect(result.content).toContain('export const FlightStore = signalStore(');
    });

    it('imports from @ngrx/signals', () => {
      expect(result.content).toContain("from '@ngrx/signals'");
      expect(result.content).toContain('signalStore');
      expect(result.content).toContain('withProps');
    });

    it('imports from @angular-architects/ngrx-toolkit', () => {
      expect(result.content).toContain("from '@angular-architects/ngrx-toolkit'");
      expect(result.content).toContain('withResource');
      expect(result.content).toContain('withMutations');
      expect(result.content).toContain('httpMutation');
    });

    it('imports httpResource from @angular/common/http', () => {
      expect(result.content).toContain("from '@angular/common/http'");
      expect(result.content).toContain('httpResource');
    });

    it('imports base path token', () => {
      expect(result.content).toContain("import { FLIGHT_API_BASE_PATH } from '../../api-base-path.token'");
    });

    it('imports entity model', () => {
      expect(result.content).toContain("import type { FlightModel } from '../entities/flight.model'");
    });

    it('generates withResource for collections', () => {
      expect(result.content).toContain('withResource((store) => ({');
      expect(result.content).toContain('flights: httpResource<FlightModel[]>');
    });

    it('generates withResource for detail operations', () => {
      // Detail resources use state-based selection pattern
      expect(result.content).toContain('flightDetail: httpResource<FlightModel | undefined>');
      expect(result.content).toContain('selectedFlightId: undefined as string | undefined');
    });

    it('generates withMutations for POST operations', () => {
      expect(result.content).toContain('withMutations((store) => ({');
      expect(result.content).toContain('createFlight: httpMutation<FlightModel, FlightModel>({');
      expect(result.content).toContain("method: 'POST'");
    });

    it('generates withMutations for DELETE operations', () => {
      expect(result.content).toContain('removeFlight: httpMutation<');
      expect(result.content).toContain("method: 'DELETE'");
    });

    it('builds correct URL expressions', () => {
      // withProps provides _baseUrl as a direct value (no parentheses)
      expect(result.content).toContain('${store._baseUrl}/api/flights');
    });
  });

  describe('collection with query params', () => {
    const domainWithParams: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [getFlightsOp],
    };

    const result = generator.generateStore(domainWithParams);

    it('generates withState for query params', () => {
      expect(result.content).toContain('withState({');
      expect(result.content).toContain('flightsParams:');
    });

    it('uses params in httpResource', () => {
      expect(result.content).toContain('params: store.flightsParams()');
    });
  });

  describe('domain without mutations', () => {
    const readOnlyDomain: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [getFlightsOp, getFlightOp],
    };

    const result = generator.generateStore(readOnlyDomain);

    it('does not include withMutations', () => {
      expect(result.content).not.toContain('withMutations');
    });

    it('does not import httpMutation', () => {
      expect(result.content).not.toContain('httpMutation');
    });
  });
});

