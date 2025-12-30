import {
  Project,
  SourceFile,
  IndentationText,
  QuoteKind,
  VariableDeclarationKind,
} from 'ts-morph';
import { kebabCase, pascalCase } from 'change-case';
import { pluralize } from '../utils';
import { DomainSpec } from '../../spec';
import { TypeRenderer } from '../type-renderer';
import { ZodRenderer } from '../zod-renderer';
import {
  StoreGeneratorOptions,
  ResolvedStoreGeneratorOptions,
  GeneratedStore,
  BuilderContext,
} from './types';
import { canWriteCollectionResource, canWriteDetailResource } from './helpers';
import {
  addImports,
  addTypeAliases,
  addSchemaImports,
  ImportOptions,
} from './import-builder';
import {
  buildWithProps,
  buildStateProperties,
  buildWithState,
  buildWithResource,
  buildWithMethods,
  buildWithMutations,
  buildParamSchemas,
  buildSchemaFileContent,
} from './builders';

export { StoreGeneratorOptions, GeneratedStore, GeneratedFile } from './types';

export class StoreGenerator {
  private readonly options: ResolvedStoreGeneratorOptions;
  private readonly typeRenderer: TypeRenderer;
  private readonly zodRenderer: ZodRenderer;
  private readonly project: Project;

  constructor(options: StoreGeneratorOptions) {
    this.options = {
      basePathToken: options.basePathToken,
      modelSuffix: options.modelSuffix ?? 'Model',
      zodValidation: options.zodValidation ?? false,
      preferEntityNames: options.preferEntityNames ?? false,
      sharedEntities: options.sharedEntities ?? false,
    };
    this.typeRenderer = new TypeRenderer({
      modelSuffix: this.options.modelSuffix,
    });
    this.zodRenderer = new ZodRenderer({
      modelSuffix: this.options.modelSuffix,
    });
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        declaration: true,
        strict: true,
      },
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        quoteKind: QuoteKind.Single,
      },
    });
  }

  private createContext(
    duplicateCollectionEntities: ReadonlySet<string>
  ): BuilderContext {
    return {
      basePathToken: this.options.basePathToken,
      modelSuffix: this.options.modelSuffix,
      zodValidation: this.options.zodValidation,
      preferEntityNames: this.options.preferEntityNames,
      sharedEntities: this.options.sharedEntities,
      duplicateCollectionEntities,
      renderType: (schema: unknown) =>
        this.typeRenderer.render(
          schema as Parameters<TypeRenderer['render']>[0]
        ),
      renderZod: (schema: unknown) =>
        this.zodRenderer.render(schema as Parameters<ZodRenderer['render']>[0]),
    };
  }

  generateStore(domain: DomainSpec): GeneratedStore {
    const domainSlug = kebabCase(domain.name);
    const storeName = `${pascalCase(domain.name)}Store`;
    const storeDir = this.options.sharedEntities
      ? domainSlug
      : `${domainSlug}/application`;
    const storeFilePath = `${storeDir}/${domainSlug}.store.ts`;
    const schemasFilePath = `${storeDir}/${domainSlug}.schemas.ts`;

    const collectionOps = domain.operations.filter(
      (op) => op.kind === 'collection'
    );
    const detailOps = domain.operations.filter((op) => op.kind === 'detail');
    const mutationOps = domain.operations.filter(
      (op) => op.kind === 'mutation'
    );

    const collectionsWithParams = collectionOps.filter(
      (op) => op.queryParams.length > 0 && op.entity
    );
    const validDetailOps = detailOps.filter(canWriteDetailResource);
    const collectionEntityCounts = new Map<string, number>();
    for (const op of collectionOps) {
      const entityName = op.entity?.name;
      if (!entityName) continue;
      collectionEntityCounts.set(
        entityName,
        (collectionEntityCounts.get(entityName) ?? 0) + 1
      );
    }
    const duplicateCollectionEntities = new Set(
      Array.from(collectionEntityCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
    const ctx = this.createContext(duplicateCollectionEntities);
    const paramSchemas = buildParamSchemas(
      collectionsWithParams,
      validDetailOps,
      ctx
    );

    const sourceFile = this.project.createSourceFile(storeFilePath, '', {
      overwrite: true,
    });

    // Determine which features are actually used for import optimization
    const entityCollections = collectionOps.filter((op) => op.entity);
    const hasState =
      collectionsWithParams.length > 0 || validDetailOps.length > 0;
    const hasMethods =
      validDetailOps.length > 0 || collectionsWithParams.length > 0;

    const importOptions: ImportOptions = {
      hasCollections: collectionOps.length > 0,
      hasMutations: mutationOps.length > 0,
      hasDetails: validDetailOps.length > 0,
      hasState,
      hasMethods,
      hasEntityCollections: entityCollections.length > 0,
    };

    addImports(sourceFile, domain, importOptions, mutationOps, ctx);

    if (paramSchemas.length > 0) {
      addSchemaImports(sourceFile, paramSchemas, domainSlug);
    }

    addTypeAliases(sourceFile, mutationOps, ctx);

    this.addStoreDeclaration(
      sourceFile,
      storeName,
      domain.name,
      collectionOps,
      detailOps,
      mutationOps,
      ctx
    );

    sourceFile.formatText();

    const result: GeneratedStore = {
      store: {
        path: storeFilePath,
        content: sourceFile.getFullText(),
      },
    };

    if (paramSchemas.length > 0) {
      result.schemas = {
        path: schemasFilePath,
        content: buildSchemaFileContent(paramSchemas),
      };
    }

    return result;
  }

  private addStoreDeclaration(
    sourceFile: SourceFile,
    storeName: string,
    domainName: string,
    collectionOps: DomainSpec['operations'],
    detailOps: DomainSpec['operations'],
    mutationOps: DomainSpec['operations'],
    ctx: BuilderContext
  ): void {
    const collectionsWithParams = collectionOps.filter(
      (op) => op.queryParams.length > 0 && op.entity
    );
    const validCollectionOps = collectionOps.filter(canWriteCollectionResource);
    const validDetailOps = detailOps.filter(canWriteDetailResource);

    const hasResources =
      validCollectionOps.length > 0 || validDetailOps.length > 0;
    const hasMethods =
      validDetailOps.length > 0 || collectionsWithParams.length > 0;
    const hasMutations = mutationOps.length > 0;

    const features: string[] = [];

    features.push(buildWithProps(ctx.basePathToken));

    const stateProperties = buildStateProperties(
      collectionsWithParams,
      validDetailOps,
      ctx
    );
    if (stateProperties.length > 0) {
      features.push(buildWithState(stateProperties));
    }

    if (hasResources) {
      features.push(
        buildWithResource(
          validCollectionOps,
          validDetailOps,
          collectionsWithParams,
          ctx
        )
      );
    }

    if (hasMethods) {
      features.push(
        buildWithMethods(collectionsWithParams, validDetailOps, ctx)
      );
    }

    if (hasMutations) {
      features.push(buildWithMutations(mutationOps, collectionOps, ctx));
    }

    const featureName = `with${pascalCase(pluralize(domainName))}`;

    sourceFile.addFunction({
      isExported: true,
      name: featureName,
      typeParameters: ['_'],
      statements: `return signalStoreFeature(\n  ${features.join(
        ',\n\n  '
      )}\n);`,
    });

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: storeName,
          initializer: `signalStore(\n  { providedIn: 'root' },\n  ${featureName}()\n)`,
        },
      ],
    });
  }
}
