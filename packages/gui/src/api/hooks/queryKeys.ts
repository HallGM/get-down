import type { QueryClient } from "@tanstack/react-query";

export const PEOPLE_KEY = "people";
export const ROLES_KEY = "roles-list";

export function invalidateRoleLinkCaches(
  queryClient: QueryClient,
  personId: number,
  roleId: number,
): void {
  void queryClient.invalidateQueries({ queryKey: [PEOPLE_KEY] });
  void queryClient.invalidateQueries({ queryKey: [PEOPLE_KEY, personId] });
  void queryClient.invalidateQueries({ queryKey: [PEOPLE_KEY, personId, "roles"] });
  void queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
  void queryClient.invalidateQueries({ queryKey: [ROLES_KEY, roleId] });
  void queryClient.invalidateQueries({ queryKey: [ROLES_KEY, roleId, "people"] });
}
