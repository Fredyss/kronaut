import { Button } from '@kronaut/ui';
import { useId } from 'react';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { EditNotes } from './edit-notes.tsx';
import { Failure } from './failure.tsx';
import { REPEAT_ROLES } from './repeat.ts';
import type { OpenedCompose, useComposeForm } from './use-compose-form.ts';
import { submitLabel } from './when.ts';
import { ModeOption, WhenFieldset } from './when-fieldset.tsx';

type FormState = ReturnType<typeof useComposeForm>;

function SubmitRow({
  label,
  disabled,
  describedBy,
  onRequest,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly describedBy: string | undefined;
  readonly onRequest: (() => void) | undefined;
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button type="submit" disabled={disabled} aria-describedby={describedBy}>
        {label}
      </Button>
      {onRequest === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={describedBy}
          onClick={onRequest}
        >
          {m.compose_request_approval()}
        </Button>
      )}
    </div>
  );
}

function WhenSection({
  form,
  role,
  opened,
}: {
  readonly form: FormState;
  readonly role: string;
  readonly opened: OpenedCompose | undefined;
}) {
  const { when, pending, approval, queue, repeat } = form;
  const dateId = useId();
  const timeId = useId();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto md:self-stretch">
      <WhenFieldset
        when={when}
        dateId={dateId}
        timeId={timeId}
        pending={pending}
        note={approval.requesting ? approval.note : undefined}
        queue={approval.request ? undefined : queue}
        repeat={REPEAT_ROLES.has(role) && opened === undefined ? repeat : undefined}
        extraMode={
          <ModeOption
            value="draft"
            label={composeText.compose_keep_draft()}
            when={when}
            disabled={pending}
          />
        }
      />
      {opened === undefined ? null : (
        <EditNotes form={opened} mode={when.mode} selected={form.selected} />
      )}
    </div>
  );
}

export function ComposeBar({
  form,
  role,
  opened,
  limitsId,
  onReload,
}: {
  readonly form: FormState;
  readonly role: string;
  readonly opened: OpenedCompose | undefined;
  readonly limitsId: string;
  readonly onReload: (() => void) | undefined;
}) {
  const { formError, failure, list, when, pending, approval, blocked, requestInstead } = form;
  return (
    <div className="sticky bottom-0 flex max-h-[45svh] flex-col gap-3 border-t bg-background p-4 md:p-5">
      {formError === null && failure === null ? null : (
        <div className="flex max-h-28 shrink-0 flex-col gap-2 overflow-y-auto">
          {formError === null ? null : (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}
          {failure === null ? null : (
            <Failure error={failure} channels={list} onReload={onReload} />
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <WhenSection form={form} role={role} opened={opened} />
        <SubmitRow
          label={submitLabel(when.mode, pending, approval.requesting)}
          disabled={pending || blocked || form.tags.creating}
          describedBy={blocked ? limitsId : undefined}
          onRequest={approval.offer ? requestInstead : undefined}
        />
      </div>
    </div>
  );
}
