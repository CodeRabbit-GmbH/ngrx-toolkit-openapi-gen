# ngrx-toolkit-openapi-gen

Generate NgRx Signal Stores with `httpResource` and `httpMutation` from OpenAPI specifications.

[![npm version](https://img.shields.io/npm/v/ngrx-toolkit-openapi-gen.svg)](https://www.npmjs.com/package/ngrx-toolkit-openapi-gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install -g ngrx-toolkit-openapi-gen
```

Or use directly with npx:

```bash
npx ngrx-toolkit-openapi-gen -i api.yaml -o src/generated
```

## Quick Start

```bash
ngrx-openapi-gen -i <openapi-file> -o <output-dir> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-i, --input <path>` | Path to OpenAPI spec (YAML or JSON) **required** |
| `-o, --output <path>` | Output directory for generated files |
| `--api-name <name>` | Override API name used in generation |
| `--base-path-token <token>` | Angular injection token for base URL |
| `--zod` | Generate Zod schemas for runtime validation |
| `--prefer-entity-names` | Use entity-based mutation names instead of operationId |
| `--dry-run` | Preview without writing files |

### Example

```bash
ngrx-openapi-gen -i swagger.json -o src/app/stores --zod
```

## Documentation

📚 **Full documentation:** [https://coderabbit-gmbh.github.io/ngrx-toolkit-openapi-gen/](https://coderabbit-gmbh.github.io/ngrx-toolkit-openapi-gen/)

## Requirements

Generated stores require these peer dependencies in your Angular project:

```bash
npm install @angular-architects/ngrx-toolkit @ngrx/signals
```

If using `--zod`:

```bash
npm install zod
```

## Development

This is an [Nx](https://nx.dev) monorepo. Available commands:

```bash
# Run playground app
npm start

# Build the generator
npm run build

# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Start documentation site
npm run docs:start
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/CodeRabbit-GmbH/ngrx-toolkit-openapi-gen)
- [npm Package](https://www.npmjs.com/package/ngrx-toolkit-openapi-gen)
- [@angular-architects/ngrx-toolkit](https://github.com/angular-architects/ngrx-toolkit)
- [NgRx Signals](https://ngrx.io/guide/signals)
