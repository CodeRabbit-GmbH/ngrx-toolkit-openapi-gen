import { camelCase } from 'change-case';
import { OperationSpec, ParamSpec } from '../../../spec';
import { BuilderContext } from '../types';
import { pluralize } from '../../utils';
import { buildCollectionKey, uniqueDetailOps } from '../helpers';

export interface ParamSchemaInfo {
  schemaName: string;
  schemaCode: string;
  entityName: string;
}

export function buildParamSchemas(
  collectionsWithParams: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  ctx: BuilderContext
): ParamSchemaInfo[] {
  if (!ctx.zodValidation) {
    return [];
  }

  const schemas: ParamSchemaInfo[] = [];

  for (const op of collectionsWithParams) {
    if (!op.entity) continue;
    const baseName = buildCollectionKey(op, ctx);
    const schemaName = `${baseName}ParamsSchema`;
    const schemaCode = buildParamsObjectSchema(op.queryParams, ctx);
    schemas.push({
      schemaName,
      schemaCode,
      entityName: pluralize(op.entity.name),
    });
  }

  for (const op of uniqueDetailOps(detailOps)) {
    const entityName = op.entity.name;
    const idParam = op.pathParams[0] ?? op.queryParams[0];

    if (idParam) {
      const schemaName =
        op.pathParams.length > 0
          ? `${camelCase(entityName)}IdSchema`
          : `${camelCase(entityName)}ParamsSchema`;
      const schemaCode = ctx.renderZod(idParam.schema);
      schemas.push({ schemaName, schemaCode, entityName });
    }
  }

  return schemas;
}

function buildParamsObjectSchema(
  params: readonly ParamSpec[],
  ctx: BuilderContext
): string {
  const fields = params.map((p) => {
    const fieldName = camelCase(p.name);
    let zodType = ctx.renderZod(p.schema);
    if (!p.required) {
      zodType = `${zodType}.optional()`;
    }
    return `  ${fieldName}: ${zodType}`;
  });

  return `z.object({\n${fields.join(',\n')}\n})`;
}

export function getParamSchemaName(
  entityName: string,
  isDetailId: boolean,
  hasPathParams?: boolean,
  baseName?: string
): string {
  if (isDetailId) {
    if (hasPathParams) {
      return `${camelCase(entityName)}IdSchema`;
    }
    return `${camelCase(entityName)}ParamsSchema`;
  }
  const base = baseName ?? camelCase(pluralize(entityName));
  return `${base}ParamsSchema`;
}

export function buildSchemaFileContent(schemas: ParamSchemaInfo[]): string {
  if (schemas.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push("import { z } from 'zod';");
  lines.push('');

  for (const { schemaName, schemaCode } of schemas) {
    lines.push(`export const ${schemaName} = ${schemaCode};`);
  }

  return lines.join('\n') + '\n';
}
