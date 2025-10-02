import { CodeBlockWriter } from 'ts-morph';

export function createWriter(): CodeBlockWriter {
  return new CodeBlockWriter({
    indentNumberOfSpaces: 2,
    useSingleQuote: true,
  });
}
