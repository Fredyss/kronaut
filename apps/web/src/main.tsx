import { createApiClient } from '@kronaut/sdk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, createApp } from './app.tsx';
import './styles.css';
import { applyTheme, storedTheme } from './theme.tsx';

applyTheme(storedTheme());

const client = createApiClient();
const { router, queryClient } = createApp(client);
const root = document.getElementById('root');
if (root === null) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <App router={router} queryClient={queryClient} client={client} />
  </StrictMode>,
);
