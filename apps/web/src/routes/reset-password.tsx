import { authPasswordReset } from '@kronaut/sdk';
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
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { errorCode } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { passwordHint, passwordProblem } from '../password-policy.ts';
import { AuthLayout } from './auth-layout.tsx';

function tokenFrom(hash: string): string | null {
  const token = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash).get('token');
  return token === null || token === '' ? null : token;
}

function resetError(code: string): string {
  if (code === 'invalid_request') return m.reset_invalid_link();
  if (code === 'unprocessable') return passwordHint();
  return apiErrorMessage(code);
}

export function ResetPasswordPage() {
  const location = useLocation();
  const router = useRouter();
  const [token] = useState(() => tokenFrom(location.hash));
  const [problem, setProblem] = useState<string | null>(null);
  const client = useApiClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash !== '') router.history.replace(location.pathname);
  }, [location.hash, location.pathname, router]);

  const reset = useMutation({
    mutationFn: (body: { token: string; password: string }) => authPasswordReset({ client, body }),
    meta: { authAttempt: true },
    onSuccess: () => navigate({ to: '/login', search: { reason: 'password_set' }, replace: true }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (token === null) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const found = passwordProblem(password) ?? (password === confirm ? null : m.reset_mismatch());
    setProblem(found);
    if (found === null) reset.mutate({ token, password });
  };

  const message = problem ?? (reset.error === null ? null : resetError(errorCode(reset.error)));
  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{m.reset_title()}</h1>
          </CardTitle>
          <CardDescription>{m.reset_subtitle()}</CardDescription>
        </CardHeader>
        <CardContent>
          {token === null ? (
            <p role="alert" className="text-destructive text-sm">
              {m.reset_missing_token()}
            </p>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={submit}>
              {message === null ? null : (
                <p role="alert" className="text-destructive text-sm">
                  {message}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="reset-password">{m.reset_password()}</Label>
                <Input
                  id="reset-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="reset-password-hint"
                  required
                />
                <p id="reset-password-hint" className="text-muted-foreground text-xs">
                  {passwordHint()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reset-confirm">{m.reset_confirm()}</Label>
                <Input
                  id="reset-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" disabled={reset.isPending}>
                {reset.isPending ? m.reset_submitting() : m.reset_submit()}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
