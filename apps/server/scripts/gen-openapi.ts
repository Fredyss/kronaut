import { writeFileSync } from 'node:fs';
import { OPENAPI_PATH, renderOpenApi } from '../src/openapi.ts';

writeFileSync(OPENAPI_PATH, renderOpenApi());
