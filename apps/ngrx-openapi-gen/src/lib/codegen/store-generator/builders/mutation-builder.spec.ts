import {
  buildMutationMethodName,
  buildMutationInputType,
  buildMutationOutputType,
  buildMutation,
  findCollectionResourceName,
  buildWithMutations,
} from './mutation-builder';
import { OperationSpec } from '../../../spec';
import { BuilderContext } from '../types';

describe('mutation-builder', () => {
  const mockContext: BuilderContext = {
    basePathToken: 'API_BASE_PATH',
    modelSuffix: 'Model',
    zodValidation: false,
    preferEntityNames: false,
    renderType: (schema: unknown) => {
      const s = schema as { $ref?: string; type?: string };
      if (s?.$ref) {
        const name = s.$ref.split('/').pop();
        return `${name}Model`;
      }
      return s?.type || 'unknown';
    },
  };

  const entityNamesContext: BuilderContext = {
    ...mockContext,
    preferEntityNames: true,
  };

  describe('buildMutationMethodName', () => {
    describe('default behavior (preferEntityNames: false)', () => {
      it('uses operationId when present', () => {
        const op: OperationSpec = {
          operationId: 'createFlight',
          method: 'post',
          path: '/api/flights',
          kind: 'mutation',
          entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
          pathParams: [],
          queryParams: [],
          successStatusCodes: ['201'],
        };
        expect(buildMutationMethodName(op, mockContext)).toBe('createFlight');
      });

      it('falls back to entity-based name when no operationId', () => {
        const op: OperationSpec = {
          operationId: '',
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
        expect(buildMutationMethodName(op, mockContext)).toBe('removeFlight');
      });

      it('falls back to path-based name when no operationId or entity', () => {
        const op: OperationSpec = {
          operationId: '',
          method: 'post',
          path: '/api/actions',
          kind: 'mutation',
          pathParams: [],
          queryParams: [],
          successStatusCodes: ['200'],
        };
        expect(buildMutationMethodName(op, mockContext)).toBe('postApiActions');
      });
    });

    describe('preferEntityNames: true', () => {
      it('returns createEntity for POST', () => {
        const op: OperationSpec = {
          operationId: 'addFlight',
          method: 'post',
          path: '/api/flights',
          kind: 'mutation',
          entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
          pathParams: [],
          queryParams: [],
          successStatusCodes: ['201'],
        };
        expect(buildMutationMethodName(op, entityNamesContext)).toBe(
          'createFlight'
        );
      });

      it('returns updateEntity for PUT', () => {
        const op: OperationSpec = {
          operationId: 'modifyFlight',
          method: 'put',
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
          successStatusCodes: ['200'],
        };
        expect(buildMutationMethodName(op, entityNamesContext)).toBe(
          'updateFlight'
        );
      });

      it('returns removeEntity for DELETE', () => {
        const op: OperationSpec = {
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
        expect(buildMutationMethodName(op, entityNamesContext)).toBe(
          'removeFlight'
        );
      });

      it('falls back to operationId when no entity', () => {
        const op: OperationSpec = {
          operationId: 'performAction',
          method: 'post',
          path: '/api/actions',
          kind: 'mutation',
          pathParams: [],
          queryParams: [],
          successStatusCodes: ['200'],
        };
        expect(buildMutationMethodName(op, entityNamesContext)).toBe(
          'performAction'
        );
      });
    });
  });

  describe('buildMutationInputType', () => {
    it('returns body type for POST without path params', () => {
      const op: OperationSpec = {
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
      expect(buildMutationInputType(op, false, true, mockContext)).toBe(
        'FlightModel'
      );
    });

    it('returns combined type for PUT with path params and body', () => {
      const op: OperationSpec = {
        operationId: 'updateFlight',
        method: 'put',
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
        requestBody: { $ref: '#/components/schemas/Flight' },
        successStatusCodes: ['200'],
      };
      expect(buildMutationInputType(op, true, true, mockContext)).toBe(
        '{ id: string; body: FlightModel }'
      );
    });

    it('returns params type for DELETE without body', () => {
      const op: OperationSpec = {
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
      expect(buildMutationInputType(op, true, false, mockContext)).toBe(
        'FlightByIdParams'
      );
    });

    it('returns void when no params or body', () => {
      const op: OperationSpec = {
        operationId: 'triggerAction',
        method: 'post',
        path: '/api/trigger',
        kind: 'mutation',
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      // POST has hasBody = true, but no requestBody
      expect(buildMutationInputType(op, false, true, mockContext)).toBe(
        'unknown'
      );
    });
  });

  describe('buildMutationOutputType', () => {
    it('returns rendered responseSchema when present', () => {
      const op: OperationSpec = {
        operationId: 'createFlight',
        method: 'post',
        path: '/api/flights',
        kind: 'mutation',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [],
        responseSchema: { $ref: '#/components/schemas/Flight' },
        successStatusCodes: ['201'],
      };
      expect(buildMutationOutputType(op, mockContext)).toBe('FlightModel');
    });

    it('returns entity model when no responseSchema but entity exists', () => {
      const op: OperationSpec = {
        operationId: 'createFlight',
        method: 'post',
        path: '/api/flights',
        kind: 'mutation',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['201'],
      };
      expect(buildMutationOutputType(op, mockContext)).toBe('FlightModel');
    });

    it('returns void when no responseSchema or entity', () => {
      const op: OperationSpec = {
        operationId: 'deleteItem',
        method: 'delete',
        path: '/api/items/{id}',
        kind: 'mutation',
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
      expect(buildMutationOutputType(op, mockContext)).toBe('void');
    });
  });

  describe('findCollectionResourceName', () => {
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

    it('finds matching collection by entity name', () => {
      const mutationOp: OperationSpec = {
        operationId: 'createFlight',
        method: 'post',
        path: '/api/flights',
        kind: 'mutation',
        entity: { name: 'Flight', schemaRef: '#/components/schemas/Flight' },
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['201'],
      };
      expect(findCollectionResourceName(mutationOp, [collectionOp])).toBe(
        'flights'
      );
    });

    it('uses first collection when mutation has no entity', () => {
      const mutationOp: OperationSpec = {
        operationId: 'performAction',
        method: 'post',
        path: '/api/actions',
        kind: 'mutation',
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(findCollectionResourceName(mutationOp, [collectionOp])).toBe(
        'flights'
      );
    });

    it('returns undefined when no collections', () => {
      const mutationOp: OperationSpec = {
        operationId: 'performAction',
        method: 'post',
        path: '/api/actions',
        kind: 'mutation',
        pathParams: [],
        queryParams: [],
        successStatusCodes: ['200'],
      };
      expect(findCollectionResourceName(mutationOp, [])).toBeUndefined();
    });
  });

  describe('buildMutation', () => {
    it('builds mutation with body and onSuccess', () => {
      const op: OperationSpec = {
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

      const result = buildMutation(op, 'flights', mockContext);
      expect(result.name).toBe('createFlight');
      expect(result.value).toContain('httpMutation<FlightModel, FlightModel>');
      expect(result.value).toContain("method: 'POST'");
      expect(result.value).toContain('body: input');
      expect(result.value).toContain('store._flightsReload()');
    });

    it('builds DELETE mutation without body', () => {
      const op: OperationSpec = {
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

      const result = buildMutation(op, 'flights', mockContext);
      expect(result.name).toBe('deleteFlight');
      expect(result.value).toContain("method: 'DELETE'");
      expect(result.value).not.toContain('body:');
      expect(result.value).toContain('${input.id}');
    });
  });

  describe('buildWithMutations', () => {
    it('generates withMutations with all operations', () => {
      const createOp: OperationSpec = {
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

      const deleteOp: OperationSpec = {
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

      const result = buildWithMutations(
        [createOp, deleteOp],
        [collectionOp],
        mockContext
      );
      expect(result).toContain('withMutations((store) => ({');
      expect(result).toContain('createFlight:');
      expect(result).toContain('deleteFlight:');
      expect(result).toContain('}))');
    });
  });
});
