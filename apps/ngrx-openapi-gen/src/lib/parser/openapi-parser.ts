import { OpenAPIV3 } from 'openapi-types';
import { constantCase } from 'change-case';
import {
  ApiSpec,
  ApiSpecOptions,
  DomainSpec,
  EntitySpec,
  OperationSpec,
  ParamSpec,
  ParamLocation,
  HttpMethod,
  OperationKind,
  EntityRef,
  SchemaOrRef,
  PropertySpec,
  isReference,
  isArraySchema,
} from '../spec';
import { SchemaResolver } from './schema-resolver';

const HTTP_METHODS: HttpMethod[] = [
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
];

interface ResponseDescriptor {
  shape: 'array' | 'object' | 'primitive' | 'void';
  schemaName?: string;
  schemaRef?: string;
  schema?: SchemaOrRef;
}

class DomainBuilder {
  private readonly operations: OperationSpec[] = [];
  private readonly operationKeys = new Set<string>();
  private readonly entities = new Map<string, EntitySpec>();

  constructor(readonly name: string) {}

  addOperation(operation: OperationSpec): void {
    if (operation.kind === 'collection' && operation.entity) {
      const collectionKey = `collection:${operation.entity.name}`;
      if (this.operationKeys.has(collectionKey)) return;
      this.operationKeys.add(collectionKey);
    } else {
      const key = `${operation.method}:${operation.path}`;
      if (this.operationKeys.has(key)) return;
      this.operationKeys.add(key);
    }
    this.operations.push(operation);
  }

  addEntity(entity: EntitySpec): void {
    if (!this.entities.has(entity.name)) {
      this.entities.set(entity.name, entity);
    }
  }

  build(): DomainSpec {
    return {
      name: this.name,
      operations: [...this.operations],
      entities: Array.from(this.entities.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  }
}

export class OpenApiParser {
  private schemaResolver!: SchemaResolver;
  private componentParameters: Record<
    string,
    OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
  > = {};

  parse(document: OpenAPIV3.Document, options: ApiSpecOptions): ApiSpec {
    const schemas = document.components?.schemas ?? {};
    this.schemaResolver = new SchemaResolver(
      schemas as Record<string, SchemaOrRef>
    );
    this.componentParameters = (document.components?.parameters ??
      {}) as Record<
      string,
      OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
    >;

    const domains = new Map<string, DomainBuilder>();

    for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;

        this.processOperation(path, method, operation, domains);
      }
    }

    const domainSpecs = Array.from(domains.values())
      .map((builder) => builder.build())
      .sort((a, b) => a.name.localeCompare(b.name));

    const basePathToken =
      options.basePathToken ?? `${constantCase(options.apiName)}_BASE_PATH`;

    return {
      apiName: options.apiName,
      title: document.info?.title ?? options.apiName,
      version: document.info?.version ?? '1.0.0',
      basePathToken,
      domains: domainSpecs,
    };
  }

  private processOperation(
    path: string,
    method: HttpMethod,
    operation: OpenAPIV3.OperationObject,
    domains: Map<string, DomainBuilder>
  ): void {
    const tags = this.resolveTags(operation, path);
    const descriptor = this.resolveResponseDescriptor(operation);
    const kind = this.resolveOperationKind(method, descriptor);
    const entity = descriptor.schemaName
      ? this.buildEntityRef(descriptor.schemaName)
      : undefined;
    const params = this.extractParameters(operation);
    const requestBody = this.extractRequestBodySchema(operation.requestBody);

    const operationSpec: OperationSpec = {
      operationId: operation.operationId ?? `${method.toUpperCase()} ${path}`,
      path,
      method,
      kind,
      entity,
      pathParams: params.filter((p) => p.location === 'path'),
      queryParams: params.filter((p) => p.location === 'query'),
      requestBody,
      responseSchema: descriptor.schema,
      summary: operation.summary,
      description: operation.description,
      successStatusCodes: this.collectSuccessStatusCodes(operation),
    };

    for (const tag of tags) {
      const builder = domains.get(tag) ?? new DomainBuilder(tag);
      builder.addOperation(operationSpec);

      if (descriptor.schemaName) {
        const entitySpec = this.buildEntitySpec(descriptor.schemaName);
        if (entitySpec) {
          builder.addEntity(entitySpec);
        }
      }

      if (requestBody && isReference(requestBody)) {
        const requestBodyName = this.schemaResolver.extractSchemaName(
          requestBody.$ref
        );
        if (requestBodyName) {
          const requestBodyEntity = this.buildEntitySpec(requestBodyName);
          if (requestBodyEntity) {
            builder.addEntity(requestBodyEntity);
          }
        }
      }

      domains.set(tag, builder);
    }
  }

  private resolveTags(
    operation: OpenAPIV3.OperationObject,
    path: string
  ): string[] {
    if (operation.tags && operation.tags.length > 0) {
      return [...operation.tags];
    }

    const segments = path
      .split('/')
      .filter((s) => s.length > 0 && !s.startsWith('{'));
    if (segments.length > 0) {
      const segment = segments[0];
      return [segment.charAt(0).toUpperCase() + segment.slice(1)];
    }

    return ['Default'];
  }

  private resolveOperationKind(
    method: HttpMethod,
    descriptor: ResponseDescriptor
  ): OperationKind {
    if (method === 'get') {
      if (descriptor.shape === 'array') return 'collection';
      if (descriptor.shape === 'object') return 'detail';
    }
    return 'mutation';
  }

