const {readFileSync, writeFileSync, unlinkSync} = require("node:fs");
const myImportFunc = `const myImport = filePath => {
    if (filePath.endsWith(".ts") || filePath.endsWith(".mts") || filePath.endsWith(".cts")) {
        return import('@swc-node/register').then(() => {
            const m = require(filePath);
            return m;
        })
    }
}`;

async function main() {
    const fileContents = readFileSync("./test.cjs", 'utf-8');
    const newFileContents = `${myImportFunc}
    ${fileContents.replace(" import(", " myImport(")}`;
    writeFileSync("./test.timestamp.cjs", newFileContents);
    await import("./test.timestamp.cjs");
    unlinkSync("./test.timestamp.cjs");
}

main();