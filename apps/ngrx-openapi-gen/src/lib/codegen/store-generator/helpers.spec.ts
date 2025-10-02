import {
  isReference,
  extractRefName,
  deriveResourceNameFromPath,
  buildUrlExpression,
  buildParamSuffix,
  buildParamsTypeName,
  canWriteCollectionResource,
  canWriteDetailResource,
} from './helpers';
import { OperationSpec, ParamSpec } from '../../spec';

describe('helpers', () => {
  describe('isReference', () => {
    it('returns true for reference objects', () => {
      expect(isReference({ $ref: '#/components/schemas/Flight' })).toBe(true);
    });

    it('returns false for schema objects', () => {
      expect(isReference({ type: 'string' })).toBe(false);
    });
  });

  describe('extractRefName', () => {
    it('extracts schema name from $ref', () => {
      expect(extractRefName('#/components/schemas/Flight')).toBe('Flight');
    });

    it('returns undefined for invalid refs', () => {
      expect(extractRefName('/invalid/ref')).toBeUndefined();
    });
  });

  describe('deriveResourceNameFromPath', () => {
    it('extracts last segment from path', () => {
      expect(deriveResourceNameFromPath('/api/flights')).toBe('flights');
    });

    it('ignores path parameters', () => {
      expect(deriveResourceNameFromPath('/api/flights/{id}')).toBe('flights');
    });

    it('returns items for empty path', () => {
      expect(deriveResourceNameFromPath('/')).toBe('items');
    });
  });

  describe('buildUrlExpression', () => {
    it('returns path unchanged when no params', () => {
      expect(buildUrlExpression('/api/flights', [])).toBe('/api/flights');
    });

    it('interpolates single path param', () => {
      const params: ParamSpec[] = [
        { name: 'id', location: 'path', schema: { type: 'string' }, required: true },
      ];
      expect(buildUrlExpression('/api/flights/{id}', params)).toBe('/api/flights/${input.id}');
    });

    it('interpolates multiple path params', () => {
      const params: ParamSpec[] = [
        { name: 'userId', location: 'path', schema: { type: 'string' }, required: true },
        { name: 'taskId', location: 'path', schema: { type: 'string' }, required: true },
      ];
      expect(buildUrlExpression('/api/users/{userId}/tasks/{taskId}', params))
        .toBe('/api/users/${input.userId}/tasks/${input.taskId}');
    });

    it('uses custom param variable name', () => {
      const params: ParamSpec[] = [
        { name: 'id', location: 'path', schema: { type: 'string' }, required: true },
      ];
      expect(buildUrlExpression('/api/flights/{id}', params, 'params'))
        .toBe('/api/flights/${params.id}');
    });
  });

  describe('buildParamSuffix', () => {
    it('returns empty string for no params', () => {
      expect(buildParamSuffix([])).toBe('');
    });

    it('returns ById for single id param', () => {
      const params: ParamSpec[] = [
        { name: 'id', location: 'path', schema: { type: 'string' }, required: true },
      ];
      expect(buildParamSuffix(params)).toBe('ById');
    });

    it('joins multiple params with And', () => {
      const params: ParamSpec[] = [
        { name: 'userId', location: 'path', schema: { type: 'string' }, required: true },
        { name: 'taskId', location: 'path', schema: { type: 'string' }, required: true },
      ];
      expect(buildParamSuffix(params)).toBe('ByUserIdAndTaskId');
    });
  });

  describe('buildParamsTypeName', () => {
    it('builds name from entity', () => {
      const op: OperationSpec = {
        operationId: 'getFlight',
        method: 'get',
        path: '/api/flights/{id}',
        kind: 'detail',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(buildParamsTypeName(op)).toBe('FlightByIdParams');
    });

    it('uses operationId when no entity', () => {
      const op: OperationSpec = {
        operationId: 'getSpecialItem',
        method: 'get',
        path: '/api/special/{id}',
        kind: 'detail',
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(buildParamsTypeName(op)).toBe('GetSpecialItemParams');
    });
  });

  describe('canWriteCollectionResource', () => {
    it('returns true when entity exists', () => {
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
      expect(canWriteCollectionResource(op)).toBe(true);
    });

    it('returns true when responseSchema exists', () => {
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
      expect(canWriteCollectionResource(op)).toBe(true);
    });

    it('returns false when neither exists', () => {
      const op: OperationSpec = {
        operationId: 'getErrors',
        method: 'get',
        path: '/api/errors',
        kind: 'collection',
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(canWriteCollectionResource(op)).toBe(false);
    });
  });

  describe('canWriteDetailResource', () => {
    it('returns true when entity exists', () => {
      const op: OperationSpec = {
        operationId: 'getFlight',
        method: 'get',
        path: '/api/flights/{id}',
        kind: 'detail',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(canWriteDetailResource(op)).toBe(true);
    });

    it('returns false when no entity', () => {
      const op: OperationSpec = {
        operationId: 'getItem',
        method: 'get',
        path: '/api/items/{id}',
        kind: 'detail',
        pathParams: [{ name: 'id', location: 'path', schema: { type: 'string' }, required: true }],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(canWriteDetailResource(op)).toBe(false);
    });
  });
});

