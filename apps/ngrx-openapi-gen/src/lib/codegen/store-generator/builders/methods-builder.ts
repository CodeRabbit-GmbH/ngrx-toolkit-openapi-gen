import { pascalCase, camelCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import { pluralize } from '../../utils';

export function buildWithMethods(
  collectionsWithParams: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  ctx: BuilderContext
): string {
  const methods: ObjectProperty[] = [];

  for (const op of collectionsWithParams) {
    if (!op.entity) continue;
    const resourceKey = camelCase(pluralize(op.entity.name));
    const paramFields = op.queryParams
      .map(p => `${camelCase(p.name)}${p.required ? '' : '?'}: ${ctx.renderType(p.schema)}`)
      .join('; ');
    const methodName = `set${pascalCase(pluralize(op.entity.name))}Params`;

    methods.push({
      name: methodName,
      value: `(params: { ${paramFields} }): void {
      patchState(store, { ${resourceKey}Params: params });
    }`,
    });
  }

  const addedDetailEntities = new Set<string>();
  for (const op of detailOps) {
    if (!op.entity || addedDetailEntities.has(op.entity.name)) continue;
    addedDetailEntities.add(op.entity.name);

    const entityName = pascalCase(op.entity.name);
    const idParam = op.pathParams[0];
    const idType = idParam ? ctx.renderType(idParam.schema) : 'string';

    methods.push({
      name: `select${entityName}`,
      value: `(id: ${idType} | undefined): void {
      patchState(store, { selected${entityName}Id: id });
    }`,
    });
  }

  const methodsStr = methods
    .map(m => `    ${m.name}${m.value}`)
    .join(',\n\n');

  return `withMethods((store) => ({
${methodsStr}
  }))`;
}
