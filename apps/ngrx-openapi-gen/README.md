# ngrx-toolkit-openapi-gen

Generate NgRx Signal Stores with `httpResource` and `httpMutation` from OpenAPI specifications.

## Installation

```bash
npm install -g ngrx-toolkit-openapi-gen
```

Or use directly with npx:

```bash
npx ngrx-toolkit-openapi-gen -i api.yaml -o src/generated
```

## Usage

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
| `--dry-run` | Preview without writing files |

### Example

```bash
ngrx-openapi-gen -i swagger.json -o src/app/stores
```

## Generated Output

For each domain (OpenAPI tag), the generator produces:

```
src/app/stores/
├── api-base-path.token.ts      # Base URL injection token
├── flight/
│   ├── application/
│   │   └── flight.store.ts     # Signal Store with httpResource & httpMutation
│   └── entities/
│       └── flight.model.ts     # TypeScript interfaces
└── booking/
    ├── application/
    │   └── booking.store.ts
    └── entities/
        └── booking.model.ts
```

## Requirements

Generated stores require these peer dependencies in your Angular project:

```bash
npm install @angular-architects/ngrx-toolkit @ngrx/signals
```

## Documentation

Full documentation: https://wolfmanfx.github.io/ngrx-toolkit-openapi-gen/

## License

MIT

