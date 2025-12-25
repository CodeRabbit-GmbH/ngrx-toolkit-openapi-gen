import { OpenAPIV3 } from 'openapi-types';
import {
  SchemaOrRef,
  PropertySpec,
  isReference,
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
