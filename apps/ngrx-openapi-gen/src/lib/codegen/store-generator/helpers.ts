import { pascalCase, camelCase } from 'change-case';
import { OpenAPIV3 } from 'openapi-types';
import { SchemaOrRef, ParamSpec, OperationSpec } from '../../spec';

export function isReference(
  schema: SchemaOrRef
): schema is OpenAPIV3.ReferenceObject {
  return '$ref' in schema;
}

export function extractRefName(ref: string): string | undefined {
  const match = /#\/components\/schemas\/(.+)$/.exec(ref);
  return match?.[1];
}

/**
 * Derives resource name from URL path segment.
 * Example: /api/v1/categories → "categories"
 */
export function deriveResourceNameFromPath(path: string): string {
  const segments = path.split('/').filter((s) => s && !s.startsWith('{'));
  return segments[segments.length - 1] || 'items';
}

export function buildUrlExpression(
  path: string,
  pathParams: readonly ParamSpec[],
  paramVarName = 'input'
): string {
  let template = path;
  for (const param of pathParams) {
    const paramCamel = camelCase(param.name);
    template = template.replace(
      `{${param.name}}`,
      `\${${paramVarName}.${paramCamel}}`
    );
  }
  return template;
}

/**
 * Builds suffix like "ById" or "ByUserIdAndTaskId" for type names.
 */
export function buildParamSuffix(params: readonly ParamSpec[]): string {
  if (params.length === 0) return '';
  return 'By' + params.map((p) => pascalCase(p.name)).join('And');
}

export function buildParamsTypeName(op: OperationSpec): string {
  if (op.entity) {
    const entityName = pascalCase(op.entity.name);
    const paramSuffix = buildParamSuffix(op.pathParams);
    return `${entityName}${paramSuffix}Params`;
  }
  return `${pascalCase(op.operationId)}Params`;
}

export function canWriteCollectionResource(op: OperationSpec): boolean {
  return !!(op.entity || op.responseSchema);
}

export function canWriteDetailResource(op: OperationSpec): boolean {
  return !!op.entity;
}
