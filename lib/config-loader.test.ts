import { test } from 'vitest';
import { join } from 'node:path';
import { loadConfigFromFile } from './config-loader.ts'

test('loadConfigFromFile', async () => {
  const cwd = join(__dirname, '../');
  console.log({ cwd });
  const result = await loadConfigFromFile('lib/fixtures/config.ts', cwd);
  console.log(result)
});
