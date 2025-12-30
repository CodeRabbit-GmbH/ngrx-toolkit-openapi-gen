import { WriterFunction } from 'ts-morph';

export interface ObjectProperty {
  name: string;
  value: string | WriterFunction;
}

export interface StoreGeneratorOptions {
  basePathToken: string;
  modelSuffix?: string;
  zodValidation?: boolean;
  preferEntityNames?: boolean;
  sharedEntities?: boolean;
}

export type ResolvedStoreGeneratorOptions = Required<StoreGeneratorOptions>;

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedStore {
  store: GeneratedFile;
  schemas?: GeneratedFile;
}

export interface BuilderContext {
  readonly basePathToken: string;
  readonly modelSuffix: string;
  readonly zodValidation: boolean;
  readonly preferEntityNames: boolean;
  readonly sharedEntities: boolean;
  readonly duplicateCollectionEntities: ReadonlySet<string>;
  readonly renderType: (schema: unknown) => string;
  readonly renderZod: (schema: unknown) => string;
}
