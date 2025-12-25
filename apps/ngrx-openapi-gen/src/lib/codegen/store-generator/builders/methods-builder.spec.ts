import { buildWithMethods } from './methods-builder';
import { OperationSpec } from '../../../spec';
import { BuilderContext } from '../types';

describe('methods-builder', () => {
  const mockContext: BuilderContext = {
    basePathToken: 'API_BASE_PATH',
    modelSuffix: 'Model',
    zodValidation: false,
    preferEntityNames: false,
    renderType: (schema: unknown) => {
      const s = schema as { type?: string };
      return s?.type === 'number' ? 'number' : 'string';
    },
  };

  describe('buildWithMethods', () => {
    it('generates setParams method for collection with params', () => {
      const collectionOp: OperationSpec = {
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
          {
            name: 'limit',
            location: 'query',
            schema: { type: 'number' },
            required: false,
          },
        ],
        successStatusCodes: ['200'],
      };

      const result = buildWithMethods([collectionOp], [], mockContext);
      expect(result).toContain('withMethods((store) => ({');
      expect(result).toContain(
        'setFlightsParams(params: { status?: string; limit?: number })'
      );
      expect(result).toContain('patchState(store, { flightsParams: params })');
      expect(result).toContain('}))');
    });

    it('generates select method for detail operation', () => {
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

      const result = buildWithMethods([], [detailOp], mockContext);
      expect(result).toContain('selectFlight(id: string | undefined)');
      expect(result).toContain('patchState(store, { selectedFlightId: id })');
    });

    it('skips collection without entity', () => {
      const collectionOp: OperationSpec = {
        operationId: 'getItems',
        method: 'get',
        path: '/api/items',
        kind: 'collection',
        pathParams: [],
        queryParams: [
          {
            name: 'page',
            location: 'query',
            schema: { type: 'number' },
            required: false,
          },
        ],
        successStatusCodes: ['200'],
      };

      const result = buildWithMethods([collectionOp], [], mockContext);
      expect(result).not.toContain('setItemsParams');
    });
  });
});
