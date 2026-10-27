import { authLogin } from '@kronaut/sdk';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { errorCode, ME_KEY } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { safeNext } from '../next.ts';
import { AuthLayout } from './auth-layout.tsx';

export interface LoginSearch {
  readonly next?: string;
  readonly reason?: 'expired' | 'password_set';
}

const route = getRouteApi('/login');

function notice(reason: LoginSearch['reason']): string | null {
  if (reason === 'expired') return m.login_session_expired();
  if (reason === 'password_set') return m.login_password_set();
  return null;
}

export function LoginPage() {
  const { next, reason } = route.useSearch();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) => authLogin({ client, body }),
    meta: { authAttempt: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      await navigate({ href: safeNext(next), replace: true });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    login.mutate({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
  };

  const info = notice(reason);
  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{m.login_title()}</h1>
          </CardTitle>
          <CardDescription>{m.login_subtitle()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={submit}>
            {info === null ? null : (
              <p role="status" className="rounded-md bg-secondary px-3 py-2 text-sm">
                {info}
              </p>
            )}
            {login.error === null ? null : (
              <p role="alert" className="text-destructive text-sm">
                {apiErrorMessage(errorCode(login.error))}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">{m.login_email()}</Label>
              <Input id="login-email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">{m.login_password()}</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? m.login_submitting() : m.login_submit()}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
