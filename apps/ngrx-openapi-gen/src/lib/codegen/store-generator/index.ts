import {
  Project,
  SourceFile,
  IndentationText,
  QuoteKind,
  VariableDeclarationKind,
} from 'ts-morph';
import { kebabCase, pascalCase } from 'change-case';
import { DomainSpec } from '../../spec';
import { TypeRenderer } from '../type-renderer';
import {
  StoreGeneratorOptions,
  ResolvedStoreGeneratorOptions,
  GeneratedStore,
  BuilderContext,
} from './types';
import { canWriteCollectionResource, canWriteDetailResource } from './helpers';
import { addImports, addTypeAliases } from './import-builder';
import {
  buildWithProps,
  buildStateProperties,
  buildWithState,
  buildWithResource,
  buildWithMethods,
  buildWithMutations,
} from './builders';

export { StoreGeneratorOptions, GeneratedStore } from './types';

export class StoreGenerator {
  private readonly options: ResolvedStoreGeneratorOptions;
  private readonly typeRenderer: TypeRenderer;
  private readonly project: Project;

  constructor(options: StoreGeneratorOptions) {
    this.options = {
      basePathToken: options.basePathToken,
      modelSuffix: options.modelSuffix ?? 'Model',
      zodValidation: options.zodValidation ?? false,
      preferEntityNames: options.preferEntityNames ?? false,
    };
    this.typeRenderer = new TypeRenderer({
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

  private createContext(): BuilderContext {
    return {
      basePathToken: this.options.basePathToken,
      modelSuffix: this.options.modelSuffix,
      zodValidation: this.options.zodValidation,
      preferEntityNames: this.options.preferEntityNames,
      renderType: (schema: unknown) =>
        this.typeRenderer.render(
          schema as Parameters<TypeRenderer['render']>[0]
        ),
    };
  }

  generateStore(domain: DomainSpec): GeneratedStore {
    const domainSlug = kebabCase(domain.name);
    const storeName = `${pascalCase(domain.name)}Store`;
    const filePath = `${domainSlug}/application/${domainSlug}.store.ts`;

    const collectionOps = domain.operations.filter(
      (op) => op.kind === 'collection'
    );
    const detailOps = domain.operations.filter((op) => op.kind === 'detail');
    const mutationOps = domain.operations.filter(
      (op) => op.kind === 'mutation'
    );

    const sourceFile = this.project.createSourceFile(filePath, '', {
      overwrite: true,
    });
    const ctx = this.createContext();

    addImports(
      sourceFile,
      domain,
      collectionOps.length > 0,
      mutationOps.length > 0,
      detailOps.length > 0,
      mutationOps,
      ctx
    );

    addTypeAliases(sourceFile, mutationOps, ctx);

    this.addStoreDeclaration(
      sourceFile,
      storeName,
      collectionOps,
      detailOps,
      mutationOps,
      ctx
    );

    sourceFile.formatText();
    return {
      path: filePath,
      content: sourceFile.getFullText(),
    };
  }

  private addStoreDeclaration(
    sourceFile: SourceFile,
    storeName: string,
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

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: storeName,
          initializer: `signalStore(\n  { providedIn: 'root' },\n\n  ${features.join(
            ',\n\n  '
          )}\n)`,
        },
      ],
    });
  }
}
