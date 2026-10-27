import type { ReactNode } from 'react';

interface IconProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Icon({ children, className = 'size-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      {children}
    </svg>
  );
}
