import { OpenAPIV3 } from 'openapi-types';
import { TypeRenderer, collectModelRefs } from './type-renderer';
import { SchemaOrRef } from '../spec';

describe('TypeRenderer', () => {
  const renderer = new TypeRenderer();

  describe('primitives', () => {
    it('renders string', () => {
      expect(renderer.render({ type: 'string' })).toBe('string');
    });

    it('renders number', () => {
      expect(renderer.render({ type: 'number' })).toBe('number');
    });

    it('renders integer as number', () => {
      expect(renderer.render({ type: 'integer' })).toBe('number');
    });

    it('renders boolean', () => {
      expect(renderer.render({ type: 'boolean' })).toBe('boolean');
    });

    it('renders undefined as unknown', () => {
      expect(renderer.render(undefined)).toBe('unknown');
    });
  });

  describe('arrays', () => {
    it('renders array of primitives', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { type: 'string' },
      };
      expect(renderer.render(schema)).toBe('Array<string>');
    });

    it('renders array of refs', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { $ref: '#/components/schemas/Flight' },
      };
      expect(renderer.render(schema)).toBe('Array<FlightModel>');
    });

    it('renders nested arrays', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      };
      expect(renderer.render(schema)).toBe('Array<Array<number>>');
    });
  });

  describe('enums (literals)', () => {
    it('renders string enum', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      };
      expect(renderer.render(schema)).toBe("'active' | 'inactive' | 'pending'");
    });

    it('renders number enum', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        enum: [1, 2, 3],
      };
      expect(renderer.render(schema)).toBe('1 | 2 | 3');
    });

    it('escapes single quotes in enum strings', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ["it's"],
      };
      expect(renderer.render(schema)).toBe("'it\\'s'");
    });
  });

  describe('nullable', () => {
    it('renders nullable string', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        nullable: true,
      };
      expect(renderer.render(schema)).toBe('string | null');
    });

    it('renders nullable enum', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive'],
        nullable: true,
      };
      expect(renderer.render(schema)).toBe("'active' | 'inactive' | null");
    });
  });

  describe('allOf (intersections)', () => {
    it('renders allOf as intersection', () => {
      const schema: OpenAPIV3.SchemaObject = {
        allOf: [
          { $ref: '#/components/schemas/Base' },
          { $ref: '#/components/schemas/Extended' },
        ],
      };
      expect(renderer.render(schema)).toBe('BaseModel & ExtendedModel');
    });

    it('renders single allOf member as just the type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        allOf: [{ $ref: '#/components/schemas/Base' }],
      };
      expect(renderer.render(schema)).toBe('BaseModel');
    });
  });

  describe('oneOf/anyOf (unions)', () => {
    it('renders oneOf as union', () => {
      const schema: OpenAPIV3.SchemaObject = {
        oneOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      };
      expect(renderer.render(schema)).toBe('string | number');
    });

    it('renders anyOf as union', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { $ref: '#/components/schemas/TypeA' },
          { $ref: '#/components/schemas/TypeB' },
        ],
      };
      expect(renderer.render(schema)).toBe('TypeAModel | TypeBModel');
    });
  });

  describe('refs', () => {
    it('renders ref with Model suffix', () => {
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/Flight',
      };
      expect(renderer.render(schema)).toBe('FlightModel');
    });

    it('converts to PascalCase', () => {
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/flight-booking',
      };
      expect(renderer.render(schema)).toBe('FlightBookingModel');
    });
  });

  describe('objects', () => {
    it('renders empty object as Record', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
      };
      expect(renderer.render(schema)).toBe('Record<string, unknown>');
    });

    it('renders object with properties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      };
      const result = renderer.render(schema);
      expect(result).toContain('id: string;');
      expect(result).toContain('name?: string;');
    });

    it('renders object with additionalProperties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        additionalProperties: { type: 'string' },
      };
      expect(renderer.render(schema)).toBe('Record<string, string>');
    });

    it('quotes invalid identifiers', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          valid: { type: 'string' },
          'has-dash': { type: 'string' },
        },
      };
      const result = renderer.render(schema);
      expect(result).toContain('valid?: string;');
      expect(result).toContain("'has-dash'?: string;");
    });
  });

  describe('custom suffix', () => {
    it('uses custom model suffix', () => {
      const customRenderer = new TypeRenderer({ modelSuffix: 'DTO' });
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/Flight',
      };
      expect(customRenderer.render(schema)).toBe('FlightDTO');
    });
  });

  describe('collectModelRefs', () => {
    it('collects refs from simple reference', () => {
      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/Flight',
      };
      const refs = collectModelRefs(schema);
      expect(refs.has('Flight')).toBe(true);
    });

    it('collects refs from array items', () => {
      const schema: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: { $ref: '#/components/schemas/Flight' },
      };
      const refs = collectModelRefs(schema);
      expect(refs.has('Flight')).toBe(true);
    });

    it('collects refs from object properties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          flight: { $ref: '#/components/schemas/Flight' },
          booking: { $ref: '#/components/schemas/Booking' },
        },
      };
      const refs = collectModelRefs(schema);
      expect(refs.has('Flight')).toBe(true);
      expect(refs.has('Booking')).toBe(true);
    });

    it('collects refs from allOf', () => {
      const schema: OpenAPIV3.SchemaObject = {
        allOf: [
          { $ref: '#/components/schemas/Base' },
          { $ref: '#/components/schemas/Extended' },
        ],
      };
      const refs = collectModelRefs(schema);
      expect(refs.has('Base')).toBe(true);
      expect(refs.has('Extended')).toBe(true);
    });
  });
});
