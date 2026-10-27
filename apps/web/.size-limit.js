import { readdirSync, readFileSync } from 'node:fs';

const ASSETS = 'dist/web/assets';

// Only what index.html loads is the shell; chunks shared by lazy routes arrive later and are budgeted apart.
function shellChunks() {
  const html = readFileSync('dist/web/index.html', 'utf8');
  return [...new Set(html.match(/assets\/[^"']+\.js/g) ?? [])].map((path) => `dist/web/${path}`);
}

const LAZY = {
  'sk messages JS': ['sk', '10 KB'],
  'cs messages JS': ['cs', '10 KB'],
  'composer route JS': ['compose', '40 KB'],
  'post status route JS': ['post', '40 KB'],
  'calendar route JS': ['calendar', '40 KB'],
  'inbox route JS': ['inbox', '40 KB'],
  'settings layout JS': ['settings-layout', '40 KB'],
  'account settings route JS': ['settings-account', '40 KB'],
  'approval settings route JS': ['settings-approvals', '40 KB'],
  'notification settings route JS': ['settings-notifications', '40 KB'],
  'notifications panel JS': ['panel', '10 KB'],
  'editor JS': ['editor', '130 KB'],
  'text limits JS': ['text-limits', '5 KB'],
  'preview JS': ['preview', '10 KB'],
};

function sharedLazyChunks(shell) {
  const named = Object.values(LAZY).map(([prefix]) => `${prefix}-`);
  return readdirSync(ASSETS)
    .filter((file) => file.endsWith('.js'))
    .map((file) => `${ASSETS}/${file}`)
    .filter((path) => !shell.includes(path))
    .filter((path) => !named.some((prefix) => path.startsWith(`${ASSETS}/${prefix}`)));
}

const shell = shellChunks();

export default [
  { name: 'shell JS', path: shell, limit: '135 KB', gzip: true },
  ...Object.entries(LAZY).map(([name, [prefix, limit]]) => ({
    name,
    path: `${ASSETS}/${prefix}-*.js`,
    limit,
    gzip: true,
  })),
  { name: 'shared lazy JS', path: sharedLazyChunks(shell), limit: '30 KB', gzip: true },
  { name: 'CSS', path: `${ASSETS}/*.css`, limit: '25 KB', gzip: true },
];
