import { Button, Modal, TextField } from '@kronaut/ui';
import { type FormEvent, useId, useState } from 'react';
import { errorStatus } from '../../base/api/errors.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { GROUP_NAME_MAX } from '../../records/groups/queries.ts';
import { groupError, useCreateGroup } from '../../records/groups/writes.ts';

interface CreateGroupDialogProps {
  readonly workspaceId: string;
  onClose(): void;
}

export function CreateGroupDialog({ workspaceId, onClose }: CreateGroupDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const create = useCreateGroup(workspaceId, onClose);
  const refused = create.error !== null && errorStatus(create.error) !== 401;
  const close = () => {
    if (!create.isPending) onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = name.normalize('NFC').trim();
    if (next !== '' && !create.isPending) create.mutate(next);
  };
  return (
    <Modal labelledBy={titleId} onCancel={close}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <h2 id={titleId} className="font-medium text-lg">
          {settingsText.settings_group_new()}
        </h2>
        <TextField
          label={settingsText.settings_group_name_label()}
          value={name}
          maxLength={GROUP_NAME_MAX}
          error={refused ? groupError(create.error) : undefined}
          onValueChange={(value) => {
            setName(value);
            if (create.error !== null) create.reset();
          }}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {settingsText.settings_group_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {settingsText.settings_group_add()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
