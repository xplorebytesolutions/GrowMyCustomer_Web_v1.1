import axiosClient from "./axiosClient";

export const ACCESS_CONTROL_ENDPOINTS = {
  // Backend (xbytechat-api) canonical routes:
  // - GET/POST/PUT/DELETE: /api/accesscontrol/business-roles
  // - GET/PUT: /api/accesscontrol/business-roles/{roleId}/permissions
  // - GET grouped catalog: /api/permission/grouped
  businessRoles: "/accesscontrol/business-roles",
  permissions: "/permission",
  permissionGrouped: "/permission/grouped",
  businessRolePermissions: roleId =>
    `/accesscontrol/business-roles/${roleId}/permissions`,
  teamStaff: "/TeamStaff",
};

async function tryPaths(method, paths, payload) {
  let lastErr;
  for (const p of paths) {
    try {
      if (method === "get") return await axiosClient.get(p);
      if (method === "post") return await axiosClient.post(p, payload);
      if (method === "put") return await axiosClient.put(p, payload);
      if (method === "delete") return await axiosClient.delete(p);
      throw new Error(`Unsupported method: ${method}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("No valid API path responded successfully.");
}

export async function getBusinessRoles() {
  return tryPaths("get", [
    "/accesscontrol/business-roles",
    // legacy fallbacks (older UI/backends)
    "/BusinessRoles",
    "/businessroles",
  ]);
}

export async function createBusinessRole(payload) {
  return tryPaths(
    "post",
    ["/accesscontrol/business-roles", "/BusinessRoles", "/businessroles"],
    payload
  );
}

export async function updateBusinessRole(id, payload) {
  return tryPaths(
    "put",
    [
      `/accesscontrol/business-roles/${id}`,
      `/BusinessRoles/${id}`,
      `/businessroles/${id}`,
    ],
    payload
  );
}

export async function deleteBusinessRole(id) {
  return tryPaths("delete", [
    `/accesscontrol/business-roles/${id}`,
    `/BusinessRoles/${id}`,
    `/businessroles/${id}`,
  ]);
}

export async function getPermissionsCatalog() {
  return tryPaths("get", [
    // preferred: available to any authenticated user
    "/permission/grouped",
    // admin-only flat list
    "/permission",
    // legacy fallbacks
    "/Permissions",
    "/permissions",
  ]);
}

export async function getRolePermissions(roleId) {
  return tryPaths("get", [
    `/accesscontrol/business-roles/${roleId}/permissions`,
    `/BusinessRolePermissions/${roleId}`,
    `/businessrolepermissions/${roleId}`,
  ]);
}

export async function saveRolePermissions(roleId, payload) {
  return tryPaths(
    // Backend uses PUT to replace the permission set.
    "put",
    [
      `/accesscontrol/business-roles/${roleId}/permissions`,
      `/BusinessRolePermissions/${roleId}`,
      `/businessrolepermissions/${roleId}`,
    ],
    payload
  );
}

export async function getTeamStaff() {
  return tryPaths("get", ["/TeamStaff", "/teamstaff"]);
}
