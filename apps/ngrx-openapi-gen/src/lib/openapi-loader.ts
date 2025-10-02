import { readFileSync } from 'fs';
import { extname, resolve } from 'path';
import YAML from 'yaml';

import { OpenApiDocument } from './parser';

export interface LoadDocumentOptions {
  cwd?: string;
}

export function loadOpenApiDocument(filePath: string, options: LoadDocumentOptions = {}): OpenApiDocument {
  const absolutePath = resolve(options.cwd ?? process.cwd(), filePath);
  const content = readFileSync(absolutePath, 'utf8');
  const ext = extname(absolutePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    return YAML.parse(content) as OpenApiDocument;
  }

  if (ext === '.json') {
    return JSON.parse(content) as OpenApiDocument;
  }

  return tryParseWithFallback(content);
}

function tryParseWithFallback(content: string): OpenApiDocument {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Provided OpenAPI document is empty.');
  }

  try {
    return JSON.parse(trimmed) as OpenApiDocument;
  } catch (jsonError) {
    try {
      return YAML.parse(trimmed) as OpenApiDocument;
    } catch (yamlError) {
      const combined = new Error('Unable to parse OpenAPI document as JSON or YAML.');
      (combined as Error & { cause?: unknown }).cause = yamlError;
      throw combined;
    }
  }
}
