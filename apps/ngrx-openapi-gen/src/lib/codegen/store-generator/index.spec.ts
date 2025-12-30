import { StoreGenerator } from './index';
import { DomainSpec, EntitySpec, OperationSpec } from '../../spec';

describe('StoreGenerator', () => {
  const generator = new StoreGenerator({
    basePathToken: 'FLIGHT_API_BASE_PATH',
  });

  const flightEntity: EntitySpec = {
    name: 'Flight',
    schemaRef: '#/components/schemas/Flight',
    kind: 'object',
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
      {
        name: 'status',
        location: 'query',
        schema: { type: 'string' },
        required: false,
      },
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
      {
        name: 'id',
        location: 'path',
        schema: { type: 'string' },
        required: true,
      },
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
      {
        name: 'id',
        location: 'path',
        schema: { type: 'string' },
        required: true,
      },
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
      expect(result.store.path).toBe('flight/application/flight.store.ts');
    });

    it('generates signalStoreFeature as a function declaration', () => {
      expect(result.store.content).toContain(
        'export function withFlights<_>()'
      );
      expect(result.store.content).toContain('return signalStoreFeature(');
    });

    it('generates store that calls the feature function', () => {
      expect(result.store.content).toContain(
        'export const FlightStore = signalStore('
      );
      expect(result.store.content).toContain('withFlights()');
    });

    it('imports from @ngrx/signals including signalStoreFeature', () => {
      expect(result.store.content).toContain("from '@ngrx/signals'");
      expect(result.store.content).toContain('signalStore');
      expect(result.store.content).toContain('signalStoreFeature');
      expect(result.store.content).toContain('withProps');
    });

    it('imports from @angular-architects/ngrx-toolkit', () => {
      expect(result.store.content).toContain(
        "from '@angular-architects/ngrx-toolkit'"
      );
      expect(result.store.content).toContain('withResource');
      expect(result.store.content).toContain('withMutations');
      expect(result.store.content).toContain('httpMutation');
    });

    it('imports httpResource from @angular/common/http', () => {
      expect(result.store.content).toContain("from '@angular/common/http'");
      expect(result.store.content).toContain('httpResource');
    });

    it('imports base path token', () => {
      expect(result.store.content).toContain(
        "import { FLIGHT_API_BASE_PATH } from '../../api-base-path.token'"
      );
    });

    it('imports entity model', () => {
      expect(result.store.content).toContain(
        "import type { FlightModel } from '../entities/flight.model'"
      );
    });

    it('generates withResource for collections', () => {
      expect(result.store.content).toContain('withResource((store) => ({');
      expect(result.store.content).toContain(
        'flights: httpResource<FlightModel[]>'
      );
    });

    it('generates withResource for detail operations', () => {
      // Detail resources use state-based selection pattern
      expect(result.store.content).toContain(
        'flightDetail: httpResource<FlightModel | undefined>'
      );
      expect(result.store.content).toContain(
        'selectedFlightId: undefined as string | undefined'
      );
    });

    it('generates withMutations for POST operations', () => {
      expect(result.store.content).toContain('withMutations((store) => ({');
      expect(result.store.content).toContain(
        'createFlight: httpMutation<FlightModel, FlightModel>({'
      );
      expect(result.store.content).toContain("method: 'POST'");
    });

    it('generates withMutations for DELETE operations', () => {
      expect(result.store.content).toContain('deleteFlight: httpMutation<');
      expect(result.store.content).toContain("method: 'DELETE'");
    });

    it('builds correct URL expressions', () => {
      // withProps provides _baseUrl as a direct value (no parentheses)
      expect(result.store.content).toContain('${store._baseUrl}/api/flights');
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
      expect(result.store.content).toContain('withState({');
      expect(result.store.content).toContain('flightsParams:');
    });

    it('uses params in httpResource', () => {
      expect(result.store.content).toContain('params: store.flightsParams()');
    });
  });

  describe('multiple collection operations for same entity', () => {
    const searchFlightsOp: OperationSpec = {
      operationId: 'searchFlights',
      method: 'get',
      path: '/api/flights/search',
      kind: 'collection',
      entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
      pathParams: [],
      queryParams: [
        {
          name: 'q',
          location: 'query',
          schema: { type: 'string' },
          required: false,
        },
      ],
      successStatusCodes: ['200'],
    };

    const domainWithTwoCollections: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [getFlightsOp, searchFlightsOp],
    };

    const result = generator.generateStore(domainWithTwoCollections);

    it('uses unique resource names per collection operation', () => {
      expect(result.store.content).toContain(
        'getFlights: httpResource<FlightModel[]>'
      );
      expect(result.store.content).toContain(
        'searchFlights: httpResource<FlightModel[]>'
      );
    });

    it('creates distinct state for each collection params', () => {
      expect(result.store.content).toContain('getFlightsParams');
      expect(result.store.content).toContain('searchFlightsParams');
      expect(result.store.content).toContain('setGetFlightsParams');
      expect(result.store.content).toContain('setSearchFlightsParams');
    });
  });

  describe('detail operation with multiple path params', () => {
    const getFlightLegOp: OperationSpec = {
      operationId: 'getFlightLeg',
      method: 'get',
      path: '/api/flights/{id}/legs/{legId}',
      kind: 'detail',
      entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
      pathParams: [
        {
          name: 'id',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
        {
          name: 'legId',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
      ],
      queryParams: [],
      successStatusCodes: ['200'],
    };

    const detailDomain: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [getFlightLegOp],
    };

    const result = generator.generateStore(detailDomain);

    it('stores selection params object for multi-path detail', () => {
      expect(result.store.content).toContain('selectedFlightParams');
      expect(result.store.content).toContain(
        'selectFlight(params: { id: string; legId: string } | undefined)'
      );
    });

    it('builds detail resource url using all path params', () => {
      expect(result.store.content).toContain(
        '${store._baseUrl}/api/flights/${params.id}/legs/${params.legId}'
      );
    });
  });

  describe('collection with query params and zodValidation', () => {
    const zodGenerator = new StoreGenerator({
      basePathToken: 'FLIGHT_API_BASE_PATH',
      zodValidation: true,
    });

    const domainWithParams: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [getFlightsOp],
    };

    const result = zodGenerator.generateStore(domainWithParams);

    it('generates separate schemas file', () => {
      expect(result.schemas).toBeDefined();
      expect(result.schemas?.path).toBe('flight/application/flight.schemas.ts');
      expect(result.schemas?.content).toContain("import { z } from 'zod'");
    });

    it('imports schemas in store', () => {
      expect(result.store.content).toContain("from './flight.schemas'");
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
      expect(result.store.content).not.toContain('withMutations');
    });

    it('does not import httpMutation', () => {
      expect(result.store.content).not.toContain('httpMutation');
    });
  });

  describe('domain without params', () => {
    const noParamsDomain: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [createFlightOp],
    };

    const result = generator.generateStore(noParamsDomain);

    it('does not generate schemas file when no params', () => {
      expect(result.schemas).toBeUndefined();
    });
  });

  describe('mutations only with zodValidation', () => {
    const zodMutationGenerator = new StoreGenerator({
      basePathToken: 'FLIGHT_API_BASE_PATH',
      zodValidation: true,
    });

    const mutationOnlyDomain: DomainSpec = {
      name: 'Flight',
      entities: [flightEntity],
      operations: [createFlightOp],
    };

    const result = zodMutationGenerator.generateStore(mutationOnlyDomain);

    it('does not import zod when no resources use it', () => {
      expect(result.store.content).not.toContain("from 'zod'");
    });
  });

  describe('sharedEntities option', () => {
    const sharedGenerator = new StoreGenerator({
      basePathToken: 'FLIGHT_API_BASE_PATH',
      sharedEntities: true,
    });

    const result = sharedGenerator.generateStore(flightDomain);

    it('imports models from shared folder', () => {
      expect(result.store.content).toContain(
        "from '../shared/entities/flight.model'"
      );
    });

    it('places store at domain root without application folder', () => {
      expect(result.store.path).toBe('flight/flight.store.ts');
    });
  });
});
