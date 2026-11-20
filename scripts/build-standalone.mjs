/**
 * Builds the shareable single-file version of Wealth Pilot: dist/wealth-pilot.html.
 * Everything (CSS and JS) is inlined; data stays in each visitor's browser.
 * Usage: npm run build:standalone
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
mkdirSync("dist", { recursive: true });

execFileSync("npx", ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", "dist/standalone.css", "--minify"], { stdio: "inherit" });

const result = await build({
  entryPoints: ["standalone/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  write: false,
  legalComments: "none",
  logLevel: "warning",
  logOverride: { "unsupported-directive": "silent" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_STANDALONE": '"1"',
  },
  alias: {
    "next/link": resolve(root, "standalone/shims/link.tsx"),
    "next/navigation": resolve(root, "standalone/shims/navigation.ts"),
    "@/lib/reports/export": resolve(root, "standalone/shims/export.ts"),
  },
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync("dist/standalone.css", "utf8").replace(/<\/style/gi, "<\\/style");

const html = `<title>Wealth Pilot</title>
<meta name="description" content="Plan your salary, expenses, savings, investments and retirement.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync("dist/wealth-pilot.html", html);
console.log(`dist/wealth-pilot.html  ${(html.length / 1024).toFixed(0)} KB`);

// A complete document for static hosting (GitHub Pages serves docs/ on the main branch).
const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0e9f6e"/><path d="M5 16l4-4 3 2.5 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0e9f6e">
<meta property="og:title" content="Wealth Pilot — Smart Salary & Wealth Planner">
<meta property="og:description" content="Find out exactly how to split your salary between expenses, savings, investments and retirement. Free, private, no sign-up.">
<meta property="og:type" content="website">
<link rel="icon" href="${favicon}">
${html.replace("<title>Wealth Pilot</title>", "<title>Wealth Pilot — Smart Salary & Wealth Planner</title>").replace('<div id="root"></div>', "</head>\n<body>\n<div id=\"root\"></div>")}
</body>
</html>
`;
mkdirSync("docs", { recursive: true });
writeFileSync("docs/index.html", page);
writeFileSync("docs/.nojekyll", "");
console.log(`docs/index.html  ${(page.length / 1024).toFixed(0)} KB (for GitHub Pages)`);
