import { Temporal } from 'temporal-polyfill';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DOTTED_DATE = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/;
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function dateOf(text: string): Temporal.PlainDate | null {
  const iso = ISO_DATE.exec(text);
  const dotted = iso === null ? DOTTED_DATE.exec(text) : null;
  const [year, month, day] =
    iso === null ? [dotted?.[3], dotted?.[2], dotted?.[1]] : [iso[1], iso[2], iso[3]];
  if (year === undefined || month === undefined || day === undefined) return null;
  const fields = { year: Number(year), month: Number(month), day: Number(day) };
  return Temporal.PlainDate.from(fields, { overflow: 'reject' });
}

function timeOf(text: string): Temporal.PlainTime | null {
  const match = TIME.exec(text);
  if (match === null || (match[3] !== undefined && match[3] !== '00')) return null;
  const fields = { hour: Number(match[1]), minute: Number(match[2]) };
  return Temporal.PlainTime.from(fields, { overflow: 'reject' });
}

export function localDateTime(date: string, time: string): Temporal.PlainDateTime | null {
  try {
    const day = dateOf(date);
    const at = timeOf(time);
    return day === null || at === null ? null : day.toPlainDateTime(at);
  } catch {
    return null;
  }
}
