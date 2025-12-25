import {
  buildCollectionResource,
  buildDetailResource,
  buildWithResource,
} from './resource-builder';
import { OperationSpec } from '../../../spec';
import { BuilderContext } from '../types';

describe('resource-builder', () => {
  const mockContext: BuilderContext = {
    basePathToken: 'API_BASE_PATH',
    modelSuffix: 'Model',
    zodValidation: false,
    preferEntityNames: false,
    renderType: (schema: unknown) => {
      const s = schema as { type?: string; items?: { type?: string } };
      if (s?.type === 'array' && s.items?.type === 'string') {
        return 'Array<string>';
      }
      return s?.type || 'unknown';
    },
  };

  describe('buildCollectionResource', () => {
    it('builds resource for entity-based collection', () => {
      const op: OperationSpec = {
        operationId: 'getFlights',
        method: 'get',
        path: '/api/flights',
        kind: 'collection',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const result = buildCollectionResource(op, false, mockContext);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('flights');
      expect(result!.value).toContain('httpResource<FlightModel[]>');
      expect(result!.value).toContain('defaultValue: []');
    });

    it('builds resource with params when hasParams is true', () => {
      const op: OperationSpec = {
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

      const result = buildCollectionResource(op, true, mockContext);
      expect(result).not.toBeNull();
      expect(result!.value).toContain('params: store.flightsParams()');
    });

    it('builds resource for primitive array response', () => {
      const op: OperationSpec = {
        operationId: 'getAirports',
        method: 'get',
        path: '/api/airports',
        kind: 'collection',
        pathParams: [],
        queryParams: [],
        responseSchema: { type: 'array', items: { type: 'string' } },
        successStatusCodes: ['200'],
      };

      const result = buildCollectionResource(op, false, mockContext);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('getAirports');
      expect(result!.value).toContain('httpResource<Array<string>>');
    });

    it('returns null when no entity or responseSchema', () => {
      const op: OperationSpec = {
        operationId: 'getErrors',
        method: 'get',
        path: '/api/errors',
        kind: 'collection',
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const result = buildCollectionResource(op, false, mockContext);
      expect(result).toBeNull();
    });
  });

  describe('buildDetailResource', () => {
    it('builds detail resource with selection pattern', () => {
      const op: OperationSpec = {
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

      const result = buildDetailResource(op, mockContext);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('flightDetail');
      expect(result!.value).toContain('httpResource<FlightModel | undefined>');
      expect(result!.value).toContain('selectedFlightId');
      expect(result!.value).toContain('? undefined');
    });

    it('returns null when no entity', () => {
      const op: OperationSpec = {
        operationId: 'getItem',
        method: 'get',
        path: '/api/items/{id}',
        kind: 'detail',
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

      const result = buildDetailResource(op, mockContext);
      expect(result).toBeNull();
    });
  });

  describe('buildWithResource', () => {
    it('combines collection and detail resources', () => {
      const collectionOp: OperationSpec = {
        operationId: 'getFlights',
        method: 'get',
        path: '/api/flights',
        kind: 'collection',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const detailOp: OperationSpec = {
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

      const result = buildWithResource(
        [collectionOp],
        [detailOp],
        [],
        mockContext
      );
      expect(result).toContain('withResource((store) => ({');
      expect(result).toContain('flights: httpResource');
      expect(result).toContain('flightDetail: httpResource');
      expect(result).toContain('}))');
    });
  });
});
