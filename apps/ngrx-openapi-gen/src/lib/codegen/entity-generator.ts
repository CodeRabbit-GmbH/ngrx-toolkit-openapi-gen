/**
 * Entity Generator - Generates TypeScript model interfaces using ts-morph.
 * Single responsibility: Transform EntitySpec into TypeScript interface declarations.
 */

import {
  Project,
  SourceFile,
  IndentationText,
  QuoteKind,
  StructureKind,
  InterfaceDeclarationStructure,
  PropertySignatureStructure,
  OptionalKind,
  VariableDeclarationKind,
} from 'ts-morph';
import { kebabCase, pascalCase, constantCase } from 'change-case';
import { EntitySpec, DomainSpec } from '../spec';
import { TypeRenderer, collectModelRefs } from './type-renderer';
import { formatPropertyName } from './utils';

/**
 * Options for entity generation
 */
export interface EntityGeneratorOptions {
  /**
   * Model name suffix (default: 'Model')
   */
  modelSuffix?: string;
}

const DEFAULT_OPTIONS: Required<EntityGeneratorOptions> = {
  modelSuffix: 'Model',
};

/**
 * Index of entity locations for import resolution
 */
export interface EntityIndex {
  domainPath: string;
  entitySlug: string;
}

/**
 * Result of entity generation
 */
export interface GeneratedEntity {
  path: string;
  content: string;
}

/**
 * Generates TypeScript model interfaces from EntitySpec
 */
export class EntityGenerator {
  private readonly options: Required<EntityGeneratorOptions>;
  private readonly typeRenderer: TypeRenderer;
  private readonly project: Project;

  constructor(options: EntityGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.typeRenderer = new TypeRenderer({ modelSuffix: this.options.modelSuffix });
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

  /**
   * Generate all entity files for a domain
   */
  generateDomainEntities(
    domain: DomainSpec,
    entityIndex: Map<string, EntityIndex>
  ): GeneratedEntity[] {
    const results: GeneratedEntity[] = [];
    const domainPath = kebabCase(domain.name);

    for (const entity of domain.entities) {
      const result = this.generateEntity(entity, domainPath, entityIndex);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate a single entity file
   */
  generateEntity(
    entity: EntitySpec,
    domainPath: string,
    entityIndex: Map<string, EntityIndex>
  ): GeneratedEntity {
    const entitySlug = kebabCase(entity.name);
    const interfaceName = `${pascalCase(entity.name)}${this.options.modelSuffix}`;
    const constantName = `${constantCase(entity.name)}_PRIMARY_KEY`;
    const filePath = `${domainPath}/entities/${entitySlug}.model.ts`;

    // Create source file
    const sourceFile = this.project.createSourceFile(filePath, '', { overwrite: true });

    // Add imports for referenced models
    this.addModelImports(sourceFile, entity, domainPath, entityIndex);

    // Add interface
    this.addInterface(sourceFile, interfaceName, entity);

    // Add primary key constant
    this.addPrimaryKeyConstant(sourceFile, constantName, entity.primaryKey);

    // Add schema reference comment
    sourceFile.addStatements(`// Schema reference: ${entity.schemaRef}`);

    // Format and return
    sourceFile.formatText();
    return {
      path: filePath,
      content: sourceFile.getFullText(),
    };
  }

  private addModelImports(
    sourceFile: SourceFile,
    entity: EntitySpec,
    sourceDomainPath: string,
    entityIndex: Map<string, EntityIndex>
  ): void {
    const selfModelName = `${pascalCase(entity.name)}${this.options.modelSuffix}`;
    const referencedModels = new Set<string>();

    // Collect all referenced model names from property schemas
    for (const prop of entity.properties) {
      const refs = collectModelRefs(prop.schema);
      for (const ref of refs) {
        const modelName = `${pascalCase(ref)}${this.options.modelSuffix}`;
        if (modelName !== selfModelName) {
          referencedModels.add(ref);
        }
      }
    }

    // Add import for each referenced model
    for (const refName of referencedModels) {
      const target = entityIndex.get(refName);
      if (!target) continue;

      const modelName = `${pascalCase(refName)}${this.options.modelSuffix}`;
      const importPath = this.resolveImportPath(sourceDomainPath, target.domainPath, target.entitySlug);

      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [modelName],
        moduleSpecifier: importPath,
      });
    }
  }

  private resolveImportPath(
    sourceDomainPath: string,
    targetDomainPath: string,
    targetEntitySlug: string
  ): string {
    const sourceDir = `${sourceDomainPath}/entities`;
    const targetFile = `${targetDomainPath}/entities/${targetEntitySlug}.model`;

    if (sourceDomainPath === targetDomainPath) {
      return `./${targetEntitySlug}.model`;
    }

    // Calculate relative path
    const sourceDepth = sourceDir.split('/').length;
    const ups = '../'.repeat(sourceDepth);
    return `${ups}${targetFile}`;
  }

  private addInterface(
    sourceFile: SourceFile,
    interfaceName: string,
    entity: EntitySpec
  ): void {
    const properties: OptionalKind<PropertySignatureStructure>[] = entity.properties.map(prop => ({
      name: formatPropertyName(prop.name),
      type: this.typeRenderer.render(prop.schema),
      hasQuestionToken: prop.optional,
      docs: prop.description ? [{ description: prop.description }] : undefined,
    }));

    // If no properties, add index signature
    if (properties.length === 0) {
      sourceFile.addInterface({
        name: interfaceName,
        isExported: true,
        properties: [],
        indexSignatures: [{
          keyName: 'key',
          keyType: 'string',
          returnType: 'unknown',
        }],
      });
      return;
    }

    const interfaceStructure: InterfaceDeclarationStructure = {
      kind: StructureKind.Interface,
      name: interfaceName,
      isExported: true,
      properties,
      docs: entity.description
        ? [{ description: `${entity.description}\n\nAuto-generated model for ${entity.name} entity.` }]
        : [{ description: `Auto-generated model for ${entity.name} entity.` }],
    };

    sourceFile.addInterface(interfaceStructure);
  }

  private addPrimaryKeyConstant(
    sourceFile: SourceFile,
    constantName: string,
    primaryKey: string | undefined
  ): void {
    // Only generate primary key constant if the entity has a primary key
    if (!primaryKey) return;

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{
        name: constantName,
        initializer: `'${primaryKey}' as const`,
      }],
    });
  }
}

/**
 * Build entity index from all domains
 */
export function buildEntityIndex(domains: readonly DomainSpec[]): Map<string, EntityIndex> {
  const index = new Map<string, EntityIndex>();

  for (const domain of domains) {
    const domainPath = kebabCase(domain.name);
    for (const entity of domain.entities) {
      index.set(entity.name, {
        domainPath,
        entitySlug: kebabCase(entity.name),
      });
    }
  }

  return index;
}
