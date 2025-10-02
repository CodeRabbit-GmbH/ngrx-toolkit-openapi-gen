import { OpenAPIV3 } from 'openapi-types';
import { SchemaOrRef } from './domain-spec';

export function isReference(schema: SchemaOrRef): schema is OpenAPIV3.ReferenceObject {
  return '$ref' in schema;
}

export function isArraySchema(schema: OpenAPIV3.SchemaObject): schema is OpenAPIV3.ArraySchemaObject {
  return schema.type === 'array';
}

export function extractSchemaName(ref: string): string | undefined {
  const match = /#\/components\/schemas\/(.+)$/.exec(ref);
  return match?.[1];
}

export function extractParameterName(ref: string): string | undefined {
  const match = /#\/components\/parameters\/(.+)$/.exec(ref);
  return match?.[1];
}
