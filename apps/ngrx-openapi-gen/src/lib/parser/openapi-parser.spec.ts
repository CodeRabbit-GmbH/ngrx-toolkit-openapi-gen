import { resolve } from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { OpenApiParser } from './openapi-parser';
import { loadOpenApiDocument } from '../openapi-loader';
import { isReference, isArraySchema } from '../spec';

const fixturesDir = resolve(__dirname, '../../__fixtures__');

function loadFixture(name: string) {
  return loadOpenApiDocument(resolve(fixturesDir, name));
}

describe('OpenApiParser', () => {
  const parser = new OpenApiParser();

  describe('primitives.yaml', () => {
    const doc = loadFixture('primitives.yaml');
    const spec = parser.parse(doc, { apiName: 'PrimitivesApi' });

    it('parses API metadata', () => {
      expect(spec.apiName).toBe('PrimitivesApi');
      expect(spec.title).toBe('Primitives Test API');
      expect(spec.version).toBe('1.0.0');
      expect(spec.basePathToken).toBe('PRIMITIVES_API_BASE_PATH');
    });

    it('creates domain from tag', () => {
      expect(spec.domains).toHaveLength(1);
      expect(spec.domains[0].name).toBe('Item');
    });

    it('classifies GET /items as collection operation', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'getItems');
      expect(op).toBeDefined();
      expect(op?.kind).toBe('collection');
      expect(op?.method).toBe('get');
      expect(op?.entity?.name).toBe('Item');
    });

    it('parses entity with primitive types', () => {
      const entity = spec.domains[0].entities.find(e => e.name === 'Item');
      expect(entity).toBeDefined();
      expect(entity?.primaryKey).toBe('id');
      expect(entity?.properties).toHaveLength(4);

      const idProp = entity?.properties.find(p => p.name === 'id');
      expect(isReference(idProp!.schema)).toBe(false);
      expect((idProp!.schema as OpenAPIV3.SchemaObject).type).toBe('string');
      expect(idProp?.optional).toBe(false);

      const countProp = entity?.properties.find(p => p.name === 'count');
      expect((countProp!.schema as OpenAPIV3.SchemaObject).type).toBe('integer');

      const activeProp = entity?.properties.find(p => p.name === 'active');
      expect((activeProp!.schema as OpenAPIV3.SchemaObject).type).toBe('boolean');
    });
  });

  describe('nullable.yaml', () => {
    const doc = loadFixture('nullable.yaml');
    const spec = parser.parse(doc, { apiName: 'NullableApi' });

    it('parses nullable types', () => {
      const entity = spec.domains[0].entities.find(e => e.name === 'Product');
      expect(entity).toBeDefined();

      const descProp = entity?.properties.find(p => p.name === 'description');
      const descSchema = descProp!.schema as OpenAPIV3.SchemaObject;
      expect(descSchema.type).toBe('string');
      expect(descSchema.nullable).toBe(true);

      const priceProp = entity?.properties.find(p => p.name === 'price');
      const priceSchema = priceProp!.schema as OpenAPIV3.SchemaObject;
      expect(priceSchema.nullable).toBe(true);
    });

    it('parses nullable enum', () => {
      const entity = spec.domains[0].entities.find(e => e.name === 'Product');
      const statusProp = entity?.properties.find(p => p.name === 'status');
      const statusSchema = statusProp!.schema as OpenAPIV3.SchemaObject;

      expect(statusSchema.nullable).toBe(true);
      expect(statusSchema.enum).toContain('active');
      expect(statusSchema.enum).toContain('inactive');
    });
  });

  describe('crud.yaml', () => {
    const doc = loadFixture('crud.yaml');
    const spec = parser.parse(doc, { apiName: 'CrudApi' });

    it('classifies GET /tasks as collection', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'getTasks');
      expect(op?.kind).toBe('collection');
    });

    it('classifies GET /tasks/{id} as detail', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'getTask');
      expect(op?.kind).toBe('detail');
      expect(op?.pathParams).toHaveLength(1);
      expect(op?.pathParams[0].name).toBe('id');
      expect(op?.pathParams[0].required).toBe(true);
    });

    it('classifies POST /tasks as mutation', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'createTask');
      expect(op?.kind).toBe('mutation');
      expect(op?.method).toBe('post');
      expect(op?.requestBody).toBeDefined();
    });

    it('classifies PUT /tasks/{id} as mutation', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'updateTask');
      expect(op?.kind).toBe('mutation');
      expect(op?.method).toBe('put');
      expect(op?.pathParams).toHaveLength(1);
    });

    it('classifies DELETE /tasks/{id} as mutation', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'deleteTask');
      expect(op?.kind).toBe('mutation');
      expect(op?.method).toBe('delete');
    });

    it('extracts query parameters', () => {
      const op = spec.domains[0].operations.find(o => o.operationId === 'getTasks');
      expect(op?.queryParams).toHaveLength(2);

      const statusParam = op?.queryParams.find(p => p.name === 'status');
      expect((statusParam!.schema as OpenAPIV3.SchemaObject).type).toBe('string');
      expect(statusParam?.required).toBe(false);

      const limitParam = op?.queryParams.find(p => p.name === 'limit');
      expect((limitParam!.schema as OpenAPIV3.SchemaObject).type).toBe('integer');
    });
  });

  describe('refs.yaml', () => {
    const doc = loadFixture('refs.yaml');
    const spec = parser.parse(doc, { apiName: 'RefsApi' });

    it('creates domains for each tag', () => {
      const domainNames = spec.domains.map(d => d.name);
      expect(domainNames).toContain('Order');
      expect(domainNames).toContain('Customer');
    });

    it('parses $ref properties as ReferenceObject', () => {
      const orderDomain = spec.domains.find(d => d.name === 'Order');
      const orderEntity = orderDomain?.entities.find(e => e.name === 'Order');

      const customerProp = orderEntity?.properties.find(p => p.name === 'customer');
      expect(isReference(customerProp!.schema)).toBe(true);
      if (isReference(customerProp!.schema)) {
        expect(customerProp!.schema.$ref).toBe('#/components/schemas/Customer');
      }
    });

    it('parses array of $ref as array schema with ref items', () => {
      const orderDomain = spec.domains.find(d => d.name === 'Order');
      const orderEntity = orderDomain?.entities.find(e => e.name === 'Order');

      const itemsProp = orderEntity?.properties.find(p => p.name === 'items');
      expect(isReference(itemsProp!.schema)).toBe(false);
      const itemsSchema = itemsProp!.schema as OpenAPIV3.SchemaObject;
      expect(isArraySchema(itemsSchema)).toBe(true);
      if (isArraySchema(itemsSchema) && itemsSchema.items) {
        expect(isReference(itemsSchema.items)).toBe(true);
        if (isReference(itemsSchema.items)) {
          expect(itemsSchema.items.$ref).toBe('#/components/schemas/OrderItem');
        }
      }
    });
  });

  describe('simple-flight.yaml (existing fixture)', () => {
    const doc = loadFixture('simple-flight.yaml');
    const spec = parser.parse(doc, { apiName: 'FlightApi' });

    it('creates Flight and Booking domains', () => {
      const domainNames = spec.domains.map(d => d.name);
      expect(domainNames).toContain('Flight');
      expect(domainNames).toContain('Booking');
    });

    it('parses enum as schema with enum property', () => {
      const flightDomain = spec.domains.find(d => d.name === 'Flight');
      const flightEntity = flightDomain?.entities.find(e => e.name === 'Flight');

      const statusProp = flightEntity?.properties.find(p => p.name === 'status');
      expect(isReference(statusProp!.schema)).toBe(false);
      const statusSchema = statusProp!.schema as OpenAPIV3.SchemaObject;
      expect(statusSchema.enum).toBeDefined();
      expect(statusSchema.enum).toContain('scheduled');
      expect(statusSchema.enum).toContain('delayed');
    });

    it('infers primary key as id', () => {
      const flightDomain = spec.domains.find(d => d.name === 'Flight');
      const flightEntity = flightDomain?.entities.find(e => e.name === 'Flight');
      expect(flightEntity?.primaryKey).toBe('id');
    });
  });
});
