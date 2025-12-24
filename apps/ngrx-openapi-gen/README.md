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
| `--zod` | Generate Zod schemas for runtime validation |
| `--prefer-entity-names` | Use entity-based mutation names instead of operationId |
| `--dry-run` | Preview without writing files |

### Examples

Basic generation:

```bash
ngrx-openapi-gen -i swagger.json -o src/app/stores
```

With Zod validation:

```bash
ngrx-openapi-gen -i swagger.json -o src/app/stores --zod
```

With entity-based naming:

```bash
ngrx-openapi-gen -i swagger.json -o src/app/stores --prefer-entity-names
```

---

## Zod Validation (`--zod`)

Enable runtime validation of API responses using [Zod](https://zod.dev).

**Without `--zod`** — generates TypeScript interfaces only:

```typescript
export interface PetModel {
  id?: number;
  name: string;
  status?: 'available' | 'pending' | 'sold';
}
```

**With `--zod`** — generates Zod schemas with inferred types:

```typescript
import { z } from 'zod';

export interface PetModel {
  id?: number;
  name: string;
  status?: 'available' | 'pending' | 'sold';
}

export const PetModelSchema: z.ZodType<PetModel> = z.object({
  id: z.number().optional(),
  name: z.string(),
  status: z.enum(['available', 'pending', 'sold']).optional(),
});
```

The store automatically validates responses:

```typescript
pets: httpResource<PetModel[]>(() => ({
  url: `${store._baseUrl}/pet/findByStatus`,
  parse: (data: unknown) => z.array(PetModelSchema).parse(data)
}), { defaultValue: [] })
```

> **Note:** Install Zod in your project: `npm install zod`

---

## Mutation Naming (`--prefer-entity-names`)

Controls how mutation methods are named in generated stores.

**Default behavior** — uses `operationId` from the OpenAPI spec:

```typescript
// OpenAPI: operationId: "addPet"
addPet: httpMutation<PetModel, PetModel>({ ... })

// OpenAPI: operationId: "updatePetWithForm"  
updatePetWithForm: httpMutation<...>({ ... })
```

**With `--prefer-entity-names`** — uses entity-based names (`create`, `update`, `remove`):

```typescript
// POST /pet → createPet
createPet: httpMutation<PetModel, PetModel>({ ... })

// PUT /pet → updatePet
updatePet: httpMutation<PetModel, PetModel>({ ... })

// DELETE /pet/{id} → removePet (if entity available)
removePet: httpMutation<...>({ ... })
```

When duplicates occur (e.g., two POST endpoints), it falls back to `operationId`:

```typescript
// POST /pet → createPet
createPet: httpMutation<...>({ ... })

// POST /pet/{petId} → operationId fallback
updatePetWithForm: httpMutation<...>({ ... })
```

---

## Generated Output

For each domain (OpenAPI tag), the generator produces:

```
src/app/stores/
├── api-base-path.token.ts      # Base URL injection token
├── flight/
│   ├── application/
│   │   └── flight.store.ts     # Signal Store with httpResource & httpMutation
│   └── entities/
│       └── flight.model.ts     # TypeScript interfaces (+ Zod schemas with --zod)
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

If using `--zod`:

```bash
npm install zod
```

## Documentation

Full documentation: https://coderabbit-gmbh.github.io/ngrx-toolkit-openapi-gen/

## License

MIT



