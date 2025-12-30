import { pascalCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import { getParamSchemaName } from './params-schema-builder';
import {
  buildCollectionKey,
  renderParamFields,
  uniqueDetailOps,
} from '../helpers';

export function buildWithMethods(
  collectionsWithParams: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  ctx: BuilderContext
): string {
  const methods: ObjectProperty[] = [];

  for (const op of collectionsWithParams) {
    if (!op.entity) continue;
    const resourceKey = buildCollectionKey(op, ctx);
    const paramFields = renderParamFields(op.queryParams, ctx.renderType);
    const methodName = `set${pascalCase(resourceKey)}Params`;
    const schemaName = getParamSchemaName(
      op.entity.name,
      false,
      undefined,
      resourceKey
    );
    const validation = ctx.zodValidation
      ? `${schemaName}.parse(params);\n      `
      : '';

    methods.push({
      name: methodName,
      value: `(params: { ${paramFields} }): void {
      ${validation}patchState(store, { ${resourceKey}Params: params });
    }`,
    });
  }

  for (const op of uniqueDetailOps(detailOps)) {
    const entityName = pascalCase(op.entity.name);

    if (op.pathParams.length > 1) {
      const paramsType = renderParamFields(op.pathParams, ctx.renderType);
      methods.push({
        name: `select${entityName}`,
        value: `(params: { ${paramsType} } | undefined): void {
      patchState(store, { selected${entityName}Params: params });
    }`,
      });
    } else {
      const idParam = op.pathParams[0] ?? op.queryParams[0];
      const idType = idParam ? ctx.renderType(idParam.schema) : 'string';
      const schemaName = getParamSchemaName(
        op.entity.name,
        true,
        op.pathParams.length > 0
      );
      const validation =
        ctx.zodValidation && idParam
          ? `if (id !== undefined) { ${schemaName}.parse(id); }\n      `
          : '';

      methods.push({
        name: `select${entityName}`,
        value: `(id: ${idType} | undefined): void {
      ${validation}patchState(store, { selected${entityName}Id: id });
    }`,
      });
    }
  }

  const methodsStr = methods
    .map((m) => `    ${m.name}${m.value}`)
    .join(',\n\n');
  return `withMethods((store) => ({
${methodsStr}
  }))`;
}
