#!/usr/bin/env node
// Workaround for a packaging bug in @azure/msal-node and @azure/msal-common.
// Their `types/index.d.cts` files do `export * from "./index.js"`, which under
// `module: nodenext` resolves to the sibling `index.d.ts`. Because the parent
// `package.json` declares `"type": "module"`, TypeScript treats that `.d.ts` as
// ESM and emits TS1479 when the consuming context is CommonJS.
//
// Dropping a `package.json` with `{"type":"commonjs"}` inside the `types/`
// folder tells TypeScript to resolve declarations there as CommonJS, which
// matches what these files actually describe.
//
// Bumping `@azure/identity` to `^4.13.1` (which pulls `@azure/msal-node@>=5.1.5`)
// is what removes the transitive `uuid@8.3.2` flagged by MSRC 115880; this
// shim makes that bump build cleanly without changing this project's tsconfig.
//
// Track upstream: https://github.com/AzureAD/microsoft-authentication-library-for-js
const fs = require("fs");
const path = require("path");

const targets = [
    path.join(__dirname, "..", "node_modules", "@azure", "msal-node", "types"),
    path.join(__dirname, "..", "node_modules", "@azure", "msal-common", "types"),
];

for (const dir of targets) {
    if (!fs.existsSync(dir)) continue;
    const pkgPath = path.join(dir, "package.json");
    const desired = '{"type":"commonjs"}';
    if (fs.existsSync(pkgPath) && fs.readFileSync(pkgPath, "utf8") === desired) continue;
    fs.writeFileSync(pkgPath, desired);
}
