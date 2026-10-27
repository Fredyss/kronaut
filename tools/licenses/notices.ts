import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectPackages, type Pkg } from './collect.ts';

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([-_.].*)?$/i;
const SEPARATOR = `\n${'-'.repeat(72)}\n\n`;
const HEADER = `Kronaut bundles the third-party components listed below. Each component is
distributed under its own license, shown with it.
`;

function licenseTexts(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => LICENSE_FILE.test(file) && statSync(join(dir, file)).isFile())
    .sort()
    .map((file) =>
      readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n').replace(/\s+$/, ''),
    );
}

function render(pkg: Pkg): string {
  const lines = [`${pkg.name}@${pkg.version}`, `License: ${pkg.license}`];
  if (pkg.homepage) lines.push(`Homepage: ${pkg.homepage}`);
  const texts = licenseTexts(pkg.path);
  const body =
    texts.length > 0
      ? texts.join('\n\n')
      : `License file not included in the package; see ${pkg.license}`;
  return `${lines.join('\n')}\n\n${body}\n`;
}

const packages = collectPackages();
const target = process.argv[2] ?? './THIRD_PARTY_NOTICES';
writeFileSync(target, `${HEADER}${SEPARATOR}${packages.map(render).join(SEPARATOR)}`);
console.log(`notices: ${packages.length} packages written to ${target}`);
