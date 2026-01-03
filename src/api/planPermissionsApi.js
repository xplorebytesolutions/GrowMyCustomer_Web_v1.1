import axiosClient from "./axiosClient";

export const PLAN_PERMISSIONS_ENDPOINTS = {
  plans: "/Plans",
  permissions: "/Permissions",
  planPermissions: planId => `/PlanPermissions/${planId}`,
};

async function tryPaths(method, paths, payload) {
  let lastErr;
  for (const p of paths) {
    try {
      if (method === "get") return await axiosClient.get(p);
      if (method === "post") return await axiosClient.post(p, payload);
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

export async function getPlans() {
  return tryPaths("get", ["/Plans", "/plans", "/Plan", "/plan"]);
}

export async function getPermissionsCatalog() {
  return tryPaths("get", ["/Permissions", "/permissions"]);
}

export async function getPlanPermissions(planId) {
  return tryPaths("get", [`/PlanPermissions/${planId}`, `/planpermissions/${planId}`]);
}

export async function savePlanPermissions(planId, payload) {
  return tryPaths(
    "post",
    [`/PlanPermissions/${planId}`, `/planpermissions/${planId}`],
    payload
  );
}

