import { approvalsBrandPolicyUpdate, approvalsPolicyUpdate } from '@kronaut/sdk';
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
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, type Keyed, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { approvalPolicyKey, type PolicyValues } from '../../records/approval-policy/queries.ts';

const APPROVAL_COUNTS = [1, 2, 3, 4, 5] as const;
const TOLERANCE_MAX = 525_600;

function valuesOf(policy: PolicyValues): PolicyValues {
  const { mode, requiredApprovals, allowSelfApproval, rescheduleToleranceMin } = policy;
  return { mode, requiredApprovals, allowSelfApproval, rescheduleToleranceMin };
}

interface PolicyTarget {
  readonly workspaceId: string;
  readonly brandId?: string | undefined;
  readonly version: number | undefined;
}

function useSavePolicy({ workspaceId, brandId, version }: PolicyTarget) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async (values: PolicyValues) => {
      const body = version === undefined ? values : { ...values, expectedVersion: version };
      keyed.current = keyFor(keyed.current, JSON.stringify(body));
      const headers = idempotency(keyed.current);
      if (brandId === undefined) {
        await approvalsPolicyUpdate({ client, path: { workspaceId }, body, headers });
      } else {
        const path = { workspaceId, brandId };
        await approvalsBrandPolicyUpdate({ client, path, body, headers });
      }
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

interface PolicyFormProps extends PolicyTarget {
  readonly title: string;
  readonly initial: PolicyValues;
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

export function PolicyForm({ title, initial, editable, ...target }: PolicyFormProps) {
  const [values, setValues] = useState(() => valuesOf(initial));
  const save = useSavePolicy(target);
  const disabled = !editable || save.isPending;
  const set = (patch: Partial<PolicyValues>) => setValues((current) => ({ ...current, ...patch }));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (editable && !save.isPending) save.mutate(values);
      }}
    >
      <SettingsCard title={title} footer={<SaveFooter save={save} editable={editable} />}>
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
