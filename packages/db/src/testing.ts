import { randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { migrate } from './migrate.ts';

export interface TestDatabase {
  ownerUrl: string;
  appUrl: string;
  operatorUrl: string;
  stop(): Promise<void>;
}

function loginUrl(ownerUrl: string, username: string, password: string): string {
  const url = new URL(ownerUrl);
  url.username = username;
  url.password = password;
  return url.toString();
}

const STOP_ATTEMPTS = 3;
const STOP_RETRY_MS = 500;

// Docker can still report the container as running right after stop returns, so the remove gets a 409; stop() only caches success, so a later call removes it.
async function stopContainer(container: StartedPostgreSqlContainer): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await container.stop();
      return;
    } catch (error) {
      const conflict = (error as { statusCode?: number }).statusCode === 409;
      if (!conflict || attempt === STOP_ATTEMPTS) throw error;
      await setTimeout(STOP_RETRY_MS * attempt);
    }
  }
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  try {
    const ownerUrl = container.getConnectionUri();
    await migrate({ connectionString: ownerUrl });

    const appPassword = randomBytes(16).toString('hex');
    const operatorPassword = randomBytes(16).toString('hex');
    const client = new pg.Client({ connectionString: ownerUrl });
    await client.connect();
    try {
      await client.query(
        `create role kronaut_app_login login password ${client.escapeLiteral(appPassword)} in role kronaut_app`,
      );
      await client.query(
        `create role kronaut_operator_login login password ${client.escapeLiteral(operatorPassword)} in role kronaut_operator`,
      );
    } finally {
      await client.end();
    }

    return {
      ownerUrl,
      appUrl: loginUrl(ownerUrl, 'kronaut_app_login', appPassword),
      operatorUrl: loginUrl(ownerUrl, 'kronaut_operator_login', operatorPassword),
      stop: () => stopContainer(container),
    };
  } catch (error) {
    await stopContainer(container).catch(() => undefined);
    throw error;
  }
}
