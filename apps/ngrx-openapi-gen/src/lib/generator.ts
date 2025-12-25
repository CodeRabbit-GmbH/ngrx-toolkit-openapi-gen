import { Project, IndentationText, QuoteKind } from 'ts-morph';
import { kebabCase } from 'change-case';
import { OpenApiParser, OpenApiDocument } from './parser';
import { ApiSpec, ApiSpecOptions } from './spec';
import { EntityGenerator, StoreGenerator, buildEntityIndex } from './codegen';

export interface GeneratorOptions {
  apiName: string;
  basePathToken?: string;
  modelSuffix?: string;
  zodValidation?: boolean;
  preferEntityNames?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export class Generator {
  private readonly parser: OpenApiParser;
  private readonly entityGenerator: EntityGenerator;
  private readonly apiSlug: string;

  constructor(private readonly options: GeneratorOptions) {
    this.parser = new OpenApiParser();
    this.entityGenerator = new EntityGenerator({
      modelSuffix: options.modelSuffix ?? 'Model',
      zodValidation: options.zodValidation ?? false,
    });
    this.apiSlug = kebabCase(options.apiName);
  }

  generate(document: OpenApiDocument): GeneratedFile[] {
    const spec = this.parseDocument(document);
    return this.generateCode(spec);
  }

  parseDocument(document: OpenApiDocument): ApiSpec {
    const specOptions: ApiSpecOptions = {
      apiName: this.options.apiName,
      basePathToken: this.options.basePathToken,
    };

    return this.parser.parse(document, specOptions);
  }

  generateCode(spec: ApiSpec): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const entityIndex = buildEntityIndex(spec.domains);

    files.push(this.generateBasePathToken(spec.basePathToken));

    for (const domain of spec.domains) {
      const entityFiles = this.entityGenerator.generateDomainEntities(
        domain,
        entityIndex
      );
      for (const entityFile of entityFiles) {
        files.push({
          path: `${this.apiSlug}/${entityFile.path}`,
          content: entityFile.content,
        });
      }
    }

    const storeGenerator = new StoreGenerator({
      basePathToken: spec.basePathToken,
      modelSuffix: this.options.modelSuffix ?? 'Model',
      zodValidation: this.options.zodValidation ?? false,
      preferEntityNames: this.options.preferEntityNames ?? false,
    });

    for (const domain of spec.domains) {
      const storeFile = storeGenerator.generateStore(domain);
      files.push({
        path: `${this.apiSlug}/${storeFile.path}`,
        content: storeFile.content,
      });
    }

    return files;
  }

  private generateBasePathToken(tokenName: string): GeneratedFile {
    const project = new Project({
      useInMemoryFileSystem: true,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        quoteKind: QuoteKind.Single,
      },
    });

    const sourceFile = project.createSourceFile('api-base-path.token.ts', '');

    sourceFile.addImportDeclaration({
      namedImports: ['InjectionToken'],
      moduleSpecifier: '@angular/core',
    });

    sourceFile.addStatements(`
/**
 * Injection token for the API base path.
 * Provide this token in your application to configure the base URL for API requests.
 *
 * @example
 * \`\`\`typescript
 * providers: [
 *   { provide: ${tokenName}, useValue: 'https://api.example.com' }
 * ]
 * \`\`\`
 */
export const ${tokenName} = new InjectionToken<string>('${tokenName}');
`);

    sourceFile.formatText();

    return {
      path: `${this.apiSlug}/api-base-path.token.ts`,
      content: sourceFile.getFullText(),
    };
  }
}

export function generateFromOpenApi(
  document: OpenApiDocument,
  options: GeneratorOptions
): GeneratedFile[] {
  const generator = new Generator(options);
  return generator.generate(document);
}
