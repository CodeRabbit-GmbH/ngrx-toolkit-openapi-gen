import { pascalCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import {
  buildCollectionKey,
  renderParamFields,
  uniqueDetailOps,
} from '../helpers';

export function buildStateProperties(
  collectionsWithParams: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  ctx: BuilderContext
): ObjectProperty[] {
  const properties: ObjectProperty[] = [];

  for (const op of collectionsWithParams) {
    if (!op.entity) continue;
    const resourceKey = buildCollectionKey(op, ctx);
    const paramFields = renderParamFields(op.queryParams, ctx.renderType);
    properties.push({
      name: `${resourceKey}Params`,
      value: `{} as { ${paramFields} }`,
    });
  }

  for (const op of uniqueDetailOps(detailOps)) {
    const entityName = pascalCase(op.entity.name);
    if (op.pathParams.length > 1) {
      const paramsType = renderParamFields(op.pathParams, ctx.renderType);
      properties.push({
        name: `selected${entityName}Params`,
        value: `undefined as { ${paramsType} } | undefined`,
      });
    } else {
      const idParam = op.pathParams[0];
      const idType = idParam ? ctx.renderType(idParam.schema) : 'string';
      properties.push({
        name: `selected${entityName}Id`,
        value: `undefined as ${idType} | undefined`,
      });
    }
  }

  return properties;
}

export function buildWithState(properties: ObjectProperty[]): string {
  const propsStr = properties
    .map((p) => `    ${p.name}: ${p.value}`)
    .join(',\n');
  return `withState({
${propsStr}
  })`;
}
