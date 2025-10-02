import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';

import { runCli } from './main';

describe('ngrx-openapi-gen CLI', () => {
  it('logs analyzed domains from an OpenAPI document', async () => {
    const workingDir = mkdtempSync(join(tmpdir(), 'ngrx-openapi-gen-cli-'));
    try {
      const specPath = join(workingDir, 'spec.yaml');
      writeFileSync(
        specPath,
        [
          'openapi: 3.0.0',
          'info:',
          '  title: CLI Test API',
          '  version: 1.0.0',
          'paths:',
          '  /flights:',
          '    get:',
          '      tags:',
          '        - Flight',
          '      operationId: listFlights',
          '      responses:',
          '        "200":',
          '          description: OK',
          '          content:',
          '            application/json:',
          '              schema:',
          '                type: array',
          '                items:',
          '                  $ref: "#/components/schemas/Flight"',
          'components:',
          '  schemas:',
          '    Flight:',
          '      type: object',
          '      properties:',
          '        id:',
          '          type: string',
          '      required:',
          '        - id',
        ].join('\n'),
        'utf8',
      );

      const logSpy = jest.fn();
      await runCli(['node', 'ngrx-openapi-gen', '--input', specPath, '--dry-run'], { logger: logSpy });

      expect(logSpy).toHaveBeenCalled();
      const logOutput = logSpy.mock.calls.map(([message]) => message).join('\n');
      expect(logOutput).toContain('Generation Summary');
      expect(logOutput.toLowerCase()).toContain('flight');
      expect(logOutput).toContain('Dry run');
    } finally {
      rmSync(workingDir, { recursive: true, force: true });
    }
  });
});
