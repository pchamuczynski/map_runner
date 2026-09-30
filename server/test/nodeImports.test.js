import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Vitest resolves extensionless imports, plain Node does not. The server runs the shared
// domain code under plain Node, so check it loads there exactly as in production.
describe('shared code under plain Node', () => {
  it('loads the server app and the shared domain schema', () => {
    const cwd = fileURLToPath(new URL('..', import.meta.url));
    const script = "await import('./src/app.js'); const m = await import('../src/domain/schema.js'); console.log(typeof m.sanitizeRoutes);";
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd, encoding: 'utf8' });
    expect(output.trim()).toBe('function');
  });
});