  private resolveResponseDescriptor(
    operation: OpenAPIV3.OperationObject
  ): ResponseDescriptor {
    const responses = operation.responses ?? {};
    const successResponses = Object.entries(responses)
      .filter(([status]) => status.startsWith('2'))
      .map(([, response]) => response)
      .filter(
        (resp): resp is OpenAPIV3.ResponseObject =>
          !isReference(resp as SchemaOrRef)
      );

    for (const response of successResponses) {
      const schema = this.extractJsonSchema(response.content);
      if (!schema) continue;

      const descriptor = this.resolveSchemaDescriptor(schema);
      if (descriptor.shape !== 'void') {
        return descriptor;
      }
    }

    const bodySchema = this.extractRequestBodySchema(operation.requestBody);
    if (bodySchema) {
      return this.resolveSchemaDescriptor(bodySchema);
    }

    return { shape: 'void' };
  }

  private resolveSchemaDescriptor(schema: SchemaOrRef): ResponseDescriptor {
    if (isReference(schema)) {
      const schemaName = this.schemaResolver.extractSchemaName(schema.$ref);
      if (!schemaName) return { shape: 'void' };

      return {
        shape: 'object',
        schemaName,
        schemaRef: schema.$ref,
        schema,
      };
    }

    if (isArraySchema(schema) && schema.items) {
      const items = schema.items;
      if (isReference(items)) {
        const schemaName = this.schemaResolver.extractSchemaName(items.$ref);
        return {
          shape: 'array',
          schemaName,
          schemaRef: items.$ref,
          schema,
        };
      }
      return { shape: 'array', schema };
    }

    if (schema.type === 'object') {
      return { shape: 'object', schema };
    }

    if (schema.type) {
      return { shape: 'primitive', schema };
    }

    return { shape: 'void' };
  }

  private extractJsonSchema(
    content?: Record<string, OpenAPIV3.MediaTypeObject>
  ): SchemaOrRef | undefined {
    if (!content) return undefined;

    const mediaTypes = Object.keys(content);
    const jsonMediaType = mediaTypes.find(
      (key) =>
        key === 'application/json' ||
        key.endsWith('+json') ||
        key === 'text/json'
    );

    if (jsonMediaType) {
      return content[jsonMediaType]?.schema as SchemaOrRef | undefined;
    }

    const first = mediaTypes[0];
    return first
      ? (content[first]?.schema as SchemaOrRef | undefined)
      : undefined;
  }

  private extractRequestBodySchema(
    requestBody:
      | OpenAPIV3.RequestBodyObject
      | OpenAPIV3.ReferenceObject
      | undefined
  ): SchemaOrRef | undefined {
    if (!requestBody) return undefined;

    if (isReference(requestBody as SchemaOrRef)) {
      const refObj = requestBody as OpenAPIV3.ReferenceObject;
      const name = this.schemaResolver.extractSchemaName(refObj.$ref);
      if (name) {
        return this.schemaResolver.getSchemaObject(name);
      }
      return undefined;
    }

    return this.extractJsonSchema(
      (requestBody as OpenAPIV3.RequestBodyObject).content
    );
  }

  private extractParameters(operation: OpenAPIV3.OperationObject): ParamSpec[] {
    const parameters = operation.parameters ?? [];
    const result: ParamSpec[] = [];

    for (const param of parameters) {
      const resolved = this.resolveParameter(
        param as OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
      );
      if (!resolved) continue;

      const location = this.normalizeParamLocation(resolved.in);
      const schema = resolved.schema as SchemaOrRef | undefined;

      result.push({
        name: resolved.name,
        location,
        schema: schema ?? { type: 'string' },
        required: Boolean(resolved.required),
        description: resolved.description,
      });
    }

    return result;
  }

  private resolveParameter(
    param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
  ): OpenAPIV3.ParameterObject | undefined {
    if (isReference(param as SchemaOrRef)) {
      const refObj = param as OpenAPIV3.ReferenceObject;
      const name = this.schemaResolver.extractParameterName(refObj.$ref);
      const referenced = name ? this.componentParameters[name] : undefined;
      if (!referenced) return undefined;
      return this.resolveParameter(referenced);
    }
    return param as OpenAPIV3.ParameterObject;
  }

  private normalizeParamLocation(value: string | undefined): ParamLocation {
    switch (value) {
      case 'path':
      case 'query':
      case 'header':
      case 'cookie':
        return value;
      default:
        return 'query';
    }
  }

  private buildEntityRef(schemaName: string): EntityRef {
    return {
      name: schemaName,
      schemaRef: `#/components/schemas/${schemaName}`,
    };
  }

  private buildEntitySpec(schemaName: string): EntitySpec | undefined {
    const schema = this.schemaResolver.getSchemaObject(schemaName);
    if (!schema) return undefined;

    const properties: PropertySpec[] =
      this.schemaResolver.buildPropertySpecs(schema);

    return {
      name: schemaName,
      schemaRef: `#/components/schemas/${schemaName}`,
      primaryKey: this.schemaResolver.inferPrimaryKey(schemaName),
      properties,
      description: schema.description,
    };
  }

  private collectSuccessStatusCodes(
    operation: OpenAPIV3.OperationObject
  ): string[] {
    const responses = operation.responses ?? {};
    return Object.keys(responses)
      .filter((status) => status.startsWith('2'))
      .sort();
  }
}
