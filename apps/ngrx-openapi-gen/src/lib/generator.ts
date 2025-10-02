/**
 * Main Generator - Orchestrates parsing and code generation.
 * Entry point for the OpenAPI to NgRx Signal Store generation pipeline.
 */

import { Project, IndentationText, QuoteKind } from 'ts-morph';
import { kebabCase } from 'change-case';
import { OpenApiParser, OpenApiDocument } from './parser';
import { ApiSpec, ApiSpecOptions } from './spec';
import { EntityGenerator, StoreGenerator, buildEntityIndex } from './codegen';

/**
 * Options for the generator
 */
export interface GeneratorOptions {
  /**
   * Name for the generated API
   */
  apiName: string;
  /**
   * Base path injection token name (auto-generated if not provided)
   */
  basePathToken?: string;
  /**
   * Model suffix for entity interfaces (default: 'Model')
   */
  modelSuffix?: string;
}

/**
 * Result of code generation
 */
export interface GeneratedFile {
  /**
   * Path relative to output root
   */
  path: string;
  /**
   * File contents
   */
  content: string;
}

/**
 * Main generator that orchestrates the full pipeline
 */
export class Generator {
  private readonly parser: OpenApiParser;
  private readonly entityGenerator: EntityGenerator;
  private readonly apiSlug: string;

  constructor(private readonly options: GeneratorOptions) {
    this.parser = new OpenApiParser();
    this.entityGenerator = new EntityGenerator({
      modelSuffix: options.modelSuffix ?? 'Model',
    });
    this.apiSlug = kebabCase(options.apiName);
  }

  /**
   * Generate all files from an OpenAPI document
   */
  generate(document: OpenApiDocument): GeneratedFile[] {
    // Phase 1: Parse OpenAPI into ApiSpec
    const spec = this.parseDocument(document);

    // Phase 2: Generate code from ApiSpec
    return this.generateCode(spec);
  }

  /**
   * Parse OpenAPI document into ApiSpec (exposed for debugging)
   */
  parseDocument(document: OpenApiDocument): ApiSpec {
    const specOptions: ApiSpecOptions = {
      apiName: this.options.apiName,
      basePathToken: this.options.basePathToken,
    };

    return this.parser.parse(document, specOptions);
  }

  /**
   * Generate code from ApiSpec
   */
  generateCode(spec: ApiSpec): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const entityIndex = buildEntityIndex(spec.domains);

    // Generate base path token file (in API-specific folder)
    files.push(this.generateBasePathToken(spec.basePathToken));

    // Generate entity models
    for (const domain of spec.domains) {
      const entityFiles = this.entityGenerator.generateDomainEntities(domain, entityIndex);
      for (const entityFile of entityFiles) {
        files.push({
          path: `${this.apiSlug}/${entityFile.path}`,
          content: entityFile.content,
        });
      }
    }

    // Generate store files
    const storeGenerator = new StoreGenerator({
      basePathToken: spec.basePathToken,
      modelSuffix: this.options.modelSuffix ?? 'Model',
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

/**
 * Convenience function for quick generation
 */
export function generateFromOpenApi(
  document: OpenApiDocument,
  options: GeneratorOptions
): GeneratedFile[] {
  const generator = new Generator(options);
  return generator.generate(document);
}
