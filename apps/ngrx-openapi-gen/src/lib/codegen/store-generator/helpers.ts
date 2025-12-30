import { pascalCase, camelCase } from 'change-case';
import { ParamSpec, OperationSpec } from '../../spec';
import { pluralize } from '../utils';
import { BuilderContext } from './types';

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

/**
 * Builds a stable collection key. Defaults to pluralized entity name, but when
 * multiple collection operations target the same entity we fall back to
 * operationId to avoid name collisions.
 */
export function buildCollectionKey(
  op: OperationSpec,
  ctx: Pick<BuilderContext, 'duplicateCollectionEntities'>
): string {
  if (op.entity && ctx.duplicateCollectionEntities.has(op.entity.name)) {
    return camelCase(op.operationId ?? pluralize(op.entity.name));
  }

  if (op.entity) {
    return camelCase(pluralize(op.entity.name));
  }

  return camelCase(op.operationId ?? deriveResourceNameFromPath(op.path));
}

export function canWriteCollectionResource(op: OperationSpec): boolean {
  return !!(op.entity || op.responseSchema);
}

export function canWriteDetailResource(op: OperationSpec): boolean {
  return !!op.entity && op.pathParams.length > 0;
}

/**
 * Renders query/path params as TypeScript inline type fields.
 * Example: "status?: string; limit?: number"
 */
export function renderParamFields(
  params: readonly ParamSpec[],
  renderType: (schema: unknown) => string
): string {
  return params
    .map(
      (p) =>
        `${camelCase(p.name)}${p.required ? '' : '?'}: ${renderType(p.schema)}`
    )
    .join('; ');
}

/** OperationSpec with a guaranteed entity (non-null). */
export type OperationWithEntity = OperationSpec & {
  entity: NonNullable<OperationSpec['entity']>;
};

/**
 * Yields unique detail operations by entity name.
 * Prevents duplicate state/methods when multiple detail ops exist for the same entity.
 * Returns ops with guaranteed entity (type-narrowed).
 */
export function* uniqueDetailOps(
  detailOps: readonly OperationSpec[]
): Generator<OperationWithEntity> {
  const seen = new Set<string>();
  for (const op of detailOps) {
    if (!op.entity || seen.has(op.entity.name)) continue;
    seen.add(op.entity.name);
    yield op as OperationWithEntity;
  }
}
