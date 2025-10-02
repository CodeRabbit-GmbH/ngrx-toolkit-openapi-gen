import { buildStateProperties, buildWithState } from './state-builder';
import { OperationSpec } from '../../../spec';
import { BuilderContext } from '../types';

describe('state-builder', () => {
  const mockContext: BuilderContext = {
    basePathToken: 'API_BASE_PATH',
    modelSuffix: 'Model',
    renderType: (schema: unknown) => {
      const s = schema as { type?: string };
      return s?.type === 'number' ? 'number' : 'string';
    },
  };

  describe('buildStateProperties', () => {
    it('returns empty array when no operations', () => {
      const result = buildStateProperties([], [], mockContext);
      expect(result).toEqual([]);
    });

    it('builds params state for collections with query params', () => {
      const collectionOp: OperationSpec = {
        operationId: 'getFlights',
        method: 'get',
        path: '/api/flights',
        kind: 'collection',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [
          { name: 'status', location: 'query', schema: { type: 'string' }, required: false },
          { name: 'limit', location: 'query', schema: { type: 'number' }, required: false },
        ],
        successStatusCodes: ['200'],
      };

      const result = buildStateProperties([collectionOp], [], mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('flightsParams');
      expect(result[0].value).toContain('status?:');
      expect(result[0].value).toContain('limit?:');
    });

    it('builds selection state for detail operations', () => {
      const detailOp: OperationSpec = {
        operationId: 'getFlight',
        method: 'get',
        path: '/api/flights/{id}',
        kind: 'detail',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const result = buildStateProperties([], [detailOp], mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('selectedFlightId');
      expect(result[0].value).toContain('undefined as string | undefined');
    });

    it('skips operations without entity', () => {
      const opWithoutEntity: OperationSpec = {
        operationId: 'getItems',
        method: 'get',
        path: '/api/items',
        kind: 'collection',
        pathParams: [],
        queryParams: [{ name: 'page', location: 'query', schema: { type: 'number' }, required: false }],
        successStatusCodes: ['200'],
      };

      const result = buildStateProperties([opWithoutEntity], [], mockContext);
      expect(result).toEqual([]);
    });

    it('deduplicates detail entities', () => {
      const detailOp1: OperationSpec = {
        operationId: 'getFlight',
        method: 'get',
        path: '/api/flights/{id}',
        kind: 'detail',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      const detailOp2: OperationSpec = {
        operationId: 'getFlightDetails',
        method: 'get',
        path: '/api/flights/{id}/details',
        kind: 'detail',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const result = buildStateProperties([], [detailOp1, detailOp2], mockContext);
      expect(result).toHaveLength(1);
    });
  });

  describe('buildWithState', () => {
    it('generates withState with properties', () => {
      const properties = [
        { name: 'flightsParams', value: '{} as { status?: string }' },
        { name: 'selectedFlightId', value: 'undefined as string | undefined' },
      ];

      const result = buildWithState(properties);
      expect(result).toContain('withState({');
      expect(result).toContain('flightsParams: {} as { status?: string }');
      expect(result).toContain('selectedFlightId: undefined as string | undefined');
      expect(result).toContain('})');
    });
  });
});

