export function focusNeighbour(row: HTMLElement | null): void {
  const sibling = row?.nextElementSibling ?? row?.previousElementSibling;
  const target = sibling?.querySelector('button') ?? row?.closest<HTMLElement>('[tabindex="-1"]');
  target?.focus();
}
