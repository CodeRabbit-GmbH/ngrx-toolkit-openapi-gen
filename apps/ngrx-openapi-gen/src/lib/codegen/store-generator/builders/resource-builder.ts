import { pascalCase, camelCase } from 'change-case';
import { OperationSpec } from '../../../spec';
import { ObjectProperty, BuilderContext } from '../types';
import { pluralize } from '../../utils';
import { buildUrlExpression, deriveResourceNameFromPath } from '../helpers';
import { createWriter } from './writer-utils';

function writeCollectionResourceWithParams(
  resourceKey: string,
  typeString: string,
  urlExpr: string,
  schemaName: string | undefined,
  zodValidation: boolean
): string {
  const writer = createWriter();
  const paramsKey = `${resourceKey}Params`;

  writer.write(`httpResource<${typeString}>(() => (`);
  writer.inlineBlock(() => {
    writer.writeLine(`url: \`\${store._baseUrl}${urlExpr}\`,`);
    if (zodValidation && schemaName) {
      writer.writeLine(`params: store.${paramsKey}(),`);
      writer.write(
        `parse: (data: unknown) => z.array(${schemaName}).parse(data)`
      );
    } else {
      writer.write(`params: store.${paramsKey}()`);
    }
  });
  writer.write('), { defaultValue: [] })');

  return writer.toString();
}

function writeCollectionResourceSimple(
  typeString: string,
  urlExpr: string,
  schemaName: string | undefined,
  zodValidation: boolean
): string {
  const writer = createWriter();

  if (zodValidation && schemaName) {
    writer.write(`httpResource<${typeString}>(() => ({`);
    writer.newLine();
    writer.indent(() => {
      writer.writeLine(`url: \`\${store._baseUrl}${urlExpr}\`,`);
      writer.write(
        `parse: (data: unknown) => z.array(${schemaName}).parse(data)`
      );
    });
    writer.newLine();
    writer.write('}), { defaultValue: [] })');
  } else {
    writer
      .writeLine(`httpResource<${typeString}>(`)
      .indent(() => {
        writer.writeLine(`() => \`\${store._baseUrl}${urlExpr}\`,`);
        writer.write('{ defaultValue: [] }');
      })
      .newLine()
      .write(')');
  }

  return writer.toString();
}

export function buildCollectionResource(
  op: OperationSpec,
  hasParams: boolean,
  ctx: BuilderContext
): ObjectProperty | null {
  let resourceKey: string;
  let typeString: string;
  let schemaName: string | undefined;

  if (op.entity) {
    resourceKey = camelCase(pluralize(op.entity.name));
    typeString = `${pascalCase(op.entity.name)}${ctx.modelSuffix}[]`;
    schemaName = `${pascalCase(op.entity.name)}${ctx.modelSuffix}Schema`;
  } else if (op.responseSchema) {
    resourceKey = camelCase(
      op.operationId || deriveResourceNameFromPath(op.path)
    );
    typeString = ctx.renderType(op.responseSchema);
  } else {
    return null;
  }

  const urlExpr = buildUrlExpression(op.path, []);

  if (hasParams) {
    return {
      name: resourceKey,
      value: writeCollectionResourceWithParams(
        resourceKey,
        typeString,
        urlExpr,
        schemaName,
        ctx.zodValidation
      ),
    };
  }

  return {
    name: resourceKey,
    value: writeCollectionResourceSimple(
      typeString,
      urlExpr,
      schemaName,
      ctx.zodValidation
    ),
  };
}

export function buildDetailResource(
  op: OperationSpec,
  ctx: BuilderContext
): ObjectProperty | null {
  if (!op.entity) return null;

  const entityName = pascalCase(op.entity.name);
  const entityNameCamel = camelCase(op.entity.name);
  const modelName = `${entityName}${ctx.modelSuffix}`;
  const schemaName = `${entityName}${ctx.modelSuffix}Schema`;
  const resourceKey = `${entityNameCamel}Detail`;
  const selectedIdKey = `selected${entityName}Id`;
  const idParam = op.pathParams[0];
  const urlPath = op.path.replace(
    `{${idParam?.name || 'id'}}`,
    `\${store.${selectedIdKey}()}`
  );

  const writer = createWriter();

  if (ctx.zodValidation) {
    writer.write(`httpResource<${modelName} | undefined>(() => {`);
    writer.newLine();
    writer.indent(() => {
      writer.writeLine(`const id = store.${selectedIdKey}();`);
      writer.writeLine('if (id === undefined) return undefined;');
      writer.writeLine('return {');
      writer.indent(() => {
        writer.writeLine(`url: \`\${store._baseUrl}${urlPath}\`,`);
        writer.write(`parse: (data: unknown) => ${schemaName}.parse(data)`);
      });
      writer.newLine();
      writer.write('};');
    });
    writer.newLine();
    writer.write('})');
  } else {
    writer
      .writeLine(`httpResource<${modelName} | undefined>(`)
      .indent(() => {
        writer.write(`() => store.${selectedIdKey}() === undefined`);
        writer.newLine();
        writer.indent(() => {
          writer.writeLine('? undefined');
          writer.write(`: \`\${store._baseUrl}${urlPath}\``);
        });
      })
      .newLine()
      .write(')');
  }

  return {
    name: resourceKey,
    value: writer.toString(),
  };
}

export function buildWithResource(
  collectionOps: readonly OperationSpec[],
  detailOps: readonly OperationSpec[],
  collectionsWithParams: readonly OperationSpec[],
  ctx: BuilderContext
): string {
  const resourceProps: ObjectProperty[] = [];

  for (const op of collectionOps) {
    const resource = buildCollectionResource(
      op,
      collectionsWithParams.includes(op),
      ctx
    );
    if (resource) {
      resourceProps.push(resource);
    }
  }

  for (const op of detailOps) {
    const resource = buildDetailResource(op, ctx);
    if (resource) {
      resourceProps.push(resource);
    }
  }

  const writer = createWriter();
  writer.write('withResource((store) => ({');
  writer.newLine();
  writer.indent(() => {
    resourceProps.forEach((p, index) => {
      writer.write(`${p.name}: ${p.value}`);
      if (index < resourceProps.length - 1) {
        writer.write(',');
        writer.blankLine();
      }
    });
  });
  writer.newLine();
  writer.write('}))');

  return writer.toString();
}
