---
sidebar_position: 2
---

# Installation

## Prerequisites

- Node.js 18+
- Angular 19+ project
- NgRx Signals (`@ngrx/signals`)
- Angular Architects NgRx Toolkit (`@angular-architects/ngrx-toolkit`)

## Install Dependencies

First, ensure your Angular project has the required dependencies:

```bash
npm install @ngrx/signals @angular-architects/ngrx-toolkit
```

## Install the Generator

The generator can be run directly via `npx` or installed globally:

```bash
# Run directly (recommended)
npx ngrx-openapi-gen -i ./api.yaml -o ./src/app/generated --api-name MyApi

# Or install globally
npm install -g ngrx-openapi-gen
ngrx-openapi-gen -i ./api.yaml -o ./src/app/generated --api-name MyApi
```

## CLI Options

| Option | Alias | Description | Required |
|--------|-------|-------------|----------|
| `--input` | `-i` | Path to OpenAPI spec (YAML or JSON) | Yes |
| `--output` | `-o` | Output directory for generated files | Yes |
| `--api-name` | | Name for the API (used for tokens and folder structure) | Yes |
| `--zod` | | Generate Zod schemas for runtime validation | No |
| `--prefer-entity-names` | | Use entity-based mutation names instead of operationId | No |
| `--dry-run` | | Preview generated files without writing to disk | No |

## Project Setup

After generating, configure your Angular application to provide the base path token:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { MY_API_BASE_PATH } from './generated/my-api/api-base-path.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    { provide: MY_API_BASE_PATH, useValue: 'https://api.example.com' },
  ],
};
```

## Nx Workspace Integration

For Nx workspaces, add a target to your `project.json`:

```json
{
  "targets": {
    "generate-stores": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "npx ngrx-openapi-gen -i apps/my-app/src/api.yaml -o apps/my-app/src/app/generated --api-name MyApi"
        ]
      }
    }
  }
}
```

Then run:

```bash
npx nx run my-app:generate-stores
```


