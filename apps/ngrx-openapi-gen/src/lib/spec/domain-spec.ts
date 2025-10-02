import { OpenAPIV3 } from 'openapi-types';

export type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type OperationKind = 'collection' | 'detail' | 'mutation';

export type ParamLocation = 'path' | 'query' | 'header' | 'cookie';

export interface EntityRef {
  readonly name: string;
  readonly schemaRef: string;
}

export interface PropertySpec {
  readonly name: string;
  readonly schema: SchemaOrRef;
  readonly optional: boolean;
  readonly description?: string;
}

export interface ParamSpec {
  readonly name: string;
  readonly location: ParamLocation;
  readonly schema: SchemaOrRef;
  readonly required: boolean;
  readonly description?: string;
}

export interface EntitySpec {
  readonly name: string;
  readonly schemaRef: string;
  readonly primaryKey?: string;
  readonly properties: readonly PropertySpec[];
  readonly description?: string;
}

export interface OperationSpec {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly kind: OperationKind;
  readonly entity?: EntityRef;
  readonly pathParams: readonly ParamSpec[];
  readonly queryParams: readonly ParamSpec[];
  readonly requestBody?: SchemaOrRef;
  readonly responseSchema?: SchemaOrRef;
  readonly summary?: string;
  readonly description?: string;
  readonly successStatusCodes: readonly string[];
}

export interface DomainSpec {
  readonly name: string;
  readonly entities: readonly EntitySpec[];
  readonly operations: readonly OperationSpec[];
  readonly description?: string;
}

export interface ApiSpec {
  readonly apiName: string;
  readonly title: string;
  readonly version: string;
  readonly basePathToken: string;
  readonly domains: readonly DomainSpec[];
}

export interface ApiSpecOptions {
  readonly apiName: string;
  readonly basePathToken?: string;
}
