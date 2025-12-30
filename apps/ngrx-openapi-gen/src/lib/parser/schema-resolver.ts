import { OpenAPIV3 } from 'openapi-types';
import {
  SchemaOrRef,
  SchemaKind,
  PropertySpec,
  isReference,
  isArraySchema,
  extractSchemaName,
  extractParameterName,
} from '../spec';

export class SchemaResolver {
  constructor(private readonly schemas: Record<string, SchemaOrRef> = {}) {}

  resolveRef(ref: string): OpenAPIV3.SchemaObject | undefined {
    const name = extractSchemaName(ref);
    if (!name) return undefined;

    const schema = this.schemas[name];
    if (!schema || isReference(schema)) {
      return undefined;
    }
    return schema;
  }

  extractSchemaName(ref: string): string | undefined {
    return extractSchemaName(ref);
  }

  extractParameterName(ref: string): string | undefined {
    return extractParameterName(ref);
  }

  getSchemaObject(name: string): OpenAPIV3.SchemaObject | undefined {
    const schema = this.schemas[name];
    if (!schema || isReference(schema)) {
      return undefined;
    }
    return schema;
  }

  buildPropertySpecs(schema: OpenAPIV3.SchemaObject): PropertySpec[] {
    const properties: PropertySpec[] = [];
    const required = new Set(schema.required ?? []);

    if (!schema.properties) return properties;

    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const description = isReference(propSchema)
        ? this.getSchemaDescription(propSchema.$ref)
        : (propSchema as OpenAPIV3.SchemaObject).description;

      properties.push({
        name,
        schema: propSchema,
        optional: !required.has(name),
        description,
      });
    }

    return properties;
  }

  private getSchemaDescription(ref: string): string | undefined {
    const schema = this.resolveRef(ref);
    return schema?.description;
  }

  /**
   * Determines the kind of a schema: object, enum, or type-alias.
   */
  getSchemaKind(schema: OpenAPIV3.SchemaObject): SchemaKind {
    // Enum schemas (with enum values) are 'enum' kind
    if (schema.enum && schema.enum.length > 0) {
      return 'enum';
    }

    // Object schemas with properties are 'object' kind
    if (
      schema.type === 'object' ||
      schema.properties ||
      schema.allOf ||
      schema.oneOf ||
      schema.anyOf
    ) {
      return 'object';
    }

    // Everything else (primitives, arrays without $ref) is a type-alias
    return 'type-alias';
  }

  /**
   * Collects all schema names referenced by a given schema (recursively).
   */
  collectReferencedSchemas(schema: SchemaOrRef): Set<string> {
    const refs = new Set<string>();
    this.visitSchema(schema, refs);
    return refs;
  }

  private visitSchema(
    schema: SchemaOrRef | undefined,
    refs: Set<string>
  ): void {
    if (!schema) return;

    if (isReference(schema)) {
      const name = extractSchemaName(schema.$ref);
      if (name && !refs.has(name)) {
        refs.add(name);
        // Recursively visit the referenced schema
        const referencedSchema = this.getSchemaObject(name);
        if (referencedSchema) {
          this.visitSchema(referencedSchema, refs);
        }
      }
      return;
    }

    // Visit array items
    if (isArraySchema(schema) && schema.items) {
      this.visitSchema(schema.items, refs);
    }

    // Visit object properties
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        this.visitSchema(propSchema, refs);
      }
    }

    // Visit additionalProperties
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties !== 'boolean'
    ) {
      this.visitSchema(schema.additionalProperties, refs);
    }

    // Visit composition schemas
    if (schema.allOf) {
      for (const member of schema.allOf) {
        this.visitSchema(member, refs);
      }
    }
    if (schema.oneOf) {
      for (const member of schema.oneOf) {
        this.visitSchema(member, refs);
      }
    }
    if (schema.anyOf) {
      for (const member of schema.anyOf) {
        this.visitSchema(member, refs);
      }
    }
  }

  /**
   * Infers primary key using x-primary-key extension or common naming patterns (id, entityId).
   */
  inferPrimaryKey(schemaName: string): string | undefined {
    const schema = this.getSchemaObject(schemaName);
    if (!schema) return undefined;

    const schemaWithExtension = schema as OpenAPIV3.SchemaObject & {
      'x-primary-key'?: string;
    };
    if (typeof schemaWithExtension['x-primary-key'] === 'string') {
      return schemaWithExtension['x-primary-key'];
    }

    if (!schema.properties) return undefined;

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (!isReference(propSchema)) {
        const propWithExtension = propSchema as OpenAPIV3.SchemaObject & {
          'x-primary-key'?: boolean;
        };
        if (propWithExtension['x-primary-key']) {
          return propName;
        }
      }
    }

    const propNames = Object.keys(schema.properties);

    const directId = propNames.find((p) => p.toLowerCase() === 'id');
    if (directId) return directId;

    const entityId = propNames.find(
      (p) => p.toLowerCase() === `${schemaName.toLowerCase()}id`
    );
    if (entityId) return entityId;

    return undefined;
  }
}
