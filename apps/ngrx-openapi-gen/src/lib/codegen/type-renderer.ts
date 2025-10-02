/**
 * Type Renderer - Converts OpenAPI schemas to TypeScript type strings for ts-morph.
 * Single responsibility: Transform OpenAPI schema objects into TypeScript syntax.
 */

import { OpenAPIV3 } from 'openapi-types';
import { pascalCase } from 'change-case';
import { SchemaOrRef, isReference, isArraySchema, extractSchemaName } from '../spec';
import { formatPropertyName } from './utils';

/**
 * Options for rendering types
 */
export interface TypeRenderOptions {
  /**
   * Suffix to append to ref type names (e.g., 'Model' -> 'FlightModel')
   */
  modelSuffix?: string;
  /**
   * Current indentation level
   */
  indent?: number;
  /**
   * Indentation string (default: '  ')
   */
  indentString?: string;
}

const DEFAULT_OPTIONS: Required<TypeRenderOptions> = {
  modelSuffix: 'Model',
  indent: 0,
  indentString: '  ',
};

/**
 * Renders OpenAPI schemas to TypeScript type strings
 */
export class TypeRenderer {
  private readonly options: Required<TypeRenderOptions>;

  constructor(options: TypeRenderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Render an OpenAPI schema to a TypeScript type string
   */
  render(schema: SchemaOrRef | undefined): string {
    if (!schema) {
      return 'unknown';
    }
    return this.renderSchema(schema, this.options.indent);
  }

  /**
   * Render a schema with specific indentation
   */
  private renderSchema(schema: SchemaOrRef, indent: number): string {
    if (isReference(schema)) {
      return this.renderRef(schema.$ref);
    }

    // Handle combination types first (allOf, oneOf, anyOf)
    const combinedType = this.renderCombinationType(schema, indent);
    if (combinedType) {
      return schema.nullable ? `${combinedType} | null` : combinedType;
    }

    // Handle enum types
    if (schema.enum && schema.enum.length > 0) {
      const enumType = schema.enum.map(value => this.renderLiteral(value)).join(' | ');
      return schema.nullable ? `${enumType} | null` : enumType;
    }

    // Handle by type
    let resultType: string;
    switch (schema.type) {
      case 'string':
        resultType = 'string';
        break;
      case 'number':
      case 'integer':
        resultType = 'number';
        break;
      case 'boolean':
        resultType = 'boolean';
        break;
      case 'array':
        resultType = this.renderArray(schema as OpenAPIV3.ArraySchemaObject, indent);
        break;
      case 'object':
        resultType = this.renderObject(schema as OpenAPIV3.NonArraySchemaObject, indent);
        break;
      default:
        // No explicit type - check for object-like properties
        if ('properties' in schema || 'additionalProperties' in schema) {
          resultType = this.renderObject(schema as OpenAPIV3.NonArraySchemaObject, indent);
        } else {
          resultType = 'unknown';
        }
    }

    return schema.nullable ? `${resultType} | null` : resultType;
  }

  private renderCombinationType(schema: OpenAPIV3.SchemaObject, indent: number): string | undefined {
    if (schema.allOf && schema.allOf.length > 0) {
      const members = schema.allOf.map(s => this.renderSchema(s, indent));
      return members.length === 1 ? members[0] : members.join(' & ');
    }

    if (schema.oneOf && schema.oneOf.length > 0) {
      const members = schema.oneOf.map(s => this.renderSchema(s, indent));
      return members.length === 1 ? members[0] : members.join(' | ');
    }

    if (schema.anyOf && schema.anyOf.length > 0) {
      const members = schema.anyOf.map(s => this.renderSchema(s, indent));
      return members.length === 1 ? members[0] : members.join(' | ');
    }

    return undefined;
  }

  private renderArray(schema: OpenAPIV3.ArraySchemaObject, indent: number): string {
    const items = schema.items;
    if (!items) {
      return 'Array<unknown>';
    }
    const elementType = this.renderSchema(items, indent);
    return `Array<${elementType}>`;
  }

  private renderObject(schema: OpenAPIV3.NonArraySchemaObject, indent: number): string {
    const properties = schema.properties;
    const additionalProps = schema.additionalProperties;
    const required = new Set(schema.required ?? []);

    if (!properties || Object.keys(properties).length === 0) {
      if (additionalProps === undefined) {
        return 'Record<string, unknown>';
      }
      if (additionalProps === true) {
        return 'Record<string, unknown>';
      }
      if (additionalProps === false) {
        return '{}';
      }
      const valueType = this.renderSchema(additionalProps, indent);
      return `Record<string, ${valueType}>`;
    }

    const baseIndent = this.options.indentString.repeat(indent);
    const propIndent = this.options.indentString.repeat(indent + 1);

    const lines = Object.entries(properties).map(([name, propSchema]) => {
      const formattedName = formatPropertyName(name);
      const optional = !required.has(name) ? '?' : '';
      const type = this.renderSchema(propSchema, indent + 1);
      return `${propIndent}${formattedName}${optional}: ${type};`;
    });

    return `{\n${lines.join('\n')}\n${baseIndent}}`;
  }

  private renderLiteral(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "\\'");
      return `'${escaped}'`;
    }
    return String(value);
  }

  private renderRef(ref: string): string {
    const name = extractSchemaName(ref);
    if (!name) {
      return 'unknown';
    }
    return `${pascalCase(name)}${this.options.modelSuffix}`;
  }
}

/**
 * Collect all referenced model names from an OpenAPI schema
 */
export function collectModelRefs(schema: SchemaOrRef | undefined): Set<string> {
  const refs = new Set<string>();

  function visit(s: SchemaOrRef | undefined): void {
    if (!s) return;

    if (isReference(s)) {
      const name = extractSchemaName(s.$ref);
      if (name) refs.add(name);
      return;
    }

    // Handle array items
    if (isArraySchema(s) && s.items) {
      visit(s.items);
    }

    // Handle object properties
    if ('properties' in s && s.properties) {
      for (const propSchema of Object.values(s.properties)) {
        visit(propSchema);
      }
    }

    // Handle additionalProperties
    if ('additionalProperties' in s && s.additionalProperties && typeof s.additionalProperties !== 'boolean') {
      visit(s.additionalProperties);
    }

    // Handle combination types
    if (s.allOf) {
      for (const member of s.allOf) visit(member);
    }
    if (s.oneOf) {
      for (const member of s.oneOf) visit(member);
    }
    if (s.anyOf) {
      for (const member of s.anyOf) visit(member);
    }
  }

  visit(schema);
  return refs;
}
