import { WriterFunction } from 'ts-morph';

export interface ObjectProperty {
  name: string;
  value: string | WriterFunction;
}

export interface StoreGeneratorOptions {
  basePathToken: string;
  modelSuffix?: string;
}

export type ResolvedStoreGeneratorOptions = Required<StoreGeneratorOptions>;

export interface GeneratedStore {
  path: string;
  content: string;
}

export interface BuilderContext {
  readonly basePathToken: string;
  readonly modelSuffix: string;
  readonly renderType: (schema: unknown) => string;
}
