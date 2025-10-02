export function buildWithProps(basePathToken: string): string {
  return `withProps(() => ({
    _baseUrl: inject(${basePathToken}),
  }))`;
}
