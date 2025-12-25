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
import { ZodRenderer } from './zod-renderer';
import { formatPropertyName } from './utils';

export interface EntityGeneratorOptions {
  modelSuffix?: string;
  zodValidation?: boolean;
}

const DEFAULT_OPTIONS: Required<EntityGeneratorOptions> = {
  modelSuffix: 'Model',
  zodValidation: false,
};

export interface EntityIndex {
  domainPath: string;
  entitySlug: string;
}

export interface GeneratedEntity {
  path: string;
  content: string;
}

export class EntityGenerator {
  private readonly options: Required<EntityGeneratorOptions>;
  private readonly typeRenderer: TypeRenderer;
  private readonly zodRenderer: ZodRenderer;
  private readonly project: Project;

  constructor(options: EntityGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
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

  generateEntity(
    entity: EntitySpec,
    domainPath: string,
    entityIndex: Map<string, EntityIndex>
  ): GeneratedEntity {
    const entitySlug = kebabCase(entity.name);
    const typeName = `${pascalCase(entity.name)}${this.options.modelSuffix}`;
    const schemaName = `${typeName}Schema`;
    const constantName = `${constantCase(entity.name)}_PRIMARY_KEY`;
    const filePath = `${domainPath}/entities/${entitySlug}.model.ts`;

    const sourceFile = this.project.createSourceFile(filePath, '', {
      overwrite: true,
    });

    if (this.options.zodValidation) {
      this.addZodImport(sourceFile);
      this.addModelImports(sourceFile, entity, domainPath, entityIndex);
      this.addZodSchemaImports(sourceFile, entity, domainPath, entityIndex);
      this.addInterface(sourceFile, typeName, entity);
      this.addTypedZodSchema(sourceFile, schemaName, typeName, entity);
    } else {
      this.addModelImports(sourceFile, entity, domainPath, entityIndex);
      this.addInterface(sourceFile, typeName, entity);
    }

    this.addPrimaryKeyConstant(sourceFile, constantName, entity.primaryKey);

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
    const selfModelName = `${pascalCase(entity.name)}${
      this.options.modelSuffix
    }`;
    const referencedModels = new Set<string>();

    for (const prop of entity.properties) {
      const refs = collectModelRefs(prop.schema);
      for (const ref of refs) {
        const modelName = `${pascalCase(ref)}${this.options.modelSuffix}`;
        if (modelName !== selfModelName) {
          referencedModels.add(ref);
        }
      }
    }

    for (const refName of referencedModels) {
      const target = entityIndex.get(refName);
      if (!target) continue;

      const modelName = `${pascalCase(refName)}${this.options.modelSuffix}`;
      const importPath = this.resolveImportPath(
        sourceDomainPath,
        target.domainPath,
        target.entitySlug
      );

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

    const sourceDepth = sourceDir.split('/').length;
    const ups = '../'.repeat(sourceDepth);
    return `${ups}${targetFile}`;
  }

  private addInterface(
    sourceFile: SourceFile,
    interfaceName: string,
    entity: EntitySpec
  ): void {
    const properties: OptionalKind<PropertySignatureStructure>[] =
      entity.properties.map((prop) => ({
        name: formatPropertyName(prop.name),
        type: this.typeRenderer.render(prop.schema),
        hasQuestionToken: prop.optional,
      }));

    if (properties.length === 0) {
      sourceFile.addInterface({
        name: interfaceName,
        isExported: true,
        properties: [],
        indexSignatures: [
          {
            keyName: 'key',
            keyType: 'string',
            returnType: 'unknown',
          },
        ],
      });
      return;
    }

    const interfaceStructure: InterfaceDeclarationStructure = {
      kind: StructureKind.Interface,
      name: interfaceName,
      isExported: true,
      properties,
    };

    sourceFile.addInterface(interfaceStructure);
  }

  private addZodImport(sourceFile: SourceFile): void {
    sourceFile.addImportDeclaration({
      namedImports: ['z'],
      moduleSpecifier: 'zod',
    });
  }

  private addZodSchemaImports(
    sourceFile: SourceFile,
    entity: EntitySpec,
    sourceDomainPath: string,
    entityIndex: Map<string, EntityIndex>
  ): void {
    const selfSchemaName = `${pascalCase(entity.name)}${
      this.options.modelSuffix
    }Schema`;
    const referencedModels = new Set<string>();

    for (const prop of entity.properties) {
      const refs = collectModelRefs(prop.schema);
      for (const ref of refs) {
        const schemaName = `${pascalCase(ref)}${
          this.options.modelSuffix
        }Schema`;
        if (schemaName !== selfSchemaName) {
          referencedModels.add(ref);
        }
      }
    }

    for (const refName of referencedModels) {
      const target = entityIndex.get(refName);
      if (!target) continue;

      const schemaName = `${pascalCase(refName)}${
        this.options.modelSuffix
      }Schema`;
      const importPath = this.resolveImportPath(
        sourceDomainPath,
        target.domainPath,
        target.entitySlug
      );

      sourceFile.addImportDeclaration({
        namedImports: [schemaName],
        moduleSpecifier: importPath,
      });
    }
  }

  private addTypedZodSchema(
    sourceFile: SourceFile,
    schemaName: string,
    typeName: string,
    entity: EntitySpec
  ): void {
    if (entity.properties.length === 0) {
      sourceFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: schemaName,
            type: `z.ZodType<${typeName}>`,
            initializer: 'z.object({})',
          },
        ],
      });
      return;
    }

    const propLines = entity.properties.map((prop) => {
      const formattedName = formatPropertyName(prop.name);
      let zodType = this.zodRenderer.render(prop.schema);
      if (prop.optional) {
        zodType = `${zodType}.optional()`;
      }
      return `  ${formattedName}: ${zodType},`;
    });

    const schemaBody = `z.object({\n${propLines.join('\n')}\n})`;

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: schemaName,
          type: `z.ZodType<${typeName}>`,
          initializer: schemaBody,
        },
      ],
    });
  }

  private addPrimaryKeyConstant(
    sourceFile: SourceFile,
    constantName: string,
    primaryKey: string | undefined
  ): void {
    if (!primaryKey) return;

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: constantName,
          initializer: `'${primaryKey}' as const`,
        },
      ],
    });
  }
}

export function buildEntityIndex(
  domains: readonly DomainSpec[]
): Map<string, EntityIndex> {
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
