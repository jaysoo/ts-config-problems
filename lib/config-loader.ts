import type { Node, SyntaxKind } from 'typescript';
import * as ts from 'typescript';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmdirSync
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';


export async function loadConfigFromFile(fileName: string, cwd:string): any {
  const config = {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      noEmit: false,
    }
  };

  const files = [fileName].concat(getRelativeFilesToCopy(fileName, cwd));
  let transpiledConfigPath: string | null = null;

  for (const f of files) {
    let content = readFileSync(join(cwd, f)).toString();
    let transpiledContent = ts.transpileModule(
      content,
      config,
    ).outputText;

    console.log({ file: f, source: content, output: transpiledContent });
    const outFile = join(cwd, '.compiled', f.replace(/\.[cm]?ts$/, '.mjs'));
    const outDir = dirname(outFile);
    mkdirSync(outDir, { recursive: true });
    console.log('writing to ', outFile);
    writeFileSync(outFile, transpiledContent);
    if (f === fileName) {
      transpiledConfigPath = outFile;
    }
  }

  const mod = await import(transpiledConfigPath);
  // Clean-up
  rmdirSync(join(cwd, '.compiled'), {recursive: true});
  // Un-nest default export
  return mod.default ?? mod;
}

export function getRelativeFilesToCopy(
  fileName: string,
  cwd: string
): string[] {
  const seen = new Set<string>();
  const collected = new Set<string>();

  function doCollect(currFile: string): void {
    // Prevent circular dependencies from causing infinite loop
    if (seen.has(currFile)) return;
    seen.add(currFile);

    const absoluteFilePath = join(cwd, currFile);
    const content = readFileSync(absoluteFilePath).toString();
    const files = getRelativeImports({ file: currFile, content });
    const modules = ensureFileExtensions(files, dirname(absoluteFilePath));

    const relativeDirPath = dirname(currFile);

    for (const moduleName of modules) {
      const relativeModulePath = join(relativeDirPath, moduleName);
      collected.add(relativeModulePath);
      doCollect(relativeModulePath);
    }
  }

  doCollect(fileName);

  return Array.from(collected);
}

// Exported for testing
export function getRelativeImports({
  file,
  content,
}: {
  file: string;
  content: string;
}): string[] {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const callExpressionsOrImportDeclarations = findNodes(source, [
    ts.SyntaxKind.CallExpression,
    ts.SyntaxKind.ImportDeclaration,
  ]) as (ts.CallExpression | ts.ImportDeclaration)[];
  const modulePaths: string[] = [];
  for (const node of callExpressionsOrImportDeclarations) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      modulePaths.push(stripOuterQuotes(node.moduleSpecifier.getText(source)));
    } else {
      if (node.expression.getText(source) === 'require') {
        modulePaths.push(stripOuterQuotes(node.arguments[0].getText(source)));
      }
    }
  }
  return modulePaths.filter((path) => path.startsWith('.'));
}

function stripOuterQuotes(str: string): string {
  return str.match(/^["'](.*)["']/)?.[1] ?? str;
}

// Exported for testing
export function ensureFileExtensions(
  files: string[],
  absoluteDir: string
): string[] {
  const extensions = ['.js', '.cjs', '.mjs', '.json', '.ts', '.mts', '.cts'];
  return files.map((file) => {
    const providedExt = extname(file);
    if (providedExt && extensions.includes(providedExt)) return file;

    const ext = extensions.find((ext) =>
      existsSync(join(absoluteDir, file + ext))
    );
    if (ext) {
      return file + ext;
    } else {
      throw new Error(
        `Cannot find file "${file}" with any of the following extensions: ${extensions.join(
          ', '
        )}`
      );
    }
  });
}

export function findNodes(
  node: Node,
  kind: SyntaxKind | SyntaxKind[],
  max = Infinity
): Node[] {
  if (!node || max == 0) {
    return [];
  }

  const arr: Node[] = [];
  const hasMatch = Array.isArray(kind)
    ? kind.includes(node.kind)
    : node.kind === kind;
  if (hasMatch) {
    arr.push(node);
    max--;
  }
  if (max > 0) {
    for (const child of node.getChildren()) {
      findNodes(child, kind, max).forEach((node) => {
        if (max > 0) {
          arr.push(node);
        }
        max--;
      });

      if (max <= 0) {
        break;
      }
    }
  }

  return arr;
}

