import { compile } from '@inlang/paraglide-js';
import { PARAGLIDE, PARAGLIDE_CLI } from '../i18n.config.ts';

await compile(PARAGLIDE);
await compile(PARAGLIDE_CLI);
