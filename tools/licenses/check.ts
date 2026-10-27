import { collectPackages } from './collect.ts';
import { isAllowed } from './policy.ts';

const packages = collectPackages();
const offenders = packages.filter((pkg) => !isAllowed(pkg.name, pkg.license));

if (offenders.length > 0) {
  console.error('Packages outside the license policy (tools/licenses/policy.ts):');
  for (const pkg of offenders) console.error(`  ${pkg.name}@${pkg.version}: ${pkg.license}`);
  process.exit(1);
}

const seen = [...new Set(packages.map((pkg) => pkg.license))].sort();
console.log(`licenses: ${packages.length} packages OK (${seen.join(', ')})`);
