import { ZodRenderer } from './zod-renderer';

describe('ZodRenderer', () => {
  const renderer = new ZodRenderer();

  describe('primitive types', () => {
    it('renders string type', () => {
      expect(renderer.render({ type: 'string' })).toBe('z.string()');
    });

    it('renders number type', () => {
      expect(renderer.render({ type: 'number' })).toBe('z.number()');
    });

    it('renders integer type with int validator', () => {
      expect(renderer.render({ type: 'integer' })).toBe('z.number().int()');
    });

    it('renders boolean type', () => {
      expect(renderer.render({ type: 'boolean' })).toBe('z.boolean()');
    });

    it('renders unknown for undefined schema', () => {
      expect(renderer.render(undefined)).toBe('z.unknown()');
    });
  });

  describe('string formats (Zod 4 top-level types)', () => {
    it('renders uuid format as z.uuid()', () => {
      expect(renderer.render({ type: 'string', format: 'uuid' })).toBe(
        'z.uuid()'
      );
    });

    it('renders email format as z.email()', () => {
      expect(renderer.render({ type: 'string', format: 'email' })).toBe(
        'z.email()'
      );
    });

    it('renders uri format as z.url()', () => {
      expect(renderer.render({ type: 'string', format: 'uri' })).toBe(
        'z.url()'
      );
    });

    it('renders url format as z.url()', () => {
      expect(renderer.render({ type: 'string', format: 'url' })).toBe(
        'z.url()'
      );
    });

    it('renders date format as z.iso.date()', () => {
      expect(renderer.render({ type: 'string', format: 'date' })).toBe(
        'z.iso.date()'
      );
    });

    it('renders date-time format as z.iso.datetime()', () => {
      expect(renderer.render({ type: 'string', format: 'date-time' })).toBe(
        'z.iso.datetime()'
      );
    });

    it('renders ipv4 format as z.ipv4()', () => {
      expect(renderer.render({ type: 'string', format: 'ipv4' })).toBe(
        'z.ipv4()'
      );
    });

    it('renders ipv6 format as z.ipv6()', () => {
      expect(renderer.render({ type: 'string', format: 'ipv6' })).toBe(
        'z.ipv6()'
      );
    });

    it('renders byte format as z.base64()', () => {
      expect(renderer.render({ type: 'string', format: 'byte' })).toBe(
        'z.base64()'
      );
    });

    it('renders unknown format as plain string', () => {
      expect(renderer.render({ type: 'string', format: 'binary' })).toBe(
        'z.string()'
      );
    });

    it('renders nullable string with format', () => {
      expect(
        renderer.render({ type: 'string', format: 'uuid', nullable: true })
      ).toBe('z.uuid().nullable()');
    });
  });

  describe('string patterns', () => {
    it('renders pattern as regex', () => {
      expect(
        renderer.render({ type: 'string', pattern: '^[a-z0-9]{40}$' })
      ).toBe('z.string().regex(/^[a-z0-9]{40}$/)');
    });

    it('escapes forward slashes in pattern', () => {
      expect(
        renderer.render({ type: 'string', pattern: '^https://example.com/.*$' })
      ).toBe('z.string().regex(/^https:\\/\\/example.com\\/.*$/)');
    });

    it('renders pattern without format (format takes precedence)', () => {
      expect(
        renderer.render({
          type: 'string',
          format: 'email',
          pattern: '^.*@example\\.com$',
        })
      ).toBe('z.email()');
    });

    it('renders nullable string with pattern', () => {
      expect(
        renderer.render({
          type: 'string',
          pattern: '^[A-Z]+$',
          nullable: true,
        })
      ).toBe('z.string().regex(/^[A-Z]+$/).nullable()');
    });
  });

  describe('integer formats', () => {
    it('renders int32 format with int validator', () => {
      expect(renderer.render({ type: 'integer', format: 'int32' })).toBe(
        'z.number().int()'
      );
    });

    it('renders int64 format with int validator', () => {
      expect(renderer.render({ type: 'integer', format: 'int64' })).toBe(
        'z.number().int()'
      );
    });

    it('renders nullable integer with format', () => {
      expect(
        renderer.render({ type: 'integer', format: 'int32', nullable: true })
      ).toBe('z.number().int().nullable()');
    });
  });

  describe('nullable types', () => {
    it('renders nullable string', () => {
      expect(renderer.render({ type: 'string', nullable: true })).toBe(
        'z.string().nullable()'
      );
    });

    it('renders nullable number', () => {
      expect(renderer.render({ type: 'number', nullable: true })).toBe(
        'z.number().nullable()'
      );
    });
  });

  describe('enum types', () => {
    it('renders string enum', () => {
      expect(
        renderer.render({ type: 'string', enum: ['pending', 'completed'] })
      ).toBe("z.enum(['pending', 'completed'])");
    });

    it('renders nullable enum', () => {
      expect(
        renderer.render({
          type: 'string',
          enum: ['active', 'inactive'],
          nullable: true,
        })
      ).toBe("z.enum(['active', 'inactive']).nullable()");
    });

    it('renders single value enum as enum with single value', () => {
      expect(renderer.render({ type: 'string', enum: ['only'] })).toBe(
        "z.enum(['only'])"
      );
    });

    it('escapes special characters in enum values', () => {
      expect(renderer.render({ type: 'string', enum: ["it's", 'value'] })).toBe(
        "z.enum(['it\\'s', 'value'])"
      );
    });
  });

  describe('array types', () => {
    it('renders array of strings', () => {
      expect(
        renderer.render({ type: 'array', items: { type: 'string' } })
      ).toBe('z.array(z.string())');
    });

    it('renders array of numbers', () => {
      expect(
        renderer.render({ type: 'array', items: { type: 'number' } })
      ).toBe('z.array(z.number())');
    });

    it('renders array with explicit unknown items as unknown array', () => {
      expect(renderer.render({ type: 'array', items: {} })).toBe(
        'z.array(z.unknown())'
      );
    });

    it('renders nullable array', () => {
      expect(
        renderer.render({
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        })
      ).toBe('z.array(z.string()).nullable()');
    });
  });

  describe('object types', () => {
    it('renders simple object', () => {
      const result = renderer.render({
        type: 'object',
        properties: {
          id: { type: 'string' },
          count: { type: 'number' },
        },
        required: ['id', 'count'],
      });
      expect(result).toContain('z.object({');
      expect(result).toContain('id: z.string(),');
      expect(result).toContain('count: z.number(),');
    });

    it('renders optional properties', () => {
      const result = renderer.render({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: [],
      });
      expect(result).toContain('name: z.string().optional(),');
    });

    it('renders empty object as record', () => {
      expect(renderer.render({ type: 'object' })).toBe(
        'z.record(z.string(), z.unknown())'
      );
    });

    it('renders object with additionalProperties', () => {
      expect(
        renderer.render({
          type: 'object',
          additionalProperties: { type: 'string' },
        })
      ).toBe('z.record(z.string(), z.string())');
    });

    it('renders object with additionalProperties: false', () => {
      expect(
        renderer.render({
          type: 'object',
          additionalProperties: false,
        })
      ).toBe('z.object({})');
    });
  });

  describe('reference types', () => {
    it('renders $ref as lazy schema reference', () => {
      expect(renderer.render({ $ref: '#/components/schemas/Task' })).toBe(
        'z.lazy(() => TaskModelSchema)'
      );
    });

    it('renders $ref with custom suffix', () => {
      const customRenderer = new ZodRenderer({ modelSuffix: 'Entity' });
      expect(customRenderer.render({ $ref: '#/components/schemas/User' })).toBe(
        'z.lazy(() => UserEntitySchema)'
      );
    });
  });

  describe('combination types', () => {
    it('renders oneOf as union', () => {
      expect(
        renderer.render({
          oneOf: [{ type: 'string' }, { type: 'number' }],
        })
      ).toBe('z.union([z.string(), z.number()])');
    });

    it('renders anyOf as union', () => {
      expect(
        renderer.render({
          anyOf: [{ type: 'boolean' }, { type: 'string' }],
        })
      ).toBe('z.union([z.boolean(), z.string()])');
    });

    it('renders allOf as intersection with 2 schemas', () => {
      expect(
        renderer.render({
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { $ref: '#/components/schemas/Extended' },
          ],
        })
      ).toBe(
        'z.lazy(() => BaseModelSchema).and(z.lazy(() => ExtendedModelSchema))'
      );
    });

    it('renders allOf with 3+ schemas as chained intersections', () => {
      expect(
        renderer.render({
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { $ref: '#/components/schemas/Extended' },
            { $ref: '#/components/schemas/Extra' },
          ],
        })
      ).toBe(
        'z.lazy(() => BaseModelSchema).and(z.lazy(() => ExtendedModelSchema)).and(z.lazy(() => ExtraModelSchema))'
      );
    });

    it('renders single item oneOf without union', () => {
      expect(
        renderer.render({
          oneOf: [{ type: 'string' }],
        })
      ).toBe('z.string()');
    });
  });
});
