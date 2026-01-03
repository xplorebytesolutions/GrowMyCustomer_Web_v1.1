import axiosClient from "./axiosClient";

export const TEAM_STAFF_ENDPOINTS = {
  list: "/TeamStaff",
  roles: "/TeamStaff/roles",
  create: "/TeamStaff",
  update: id => `/TeamStaff/${id}`,
  setStatus: (id, newStatus) =>
    `/TeamStaff/${id}/status?newStatus=${encodeURIComponent(newStatus)}`,
};

async function tryPaths(method, paths, payload) {
  let lastErr;
  for (const p of paths) {
    try {
      if (method === "get") return await axiosClient.get(p);
      if (method === "post") return await axiosClient.post(p, payload);
      if (method === "put") return await axiosClient.put(p, payload);
      if (method === "patch") return await axiosClient.patch(p, payload);
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

export async function getTeamStaffList() {
  return tryPaths("get", ["/TeamStaff", "/teamstaff"]);
}

export async function getTeamStaffRoles() {
  return tryPaths("get", ["/TeamStaff/roles", "/teamstaff/roles"]);
}

export async function createTeamStaff(payload) {
  return tryPaths("post", ["/TeamStaff", "/teamstaff"], payload);
}

export async function updateTeamStaff(id, payload) {
  return tryPaths("put", [`/TeamStaff/${id}`, `/teamstaff/${id}`], payload);
}

export async function setTeamStaffStatus(id, newStatus) {
  const qs = `newStatus=${encodeURIComponent(newStatus)}`;
  return tryPaths("patch", [
    `/TeamStaff/${id}/status?${qs}`,
    `/teamstaff/${id}/status?${qs}`,
  ]);
}

