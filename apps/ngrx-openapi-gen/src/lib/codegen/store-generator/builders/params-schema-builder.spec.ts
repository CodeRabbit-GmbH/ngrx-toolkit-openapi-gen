import { buildParamSchemas, getParamSchemaName } from './params-schema-builder';
import { OperationSpec } from '../../../spec';
import { BuilderContext } from '../types';

describe('params-schema-builder', () => {
  const mockContext: BuilderContext = {
    basePathToken: 'API_BASE_PATH',
    modelSuffix: 'Model',
    zodValidation: true,
    preferEntityNames: false,
    sharedEntities: false,
    duplicateCollectionEntities: new Set(),
    renderType: (schema: unknown) => {
      const s = schema as { type?: string };
      return s?.type === 'number' ? 'number' : 'string';
    },
    renderZod: (schema: unknown) => {
      const s = schema as { type?: string; format?: string };
      if (s?.format === 'uuid') return 'z.uuid()';
      return s?.type === 'number' ? 'z.number()' : 'z.string()';
    },
  };

  describe('buildParamSchemas', () => {
    it('returns empty array when zodValidation is disabled', () => {
      const noZodContext: BuilderContext = {
        ...mockContext,
        zodValidation: false,
      };
      const result = buildParamSchemas([], [], noZodContext);
      expect(result).toEqual([]);
    });

    it('builds schema for collection query params', () => {
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
            required: true,
          },
        ],
        successStatusCodes: ['200'],
      };

      const result = buildParamSchemas([collectionOp], [], mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].schemaName).toBe('flightsParamsSchema');
      expect(result[0].schemaCode).toContain('z.object({');
      expect(result[0].schemaCode).toContain('status: z.string().optional()');
      expect(result[0].schemaCode).toContain('limit: z.number()');
    });

    it('builds schema for detail path params', () => {
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
            schema: { type: 'string', format: 'uuid' },
            required: true,
          },
        ],
        queryParams: [],
        successStatusCodes: ['200'],
      };

      const result = buildParamSchemas([], [detailOp], mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].schemaName).toBe('flightIdSchema');
      expect(result[0].schemaCode).toBe('z.uuid()');
    });
  });

  describe('getParamSchemaName', () => {
    it('returns params schema name for collection', () => {
      expect(getParamSchemaName('Flight', false)).toBe('flightsParamsSchema');
    });

    it('returns id schema name for detail with path params', () => {
      expect(getParamSchemaName('Flight', true, true)).toBe('flightIdSchema');
    });

    it('returns params schema name for detail with query params', () => {
      expect(getParamSchemaName('Flight', true, false)).toBe(
        'flightParamsSchema'
      );
    });
  });
});
