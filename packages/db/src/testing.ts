import { randomBytes } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
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
      stop: async () => {
        await container.stop();
      },
    };
  } catch (error) {
    await container.stop();
    throw error;
  }
}
