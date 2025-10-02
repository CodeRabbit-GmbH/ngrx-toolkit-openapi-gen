/**
 * Utility functions for code generation
 */

import { pascalCase } from 'change-case';

export function pluralize(value: string): string {
  const pascal = pascalCase(value);
  if (!pascal) return `${value}s`;

  if (/[^AEIOU]y$/i.test(pascal)) {
    return pascal.slice(0, -1) + 'ies';
  }
  if (/s$/i.test(pascal)) {
    return pascal + 'es';
  }
  return pascal + 's';
}

export function isValidIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

export function formatPropertyName(name: string): string {
  return isValidIdentifier(name) ? name : `'${name}'`;
}
