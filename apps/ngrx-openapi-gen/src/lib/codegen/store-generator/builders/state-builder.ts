import { pascalCase, camelCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import { pluralize } from '../../utils';

export function buildStateProperties(
  collectionsWithParams: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  ctx: BuilderContext
): ObjectProperty[] {
  const properties: ObjectProperty[] = [];

  for (const op of collectionsWithParams) {
    if (!op.entity) continue;
    const resourceKey = camelCase(pluralize(op.entity.name));
    const paramFields = op.queryParams
      .map(p => `${camelCase(p.name)}${p.required ? '' : '?'}: ${ctx.renderType(p.schema)}`)
      .join('; ');
    properties.push({
      name: `${resourceKey}Params`,
      value: `{} as { ${paramFields} }`,
    });
  }

  const addedDetailEntities = new Set<string>();
  for (const op of detailOps) {
    if (!op.entity || addedDetailEntities.has(op.entity.name)) continue;
    addedDetailEntities.add(op.entity.name);

    const idParam = op.pathParams[0];
    const idType = idParam ? ctx.renderType(idParam.schema) : 'string';
    properties.push({
      name: `selected${pascalCase(op.entity.name)}Id`,
      value: `undefined as ${idType} | undefined`,
    });
  }

  return properties;
}

export function buildWithState(properties: ObjectProperty[]): string {
  const propsStr = properties
    .map(p => `    ${p.name}: ${p.value}`)
    .join(',\n');
  return `withState({
${propsStr}
  })`;
}
