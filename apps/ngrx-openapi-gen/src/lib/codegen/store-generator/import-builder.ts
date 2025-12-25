import { SourceFile, Writers } from 'ts-morph';
import { pascalCase, camelCase, kebabCase } from 'change-case';
import { DomainSpec, OperationSpec } from '../../spec';
import { BuilderContext } from './types';
import { isReference, extractRefName, buildParamsTypeName } from './helpers';

export function addImports(
  sourceFile: SourceFile,
  domain: DomainSpec,
  hasCollections: boolean,
  hasMutations: boolean,
  hasDetails: boolean,
  mutationOps: OperationSpec[],
  ctx: BuilderContext
): void {
  sourceFile.addImportDeclaration({
    namedImports: ['inject'],
    moduleSpecifier: '@angular/core',
  });

  const hasResources = hasCollections || hasDetails;
  if (hasResources) {
    sourceFile.addImportDeclaration({
      namedImports: ['httpResource'],
      moduleSpecifier: '@angular/common/http',
    });
  }

  if (ctx.zodValidation) {
    sourceFile.addImportDeclaration({
      namedImports: ['z'],
      moduleSpecifier: 'zod',
    });
  }

  sourceFile.addImportDeclaration({
    namedImports: [
      'patchState',
      'signalStore',
      'withMethods',
      'withProps',
      'withState',
    ],
    moduleSpecifier: '@ngrx/signals',
  });

  const toolkitImports: string[] = [];
  if (hasResources) {
    toolkitImports.push('withResource');
  }
  if (hasMutations) {
    toolkitImports.push('withMutations', 'httpMutation');
  }
  if (toolkitImports.length > 0) {
    sourceFile.addImportDeclaration({
      namedImports: toolkitImports.sort(),
      moduleSpecifier: '@angular-architects/ngrx-toolkit',
    });
  }

  sourceFile.addImportDeclaration({
    namedImports: [ctx.basePathToken],
    moduleSpecifier: '../../api-base-path.token',
  });

  for (const entity of domain.entities) {
    const entitySlug = kebabCase(entity.name);
    const modelName = `${pascalCase(entity.name)}${ctx.modelSuffix}`;
    const schemaName = `${modelName}Schema`;

    if (ctx.zodValidation) {
      sourceFile.addImportDeclaration({
        namedImports: [schemaName],
        moduleSpecifier: `../entities/${entitySlug}.model`,
      });
      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [modelName],
        moduleSpecifier: `../entities/${entitySlug}.model`,
      });
    } else {
      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [modelName],
        moduleSpecifier: `../entities/${entitySlug}.model`,
      });
    }
  }

  const importedRequestBodies = new Set<string>();
  for (const op of mutationOps) {
    if (op.requestBody && isReference(op.requestBody)) {
      const refName = extractRefName(op.requestBody.$ref);
      if (refName) {
        const modelName = `${pascalCase(refName)}${ctx.modelSuffix}`;
        const isEntityModel = domain.entities.some(
          (e) => `${pascalCase(e.name)}${ctx.modelSuffix}` === modelName
        );
        if (!isEntityModel && !importedRequestBodies.has(modelName)) {
          importedRequestBodies.add(modelName);
          const modelSlug = kebabCase(refName);
          sourceFile.addImportDeclaration({
            isTypeOnly: true,
            namedImports: [modelName],
            moduleSpecifier: `../entities/${modelSlug}.model`,
          });
        }
      }
    }
  }
}

export function addTypeAliases(
  sourceFile: SourceFile,
  operations: OperationSpec[],
  ctx: BuilderContext
): void {
  const addedAliases = new Set<string>();

  for (const op of operations) {
    if (op.pathParams.length === 0) continue;

    const hasBody = ['post', 'put', 'patch'].includes(op.method);
    if (hasBody) continue;

    const aliasName = buildParamsTypeName(op);
    if (addedAliases.has(aliasName)) continue;
    addedAliases.add(aliasName);

    sourceFile.addTypeAlias({
      name: aliasName,
      type: Writers.objectType({
        properties: op.pathParams.map((p) => ({
          name: camelCase(p.name),
          type: ctx.renderType(p.schema),
        })),
      }),
    });
  }
}
