interface CountBadgeProps {
  count: number;
  noun: string;
  /** Custom plural form. Defaults to noun + "s". */
  plural?: string;
}

export default function CountBadge({ count, noun, plural }: CountBadgeProps) {
  const label = count !== 1 ? (plural ?? `${noun}s`) : noun;
  return (
    <small style={{ color: "var(--pico-muted-color)" }}>
      {count} {label}
    </small>
  );
}
