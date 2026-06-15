interface TabBarProps<T extends string> {
  tabs: T[];
  labels: Record<T, string>;
  active: T;
  onChange: (tab: T) => void;
}

export default function TabBar<T extends string>({ tabs, labels, active, onChange }: TabBarProps<T>) {
  return (
    <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "1.5rem" }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={active === tab ? "outline" : "secondary outline"}
          style={{ borderBottom: active === tab ? "2px solid var(--pico-primary)" : "none", borderRadius: 0, padding: "0.4em 1em" }}
          onClick={() => onChange(tab)}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}
