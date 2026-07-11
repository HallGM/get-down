import type { FeeAllocation, AssignedRole, Person } from "@get-down/shared";
import { formatPersonName, resolvePersonName } from "./people.js";

export function getAllocationTitle(
  allocation: FeeAllocation,
  people: Person[],
  roles: AssignedRole[]
): string {
  if (allocation.personId) {
    const person = people.find((p) => p.id === allocation.personId);
    if (person) return formatPersonName(person);
  }
  const role = roles.find((r) => r.feeAllocationId === allocation.id);
  if (role) return `Unassigned. ${role.roleName}`;
  return `Allocation #${allocation.id}`;
}
