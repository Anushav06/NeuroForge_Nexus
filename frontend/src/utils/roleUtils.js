/**
 * >>> ASSUMPTION (fix if wrong): you have some auth context/hook that
 * exposes the logged-in user's role, e.g. `useAuth()` returning
 * `{ user: { role: "ADMIN" } }`. Adjust the import + usage in each
 * page below to match whatever your real hook is actually called
 * (you've mentioned a 5-role system: ADMIN, PROJECT_LEAD,
 * PROJECT_MANAGER, TEAM_LEAD, EMPLOYEE — matches backend @PreAuthorize).
 */

// Mirrors backend @PreAuthorize("hasAnyRole(...)") checks for M4 endpoints.
export const CAN_MANAGE_RELEASES = ["ADMIN", "PROJECT_LEAD", "PROJECT_MANAGER", "TEAM_LEAD"];
export const CAN_VIEW_RELEASES = [...CAN_MANAGE_RELEASES, "EMPLOYEE"];
export const CAN_DEPLOY = ["ADMIN", "PROJECT_LEAD", "PROJECT_MANAGER", "TEAM_LEAD"];
export const CAN_VIEW_DEPLOYMENTS = [...CAN_DEPLOY, "EMPLOYEE"];

export function hasRole(userRole, allowedRoles) {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}