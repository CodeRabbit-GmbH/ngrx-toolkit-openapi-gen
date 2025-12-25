/**
 * File Writer - Writes generated files to disk.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { GeneratedFile } from './generator';

/**
 * Options for file writing
 */
export interface FileWriterOptions {
  /**
   * Output root directory
   */
  outputRoot: string;
  /**
   * Custom file system operations (for testing)
   */
  fileSystem?: {
    mkdir: (path: string, options: { recursive: boolean }) => Promise<unknown>;
    writeFile: (path: string, contents: string) => Promise<void>;
  };
}

/**
 * Write generated files to disk
 */
export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: FileWriterOptions
): Promise<void> {
  const fs = options.fileSystem ?? {
    mkdir: (path: string, opts: { recursive: boolean }) => mkdir(path, opts),
    writeFile: (path: string, contents: string) =>
      writeFile(path, contents, 'utf8'),
  };

  for (const file of files) {
    const fullPath = join(options.outputRoot, file.path);
    const dir = dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file.content);
  }
}
