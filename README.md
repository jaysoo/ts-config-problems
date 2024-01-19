# ESM .ts problems

This repo demonstrates the problem with loading `.ts` config files. It uses `cosmiconfig` but it's a general problem outside of that package.

Note: This repo sets `"type": "module"` in `package.json` so all `.js` and `.ts` files are treated as ESM. You have to name files to `.cjs` or `.cts` if you want to use CommonJS.

Try to run the program:

```shell
node test.cjs
```

Of course, it fails because Node does not understand `.ts` files (specifically the `import './foo.ts'` code). So, let's try using `ts-node`

```shell
npx ts-node test.cjs
```

It still errors out, because `import` is not affected by `ts-node`. We need to use the experimental loader in Node.

```
node --loader ts-node/esm test.cjs
```

Now it works! But the solution is not great.

