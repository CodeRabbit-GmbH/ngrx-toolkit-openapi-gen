import { SourceFile, Writers } from 'ts-morph';
import { pascalCase, camelCase, kebabCase } from 'change-case';
import {
  DomainSpec,
  OperationSpec,
  isReference,
  extractSchemaName,
} from '../../spec';
import { BuilderContext } from './types';
import { buildParamsTypeName } from './helpers';
import { ParamSchemaInfo } from './builders/params-schema-builder';

function collectUsedEntities(
  operations: readonly OperationSpec[]
): Set<string> {
  const used = new Set<string>();
  for (const op of operations) {
    if (op.entity) {
      used.add(op.entity.name);
    }
  }
  return used;
}

export interface ImportOptions {
  hasCollections: boolean;
  hasMutations: boolean;
  hasDetails: boolean;
  hasState: boolean;
  hasMethods: boolean;
  hasEntityCollections: boolean;
}

export function addImports(
  sourceFile: SourceFile,
  domain: DomainSpec,
  options: ImportOptions,
  mutationOps: OperationSpec[],
  ctx: BuilderContext
): void {
  sourceFile.addImportDeclaration({
    namedImports: ['inject'],
    moduleSpecifier: '@angular/core',
  });

  const hasResources = options.hasCollections || options.hasDetails;
  if (hasResources) {
    sourceFile.addImportDeclaration({
      namedImports: ['httpResource'],
      moduleSpecifier: '@angular/common/http',
    });
  }

  // Only include zod if validation is enabled AND we have entity-based collections or details
  const includeZod =
    ctx.zodValidation && (options.hasEntityCollections || options.hasDetails);

  if (includeZod) {
    sourceFile.addImportDeclaration({
      namedImports: ['z'],
      moduleSpecifier: 'zod',
    });
  }

  // Build @ngrx/signals imports based on what's actually needed
  const ngrxImports: string[] = [
    'signalStore',
    'signalStoreFeature',
    'withProps',
  ];

  if (options.hasMethods) {
    ngrxImports.push('patchState', 'withMethods');
  }
  if (options.hasState) {
    ngrxImports.push('withState');
  }

  sourceFile.addImportDeclaration({
    namedImports: ngrxImports.sort(),
    moduleSpecifier: '@ngrx/signals',
  });

  const toolkitImports: string[] = [];
  if (hasResources) {
    toolkitImports.push('withResource');
  }
  if (options.hasMutations) {
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
    moduleSpecifier: ctx.sharedEntities
      ? '../api-base-path.token'
      : '../../api-base-path.token',
  });

  const usedEntities = collectUsedEntities(domain.operations);
  for (const entity of domain.entities) {
    if (!usedEntities.has(entity.name)) continue;

    const entitySlug = kebabCase(entity.name);
    const modelName = `${pascalCase(entity.name)}${ctx.modelSuffix}`;
    const schemaName = `${modelName}Schema`;
    const basePath = ctx.sharedEntities ? '../shared/entities' : '../entities';

    if (ctx.zodValidation) {
      sourceFile.addImportDeclaration({
        namedImports: [schemaName],
        moduleSpecifier: `${basePath}/${entitySlug}.model`,
      });
      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [modelName],
        moduleSpecifier: `${basePath}/${entitySlug}.model`,
      });
    } else {
      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [modelName],
        moduleSpecifier: `${basePath}/${entitySlug}.model`,
      });
    }
  }

  const importedRequestBodies = new Set<string>();
  for (const op of mutationOps) {
    if (op.requestBody && isReference(op.requestBody)) {
      const refName = extractSchemaName(op.requestBody.$ref);
      if (refName) {
        const modelName = `${pascalCase(refName)}${ctx.modelSuffix}`;
        const isUsedEntity = usedEntities.has(refName);
        if (!isUsedEntity && !importedRequestBodies.has(modelName)) {
          importedRequestBodies.add(modelName);
          const modelSlug = kebabCase(refName);
          const basePath = ctx.sharedEntities
            ? '../shared/entities'
            : '../entities';
          sourceFile.addImportDeclaration({
            isTypeOnly: true,
            namedImports: [modelName],
            moduleSpecifier: `${basePath}/${modelSlug}.model`,
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

export function addSchemaImports(
  sourceFile: SourceFile,
  paramSchemas: ParamSchemaInfo[],
  domainSlug: string
): void {
  if (paramSchemas.length === 0) return;

  const schemaNames = paramSchemas.map((s) => s.schemaName);
  sourceFile.addImportDeclaration({
    namedImports: schemaNames,
    moduleSpecifier: `./${domainSlug}.schemas`,
  });
}
