"use client";

type LocalDateProps = {
  value: string | null | undefined;
};

export function LocalDate({ value }: LocalDateProps) {
  if (!value) {
    return <span>-</span>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span>{value}</span>;
  }

  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);

  return <time dateTime={value}>{formatted}</time>;
}
