const { join } = require('node:path');
const { cosmiconfig } = require('cosmiconfig');

async function main() {
  const explorer = cosmiconfig('@acme/test');
  explorer.load(join(__dirname, 'config.ts'));
}

main();

