import { approvalsPolicyUpdate } from '@kronaut/sdk';
import {
  Button,
  type ControlIds,
  Input,
  Select,
  SettingsCard,
  SettingsRow,
  toast,
} from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useApiClient } from '../api/client.ts';
import { errorCode, errorStatus } from '../api/errors.ts';
import { idempotency, type Keyed, keyFor } from '../api/idempotency.ts';
import {
  approvalPolicyKey,
  type PolicyResponse,
  type PolicyValues,
} from '../approval-policy/queries.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { apiErrorMessage, m } from '../locale/i18n.ts';

const APPROVAL_COUNTS = [1, 2, 3, 4, 5] as const;
const TOLERANCE_MAX = 525_600;

function valuesOf(policy: PolicyResponse): PolicyValues {
  const { mode, requiredApprovals, allowSelfApproval, rescheduleToleranceMin } =
    policy.workspace ?? policy.effective;
  return { mode, requiredApprovals, allowSelfApproval, rescheduleToleranceMin };
}

function useSavePolicy(workspaceId: string, version: number | undefined) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async (values: PolicyValues) => {
      const body = version === undefined ? values : { ...values, expectedVersion: version };
      keyed.current = keyFor(keyed.current, JSON.stringify(body));
      const headers = idempotency(keyed.current);
      return (await approvalsPolicyUpdate({ client, path: { workspaceId }, body, headers })).data;
    },
    onSuccess: () => {
      keyed.current = null;
      toast(settingsText.settings_saved());
    },
    onError: (error) => {
      if (errorStatus(error) === 409) toast(settingsText.settings_conflict());
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalPolicyKey(workspaceId) }),
  });
}

type SavePolicy = ReturnType<typeof useSavePolicy>;

interface PolicyFormProps {
  readonly workspaceId: string;
  readonly policy: PolicyResponse;
  readonly editable: boolean;
}

function Checkbox({
  ids,
  checked,
  disabled,
  onChange,
}: {
  readonly ids: ControlIds;
  readonly checked: boolean;
  readonly disabled: boolean;
  onChange(checked: boolean): void;
}) {
  return (
    <input
      {...ids}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
      className="size-4 accent-primary"
    />
  );
}

function SaveFooter({ save, editable }: { readonly save: SavePolicy; readonly editable: boolean }) {
  const failed = save.error !== null && errorStatus(save.error) !== 409;
  if (!failed && !editable) return null;
  return (
    <>
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {apiErrorMessage(errorCode(save.error))}
        </p>
      ) : null}
      {editable ? (
        <div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? settingsText.settings_saving() : m.settings_save()}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export function PolicyForm({ workspaceId, policy, editable }: PolicyFormProps) {
  const [values, setValues] = useState(() => valuesOf(policy));
  const save = useSavePolicy(workspaceId, policy.workspace?.version);
  const disabled = !editable || save.isPending;
  const set = (patch: Partial<PolicyValues>) => setValues((current) => ({ ...current, ...patch }));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (editable && !save.isPending) save.mutate(values);
      }}
    >
      <SettingsCard
        title={settingsText.settings_policy_title()}
        footer={<SaveFooter save={save} editable={editable} />}
      >
        <SettingsRow label={settingsText.settings_approval_required()}>
          {(ids) => (
            <Checkbox
              ids={ids}
              checked={values.mode === 'required'}
              disabled={disabled}
              onChange={(on) => set({ mode: on ? 'required' : 'none' })}
            />
          )}
        </SettingsRow>
        <SettingsRow label={settingsText.settings_required_approvals()}>
          {(ids) => (
            <Select
              {...ids}
              value={values.requiredApprovals}
              disabled={disabled}
              onChange={(event) => set({ requiredApprovals: Number(event.currentTarget.value) })}
              className="h-9 w-24"
            >
              {APPROVAL_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </Select>
          )}
        </SettingsRow>
        <SettingsRow label={settingsText.settings_allow_self()}>
          {(ids) => (
            <Checkbox
              ids={ids}
              checked={values.allowSelfApproval}
              disabled={disabled}
              onChange={(on) => set({ allowSelfApproval: on })}
            />
          )}
        </SettingsRow>
        <SettingsRow label={settingsText.settings_tolerance()}>
          {(ids) => (
            <Input
              {...ids}
              type="number"
              min={0}
              max={TOLERANCE_MAX}
              step={1}
              value={values.rescheduleToleranceMin}
              disabled={disabled}
              onChange={(event) => {
                const minutes = Math.trunc(Number(event.currentTarget.value));
                set({
                  rescheduleToleranceMin: Math.min(Math.max(minutes || 0, 0), TOLERANCE_MAX),
                });
              }}
              className="w-32"
            />
          )}
        </SettingsRow>
      </SettingsCard>
    </form>
  );
}
