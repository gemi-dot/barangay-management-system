"use client";

type LocalDateTimeProps = {
  value: string | null | undefined;
};

export function LocalDateTime({ value }: LocalDateTimeProps) {
  if (!value) {
    return <span>-</span>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span>{value}</span>;
  }

  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  return <time dateTime={value}>{formatted}</time>;
}
