import {
  deriveResourceNameFromPath,
  buildUrlExpression,
  buildParamSuffix,
  buildParamsTypeName,
  canWriteCollectionResource,
  canWriteDetailResource,
  uniqueDetailOps,
} from './helpers';
import { OperationSpec, ParamSpec } from '../../spec';

describe('helpers', () => {
  describe('deriveResourceNameFromPath', () => {
    it.each([
      ['/api/flights', 'flights'],
      ['/api/flights/{id}', 'flights'],
      ['/', 'items'],
    ])('deriveResourceNameFromPath(%s) = %s', (path, expected) => {
      expect(deriveResourceNameFromPath(path)).toBe(expected);
    });
  });

  describe('buildUrlExpression', () => {
    it('returns path unchanged when no params', () => {
      expect(buildUrlExpression('/api/flights', [])).toBe('/api/flights');
    });

    it('interpolates path params with default variable name', () => {
      const params: ParamSpec[] = [
        {
          name: 'id',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
      ];
      expect(buildUrlExpression('/api/flights/{id}', params)).toBe(
        '/api/flights/${input.id}'
      );
    });

    it('interpolates multiple path params', () => {
      const params: ParamSpec[] = [
        {
          name: 'userId',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
        {
          name: 'taskId',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
      ];
      expect(
        buildUrlExpression('/api/users/{userId}/tasks/{taskId}', params)
      ).toBe('/api/users/${input.userId}/tasks/${input.taskId}');
    });

    it('uses custom param variable name', () => {
      const params: ParamSpec[] = [
        {
          name: 'id',
          location: 'path',
          schema: { type: 'string' },
          required: true,
        },
      ];
      expect(buildUrlExpression('/api/flights/{id}', params, 'params')).toBe(
        '/api/flights/${params.id}'
      );
    });
  });

  describe('buildParamSuffix', () => {
    const makeParam = (name: string): ParamSpec => ({
      name,
      location: 'path',
      schema: { type: 'string' },
      required: true,
    });

    it.each([
      [[], ''],
      [[makeParam('id')], 'ById'],
      [[makeParam('userId'), makeParam('taskId')], 'ByUserIdAndTaskId'],
    ])('buildParamSuffix(%j) = %s', (params, expected) => {
      expect(buildParamSuffix(params)).toBe(expected);
    });
  });

  describe('uniqueDetailOps', () => {
    it('yields unique operations by entity name', () => {
      const ops: OperationSpec[] = [
        {
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
        },
        {
          operationId: 'getFlightDetails',
          method: 'get',
          path: '/api/flights/{id}/details',
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
        },
        {
          operationId: 'getBooking',
          method: 'get',
          path: '/api/bookings/{id}',
          kind: 'detail',
          entity: {
            name: 'Booking',
            schemaRef: '#/components/schemas/Booking',
          },
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
        },
      ];

      const result = [...uniqueDetailOps(ops)];
      expect(result).toHaveLength(2);
      expect(result[0].entity.name).toBe('Flight');
      expect(result[1].entity.name).toBe('Booking');
    });

    it('skips operations without entity', () => {
      const ops: OperationSpec[] = [
        {
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
        },
      ];

      const result = [...uniqueDetailOps(ops)];
      expect(result).toHaveLength(0);
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
      expect(buildParamsTypeName(op)).toBe('FlightByIdParams');
    });

    it('uses operationId when no entity', () => {
      const op: OperationSpec = {
        operationId: 'getSpecialItem',
        method: 'get',
        path: '/api/special/{id}',
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
    it('returns true when entity and path params exist', () => {
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
      expect(canWriteDetailResource(op)).toBe(true);
    });

    it('returns false when no entity', () => {
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
      expect(canWriteDetailResource(op)).toBe(false);
    });

    it('returns false when entity exists but no path params', () => {
      const op: OperationSpec = {
        operationId: 'getCurrentUser',
        method: 'get',
        path: '/api/users/current',
        kind: 'detail',
        entity: { name: 'User', schemaRef: '#/components/schemas/User' },
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(canWriteDetailResource(op)).toBe(false);
    });
  });
});
