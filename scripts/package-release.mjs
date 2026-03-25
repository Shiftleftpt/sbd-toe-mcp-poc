#!/usr/bin/env node

import { buildReleaseBundle, parseArguments } from "./package-release-lib.mjs";

async function main() {
  const args = parseArguments(process.argv.slice(2));
  await buildReleaseBundle({
    repoRoot: process.cwd(),
    outputDir: args.outputDir,
    version: args.version
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
