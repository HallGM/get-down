import type { ServiceGroup } from "@get-down/shared";

interface ServiceGroupCheckboxesProps {
  groups?: ServiceGroup[] | null;
  selectedIds?: number[] | null;
  onChange: (groupIds: number[]) => void;
}

export default function ServiceGroupCheckboxes({ groups, selectedIds, onChange }: ServiceGroupCheckboxesProps) {
  const availableGroups = groups ?? [];
  const selectedGroupIds = selectedIds ?? [];

  return (
    <fieldset>
      <legend>Client form groups</legend>
      {availableGroups.map((group) => {
        const checked = selectedGroupIds.includes(group.id);
        return (
          <label key={group.id}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(
                event.target.checked
                  ? [...selectedGroupIds, group.id]
                  : selectedGroupIds.filter((id) => id !== group.id),
              )}
            /> {group.name}
          </label>
        );
      })}
    </fieldset>
  );
}
