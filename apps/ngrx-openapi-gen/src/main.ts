import fs from 'fs';
import { basename, extname, resolve } from 'path';

import { Command, CommanderError } from 'commander';
import pc from 'picocolors';

import { loadOpenApiDocument } from './lib/openapi-loader';
import { Generator, GeneratedFile } from './lib/generator';
import { writeGeneratedFiles } from './lib/file-writer';

interface CliOptions {
  input: string;
  output?: string;
  apiName?: string;
  basePathToken?: string;
  dryRun?: boolean;
  debugSpec?: string;
  zod?: boolean;
  preferEntityNames?: boolean;
}

interface CliIo {
  logger?: (message: string) => void;
  errorLogger?: (message: string) => void;
  exit?: (code: number) => void;
  cwd?: string;
}

export async function runCli(rawArgs: string[] = process.argv, io: CliIo = {}): Promise<void> {
  const logger = io.logger ?? console.log;
  const errorLogger = io.errorLogger ?? console.error;
  const exit = io.exit ?? ((code: number) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  });
  const cwd = io.cwd ?? process.cwd();

  const program = new Command();
  program
    .name('ngrx-openapi-gen')
    .description('Generate NgRx Signal Stores with withResource and httpMutation from OpenAPI.')
    .requiredOption('-i, --input <path>', 'Path or URL to the OpenAPI definition file (YAML or JSON).')
    .option('-o, --output <path>', 'Directory to emit generated artifacts.')
    .option('--api-name <name>', 'Override API name used in generated output.')
    .option('--base-path-token <token>', 'Angular injection token for the base path.')
    .option('--zod', 'Generate Zod schemas for runtime validation (requires zod package).')
    .option('--prefer-entity-names', 'Use entity-based mutation names (createEntity, updateEntity) instead of operationId.')
    .option('--dry-run', 'Preview generated files without writing to disk.')
    .option('--debug-spec <path>', 'Write the computed ApiSpec to the provided path.');

  let parsedOptions: CliOptions;

  try {
    program.parse(rawArgs);
    parsedOptions = program.opts<CliOptions>();
  } catch (error) {
    if (error instanceof CommanderError) {
      exit(error.exitCode);
      return;
    }
    errorLogger((error as Error).message);
    exit(1);
    return;
  }

  try {
    const document = await loadOpenApiDocument(parsedOptions.input, { cwd });
    const apiName = determineApiName(parsedOptions, document, cwd);
    const zodValidation = parsedOptions.zod ?? false;
    const preferEntityNames = parsedOptions.preferEntityNames ?? false;

    const generator = new Generator({
      apiName,
      basePathToken: parsedOptions.basePathToken,
      zodValidation,
      preferEntityNames,
    });

    const spec = generator.parseDocument(document);
    const generatedFiles = generator.generateCode(spec);

    if (zodValidation) {
      logger(pc.cyan('ℹ Zod validation enabled. Make sure to install zod in your project:'));
      logger(pc.dim('  npm install zod'));
    }

    if (parsedOptions.debugSpec) {
      const debugPath = resolve(cwd, parsedOptions.debugSpec);
      await fs.promises.writeFile(debugPath, JSON.stringify(spec, null, 2));
      logger(pc.dim(`ApiSpec written to ${debugPath}`));
    }

    let outputRoot: string | undefined;
    if (parsedOptions.dryRun) {
      logger(pc.yellow('Dry run – no files written.'));
    } else {
      if (!parsedOptions.output) {
        throw new Error('Output directory is required unless --dry-run is used.');
      }
      outputRoot = resolve(cwd, parsedOptions.output);
      await writeGeneratedFiles(generatedFiles, { outputRoot });
      logger(pc.green(`Wrote ${generatedFiles.length} files to ${outputRoot}`));
    }

    printSummary(logger, generatedFiles, Boolean(parsedOptions.dryRun), outputRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorLogger(`Failed to generate code: ${message}`);
    exit(1);
  }
}

function determineApiName(options: CliOptions, document: { info?: { title?: string } }, cwd: string): string {
  if (options.apiName) {
    return options.apiName;
  }

  if (document.info?.title) {
    return normalizeName(document.info.title);
  }

  const filename = basename(options.input ?? cwd, extname(options.input ?? ''));
  return normalizeName(filename || 'GeneratedApi');
}

function normalizeName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, ' ');
  const capitalized = cleaned
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return capitalized || 'GeneratedApi';
}

function printSummary(
  logger: (message: string) => void,
  files: GeneratedFile[],
  isDryRun: boolean,
  outputRoot?: string,
): void {
  if (files.length === 0) {
    logger(pc.dim('No files generated.'));
    return;
  }

  logger(pc.bold(pc.cyan('Generation Summary')));

  const groups = new Map<string, string[]>();

  for (const file of files) {
    const segments = file.path.split('/');
    const group = segments.length > 1 ? segments[0] : 'shared';
    const list = groups.get(group) ?? [];
    list.push(file.path);
    groups.set(group, list);
  }

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [group, paths] of sortedGroups) {
    logger(`${pc.green('✔')} ${pc.bold(group)} ${pc.dim(`(${paths.length} files)`)}`);
    const sortedPaths = paths.slice().sort();
    for (const path of sortedPaths) {
      const label = classifyPath(path);
      logger(`  ${label} ${pc.dim(path)}`);
    }
  }

  if (isDryRun) {
    logger(pc.yellow('Dry run complete – files were not written.'));
  } else if (outputRoot) {
    logger(pc.dim(`Output root: ${outputRoot}`));
  }
}

function classifyPath(path: string): string {
  if (path.includes('/entities/')) {
    return pc.magenta('model');
  }
  if (path.includes('/application/')) {
    return pc.blue('store');
  }
  return pc.white('file');
}

if (require.main === module) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
