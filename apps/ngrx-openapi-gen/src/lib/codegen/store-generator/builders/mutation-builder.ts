import { CodeBlockWriter } from 'ts-morph';
import { pascalCase, camelCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import { pluralize } from '../../utils';
import { buildUrlExpression, buildParamsTypeName } from '../helpers';
import { createWriter } from './writer-utils';

function buildEntityBasedName(op: OperationSpec): string | undefined {
  if (!op.entity) return undefined;

  const entityName = pascalCase(op.entity.name);
  switch (op.method) {
    case 'post':
      return `create${entityName}`;
    case 'put':
    case 'patch':
      return `update${entityName}`;
    case 'delete':
      return `remove${entityName}`;
    default:
      return undefined;
  }
}

function buildPathBasedName(op: OperationSpec): string {
  return camelCase(`${op.method}_${op.path.replace(/[{}\/]/g, '_')}`);
}

function buildOperationIdName(op: OperationSpec): string {
  if (op.operationId) {
    return camelCase(op.operationId);
  }
  return buildEntityBasedName(op) ?? buildPathBasedName(op);
}

export function buildMutationMethodName(
  op: OperationSpec,
  ctx: BuilderContext
): string {
  if (ctx.preferEntityNames) {
    return buildEntityBasedName(op) ?? buildOperationIdName(op);
  }
  if (op.operationId) {
    return camelCase(op.operationId);
  }
  return buildEntityBasedName(op) ?? buildPathBasedName(op);
}

export function buildMutationInputType(
  op: OperationSpec,
  hasPathParams: boolean,
  hasBody: boolean,
  ctx: BuilderContext
): string {
  if (hasPathParams && hasBody && op.requestBody) {
    const bodyType = ctx.renderType(op.requestBody);
    const paramFields = op.pathParams
      .map((p) => `${camelCase(p.name)}: ${ctx.renderType(p.schema)}`)
      .join('; ');
    return `{ ${paramFields}; body: ${bodyType} }`;
  }

  if (hasBody && op.requestBody) {
    return ctx.renderType(op.requestBody);
  }

  if (hasBody && !op.requestBody) {
    if (hasPathParams) {
      const paramFields = op.pathParams
        .map((p) => `${camelCase(p.name)}: ${ctx.renderType(p.schema)}`)
        .join('; ');
      return `{ ${paramFields}; body?: unknown }`;
    }
    return 'unknown';
  }

  if (hasPathParams) {
    return buildParamsTypeName(op);
  }

  return 'void';
}

export function buildMutationOutputType(
  op: OperationSpec,
  ctx: BuilderContext
): string {
  if (op.responseSchema) {
    return ctx.renderType(op.responseSchema);
  }
  if (op.entity) {
    return `${pascalCase(op.entity.name)}${ctx.modelSuffix}`;
  }
  return 'void';
}

function writeRequestObject(
  writer: CodeBlockWriter,
  urlExpr: string,
  method: string,
  hasBody: boolean,
  hasPathParams: boolean
): void {
  writer.writeLine(`url: \`\${store._baseUrl}${urlExpr}\`,`);
  writer.write(`method: '${method.toUpperCase()}'`);

  if (hasBody) {
    writer.write(',');
    writer.newLine();
    writer.write(hasPathParams ? 'body: input.body' : 'body: input');
  }
}

function writeMutationValue(
  inputType: string,
  outputType: string,
  urlExpr: string,
  method: string,
  paramsArg: string,
  hasBody: boolean,
  hasPathParams: boolean,
  collectionResourceName: string | undefined,
  schemaName: string | undefined,
  zodValidation: boolean
): string {
  const writer = createWriter();

  writer.write(`httpMutation<${inputType}, ${outputType}>({`);
  writer.newLine();
  writer.indent(() => {
    writer.write(`request: (${paramsArg}) => ({`);
    writer.newLine();
    writer.indent(() => {
      writeRequestObject(writer, urlExpr, method, hasBody, hasPathParams);
    });
    writer.newLine();
    writer.write('})');

    if (zodValidation && schemaName) {
      writer.write(',');
      writer.newLine();
      writer.write(`parse: (data) => ${schemaName}.parse(data)`);
    }

    if (collectionResourceName) {
      writer.write(',');
      writer.newLine();
      writer.write('onSuccess: () => {');
      writer.newLine();
      writer.indent(() => {
        writer.write(`store._${collectionResourceName}Reload();`);
      });
      writer.newLine();
      writer.write('}');
    }
  });
  writer.newLine();
  writer.write('})');

  return writer.toString();
}

export function buildMutation(
  op: OperationSpec,
  collectionResourceName: string | undefined,
  ctx: BuilderContext,
  overrideName?: string
): ObjectProperty {
  const methodName = overrideName ?? buildMutationMethodName(op, ctx);
  const hasPathParams = op.pathParams.length > 0;
  const hasBody = ['post', 'put', 'patch'].includes(op.method);
  const inputType = buildMutationInputType(op, hasPathParams, hasBody, ctx);
  const outputType = buildMutationOutputType(op, ctx);
  const urlExpr = buildUrlExpression(op.path, op.pathParams);
  const paramsArg = hasPathParams || hasBody ? 'input' : '_';

  let schemaName: string | undefined;
  if (op.entity) {
    schemaName = `${pascalCase(op.entity.name)}${ctx.modelSuffix}Schema`;
  }

  const value = writeMutationValue(
    inputType,
    outputType,
    urlExpr,
    op.method,
    paramsArg,
    hasBody,
    hasPathParams,
    collectionResourceName,
    schemaName,
    ctx.zodValidation
  );

  return { name: methodName, value };
}

export function findCollectionResourceName(
  op: OperationSpec,
  collectionOps: readonly OperationSpec[]
): string | undefined {
  if (op.entity) {
    const matchingCollection = collectionOps.find(
      (collOp) => collOp.entity?.name === op.entity?.name
    );
    if (matchingCollection?.entity) {
      return camelCase(pluralize(matchingCollection.entity.name));
    }
  } else if (collectionOps.length > 0) {
    const firstCollection = collectionOps[0];
    if (firstCollection?.entity) {
      return camelCase(pluralize(firstCollection.entity.name));
    }
  }
  return undefined;
}

export function buildWithMutations(
  mutationOps: readonly OperationSpec[],
  collectionOps: readonly OperationSpec[],
  ctx: BuilderContext
): string {
  const mutations: ObjectProperty[] = [];
  const usedNames = new Set<string>();

  for (const op of mutationOps) {
    const collectionResourceName = findCollectionResourceName(
      op,
      collectionOps
    );
    let methodName = buildMutationMethodName(op, ctx);

    if (ctx.preferEntityNames && usedNames.has(methodName) && op.operationId) {
      methodName = camelCase(op.operationId);
    }
    usedNames.add(methodName);

    const mutation = buildMutation(op, collectionResourceName, ctx, methodName);
    mutations.push(mutation);
  }

  const writer = createWriter();
  writer.write('withMutations((store) => ({');
  writer.newLine();
  writer.indent(() => {
    mutations.forEach((m, index) => {
      writer.write(`${m.name}: ${m.value}`);
      if (index < mutations.length - 1) {
        writer.write(',');
        writer.blankLine();
      }
    });
  });
  writer.newLine();
  writer.write('}))');

  return writer.toString();
}
