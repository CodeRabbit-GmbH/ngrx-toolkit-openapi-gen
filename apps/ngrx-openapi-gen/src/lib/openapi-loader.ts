import { readFileSync } from 'fs';
import { extname, resolve } from 'path';
import YAML from 'yaml';

import { OpenApiDocument } from './parser';

export interface LoadDocumentOptions {
  cwd?: string;
}

function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

function getFormatFromContentType(contentType: string | null): 'json' | 'yaml' | undefined {
  if (!contentType) return undefined;

  const lower = contentType.toLowerCase();
  if (lower.includes('application/json')) return 'json';
  if (
    lower.includes('text/yaml') ||
    lower.includes('application/x-yaml') ||
    lower.includes('application/yaml')
  ) {
    return 'yaml';
  }
  return undefined;
}

function getFormatFromPath(path: string): 'json' | 'yaml' | undefined {
  const ext = extname(path).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  return undefined;
}

export async function loadOpenApiDocument(
  input: string,
  options: LoadDocumentOptions = {}
): Promise<OpenApiDocument> {
  if (isUrl(input)) {
    return loadFromUrl(input);
  }
  return loadFromFile(input, options);
}

async function loadFromUrl(url: string): Promise<OpenApiDocument> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI document from ${url}: ${response.status} ${response.statusText}`
    );
  }

  const content = await response.text();
  const contentType = response.headers.get('content-type');

  // Try to determine format from Content-Type header first, then URL extension
  const format = getFormatFromContentType(contentType) ?? getFormatFromPath(url);

  if (format === 'json') {
    return JSON.parse(content) as OpenApiDocument;
  }

  if (format === 'yaml') {
    return YAML.parse(content) as OpenApiDocument;
  }

  // Fallback: try both parsers
  return tryParseWithFallback(content);
}

function loadFromFile(filePath: string, options: LoadDocumentOptions): OpenApiDocument {
  const absolutePath = resolve(options.cwd ?? process.cwd(), filePath);
  const content = readFileSync(absolutePath, 'utf8');
  const format = getFormatFromPath(absolutePath);

  if (format === 'yaml') {
    return YAML.parse(content) as OpenApiDocument;
  }

  if (format === 'json') {
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
  } catch {
    try {
      return YAML.parse(trimmed) as OpenApiDocument;
    } catch (yamlError) {
      const combined = new Error('Unable to parse OpenAPI document as JSON or YAML.');
      (combined as Error & { cause?: unknown }).cause = yamlError;
      throw combined;
    }
  }
}
