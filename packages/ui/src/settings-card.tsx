import { type ReactNode, useId } from 'react';
import { Card } from './card.tsx';

interface SettingsCardProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

export function SettingsCard({ title, children, footer }: SettingsCardProps) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <Card className="gap-0 py-0">
        <h3 id={id} className="border-b px-6 py-4 font-semibold">
          {title}
        </h3>
        <div className="flex flex-col divide-y">{children}</div>
        {footer === undefined ? null : (
          <div className="flex flex-col gap-3 border-t px-6 py-4">{footer}</div>
        )}
      </Card>
    </section>
  );
}
