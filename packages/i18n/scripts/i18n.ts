import { compile } from '@inlang/paraglide-js';
import { PARAGLIDE, PARAGLIDE_CLI, PARAGLIDE_GROUPS } from '../i18n.config.ts';

await compile(PARAGLIDE);
await compile(PARAGLIDE_CLI);
for (const options of Object.values(PARAGLIDE_GROUPS)) await compile(options);
