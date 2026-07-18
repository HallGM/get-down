import type { FeeAllocation, AssignedRole, Person } from "@get-down/shared";
import { formatPersonName, resolvePersonName, formatShowcaseName } from "./people.js";
import { formatDate } from "./date.js";

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

/**
 * Build initial values for an expense tied to a fee allocation.
 * Generates a description in the format: `<role(s)> - <date> - <entity name>`
 * If no roles are linked, omits the role prefix: `<date> - <entity name>`
 */
export function buildExpenseInitialValues(
  entity: { date: string } | null | undefined,
  linkedRoles: { roleName: string }[],
  allocation: { personId?: number | null; lineItems?: { amount?: number | null }[] },
  people: Person[],
  formatEntityName: (entity: { date: string }) => string,
): { description: string; amount: number; recipientName: string } | undefined {
  if (!entity || !allocation.personId) return undefined;

  const roleNames = linkedRoles.map((r) => r.roleName).join("/");
  const date = formatDate(entity.date);
  const name = formatEntityName(entity);
  const description = roleNames
    ? `${roleNames} - ${date} - ${name}`
    : `${date} - ${name}`;

  return {
    description,
    amount: (allocation.lineItems ?? []).reduce((sum, li) => sum + (li.amount ?? 0), 0),
    recipientName: resolvePersonName(people, allocation.personId),
  };
}
