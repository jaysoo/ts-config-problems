const { join } = require('node:path');

async function main() {
  // Using require works when running with `npx ts-node test.cjs`
  // `node test.cjs` won't work still obviously
  require('./config.ts');
}

main();

