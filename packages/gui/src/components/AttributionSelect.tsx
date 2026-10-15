import type { Attribution } from "@get-down/shared";
import FormField from "./FormField.js";

interface Props {
  attributions: Attribution[];
  value: number | null | undefined;
  onChange: (attributionId: number | null) => void;
}

export default function AttributionSelect({ attributions, value, onChange }: Props) {
  return (
    <FormField
      as="select"
      label="Attribution"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">No attribution</option>
      {attributions.map((attribution) => (
        <option key={attribution.id} value={attribution.id}>{attribution.name}</option>
      ))}
    </FormField>
  );
}
