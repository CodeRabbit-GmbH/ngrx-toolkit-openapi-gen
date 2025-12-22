import { OpenAPIV3 } from 'openapi-types';
import { pascalCase } from 'change-case';
import { SchemaOrRef, isReference, isArraySchema, extractSchemaName } from '../spec';
import { formatPropertyName } from './utils';

export interface ZodRenderOptions {
  modelSuffix?: string;
  indent?: number;
  indentString?: string;
}

const DEFAULT_OPTIONS: Required<ZodRenderOptions> = {
  modelSuffix: 'Model',
  indent: 0,
  indentString: '  ',
};

export class ZodRenderer {
  private readonly options: Required<ZodRenderOptions>;

  constructor(options: ZodRenderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  render(schema: SchemaOrRef | undefined): string {
    if (!schema) {
      return 'z.unknown()';
    }
    return this.renderSchema(schema, this.options.indent);
  }

  private renderSchema(schema: SchemaOrRef, indent: number): string {
    if (isReference(schema)) {
      return this.renderRef(schema.$ref);
    }

    const combinedType = this.renderCombinationType(schema, indent);
    if (combinedType) {
      return schema.nullable ? `${combinedType}.nullable()` : combinedType;
    }

    if (schema.enum && schema.enum.length > 0) {
      const enumType = this.renderEnum(schema.enum);
      return schema.nullable ? `${enumType}.nullable()` : enumType;
    }

    let resultType: string;
    switch (schema.type) {
      case 'string':
        resultType = 'z.string()';
        break;
      case 'number':
      case 'integer':
        resultType = 'z.number()';
        break;
      case 'boolean':
        resultType = 'z.boolean()';
        break;
      case 'array':
        resultType = this.renderArray(schema as OpenAPIV3.ArraySchemaObject, indent);
        break;
      case 'object':
        resultType = this.renderObject(schema as OpenAPIV3.NonArraySchemaObject, indent);
        break;
      default:
        if ('properties' in schema || 'additionalProperties' in schema) {
          resultType = this.renderObject(schema as OpenAPIV3.NonArraySchemaObject, indent);
        } else {
          resultType = 'z.unknown()';
        }
    }

    return schema.nullable ? `${resultType}.nullable()` : resultType;
  }

  private renderCombinationType(schema: OpenAPIV3.SchemaObject, indent: number): string | undefined {
    if (schema.allOf && schema.allOf.length > 0) {
      const members = schema.allOf.map(s => this.renderSchema(s, indent));
      if (members.length === 1) return members[0];
      return `z.intersection(${members.join(', ')})`;
    }

    if (schema.oneOf && schema.oneOf.length > 0) {
      const members = schema.oneOf.map(s => this.renderSchema(s, indent));
      if (members.length === 1) return members[0];
      return `z.union([${members.join(', ')}])`;
    }

    if (schema.anyOf && schema.anyOf.length > 0) {
      const members = schema.anyOf.map(s => this.renderSchema(s, indent));
      if (members.length === 1) return members[0];
      return `z.union([${members.join(', ')}])`;
    }

    return undefined;
  }

  private renderArray(schema: OpenAPIV3.ArraySchemaObject, indent: number): string {
    const items = schema.items;
    if (!items) {
      return 'z.array(z.unknown())';
    }
    const elementType = this.renderSchema(items, indent);
    return `z.array(${elementType})`;
  }

  private renderObject(schema: OpenAPIV3.NonArraySchemaObject, indent: number): string {
    const properties = schema.properties;
    const additionalProps = schema.additionalProperties;
    const required = new Set(schema.required ?? []);

    if (!properties || Object.keys(properties).length === 0) {
      if (additionalProps === undefined) {
        return 'z.record(z.string(), z.unknown())';
      }
      if (additionalProps === true) {
        return 'z.record(z.string(), z.unknown())';
      }
      if (additionalProps === false) {
        return 'z.object({})';
      }
      const valueType = this.renderSchema(additionalProps, indent);
      return `z.record(z.string(), ${valueType})`;
    }

    const baseIndent = this.options.indentString.repeat(indent);
    const propIndent = this.options.indentString.repeat(indent + 1);

    const lines = Object.entries(properties).map(([name, propSchema]) => {
      const formattedName = formatPropertyName(name);
      const isRequired = required.has(name);
      let zodType = this.renderSchema(propSchema, indent + 1);
      if (!isRequired) {
        zodType = `${zodType}.optional()`;
      }
      return `${propIndent}${formattedName}: ${zodType},`;
    });

    return `z.object({\n${lines.join('\n')}\n${baseIndent}})`;
  }

  private renderEnum(values: unknown[]): string {
    const stringValues = values.filter((v): v is string => typeof v === 'string');
    if (stringValues.length === values.length && stringValues.length > 0) {
      const escaped = stringValues.map(v => `'${v.replace(/'/g, "\\'")}'`);
      return `z.enum([${escaped.join(', ')}])`;
    }

    const literals = values.map(v => this.renderLiteral(v));
    if (literals.length === 1) {
      return literals[0];
    }
    return `z.union([${literals.join(', ')}])`;
  }

  private renderLiteral(value: unknown): string {
    if (value === null) {
      return 'z.null()';
    }
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "\\'");
      return `z.literal('${escaped}')`;
    }
    if (typeof value === 'number') {
      return `z.literal(${value})`;
    }
    if (typeof value === 'boolean') {
      return `z.literal(${value})`;
    }
    return 'z.unknown()';
  }

  private renderRef(ref: string): string {
    const name = extractSchemaName(ref);
    if (!name) {
      return 'z.unknown()';
    }
    const schemaName = `${pascalCase(name)}${this.options.modelSuffix}Schema`;
    return `z.lazy(() => ${schemaName})`;
  }
}

