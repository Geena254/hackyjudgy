import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  resolve(process.cwd(), 'node_modules/@lovable.dev/mcp-js/dist/stacks/tanstack/vite.js'),
  resolve(process.cwd(), 'node_modules/@lovable.dev/mcp-js/dist/stacks/tanstack/vite.cjs'),
];

for (const file of files) {
  if (!existsSync(file)) continue;
  let content = readFileSync(file, 'utf8');
  if (content.includes('!child.startsWith(parent + sep)') || content.includes('!child.startsWith(parent + node_path.sep)')) {
    content = content.replace(
      /function assertContains\(parent, child, label\) \{[\s\S]*?throw new Error\(`@lovable\.dev\/mcp-js: \$\{label\} must resolve under \$\{parent\}, got \$\{child\}`\);\s*\}/,
      `function assertContains(parent, child, label) {
	const nParent = (typeof normalizePath === 'function' ? normalizePath : (p) => p.replace(/\\\\/g, '/'))(parent);
	const nChild = (typeof normalizePath === 'function' ? normalizePath : (p) => p.replace(/\\\\/g, '/'))(child);
	if (nChild !== nParent && !nChild.startsWith(nParent + "/")) throw new Error(\`@lovable.dev/mcp-js: \${label} must resolve under \${parent}, got \${child}\`);
}`
    );
    writeFileSync(file, content, 'utf8');
    console.log(`[patch-mcp] Successfully patched ${file}`);
  }
}
