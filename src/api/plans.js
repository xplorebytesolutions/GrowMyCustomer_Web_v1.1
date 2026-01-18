// 📄 src/api/plans.js
import axiosClient from "../api/axiosClient";

// ---------- internal: multi-path fallback (404 or 405) ----------
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
      // Only fall back on "not found" or "method not allowed"
      if (status === 404 || status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  // Exhausted every path
  throw lastErr ?? new Error("No valid API path responded successfully.");
}

// Convenience wrappers
const getTry = (...paths) => tryPaths("get", paths.flat());
const postTry = (paths, payload) => tryPaths("post", paths, payload);
const putTry = (paths, payload) => tryPaths("put", paths, payload);
const deleteTry = (...paths) => tryPaths("delete", paths.flat());

// ---------- Plans (support singular/plural + casing) ----------
export const getPlans = () => getTry(["/plan", "/Plan", "/plans", "/Plans"]);

// Create is implemented as POST /api/Plan/Create on the backend (PlanController)
export const createPlan = payload =>
  postTry(["/Plan/Create", "/plan/Create", "/plan", "/Plan"], payload);

export const updatePlan = (planId, payload) =>
  putTry(
    [
      `/plan/${planId}`,
      `/Plan/${planId}`,
      `/plans/${planId}`,
      `/Plans/${planId}`,
    ],
    payload
  );

export const deletePlan = planId =>
  deleteTry([
    `/plan/${planId}`,
    `/Plan/${planId}`,
    `/plans/${planId}`,
    `/Plans/${planId}`,
  ]);

// ---------- Plan ↔ Permission mapping ----------
export const getPlanPermissions = planId =>
  getTry([`/plan/${planId}/permissions`, `/Plan/${planId}/permissions`]);

// Ensure we always send the shape your backend expects and a clean list
function normalizePermissionIds(ids) {
  if (!Array.isArray(ids)) return [];
  const set = new Set(
    ids
      .filter(Boolean)
      .map(x => String(x).trim())
      .filter(x => x.length > 0)
  );
  return Array.from(set);
}

/**
 * Update plan ↔ permission mapping.
 *
 * Supports both call styles:
 *   updatePlanPermissions(planId, ["id1", "id2"])
 *   updatePlanPermissions(planId, { permissionIds: [...], replaceAll: true })
 *   updatePlanPermissions(planId, { enabledPermissionIds: [...], replaceAll: true })
 */
export const updatePlanPermissions = (planId, payload, replaceAll = true) => {
  let permissionIds;

  // Case 1: caller passes an array → treat as raw ids
  if (Array.isArray(payload)) {
    permissionIds = payload;
  }
  // Case 2: caller passes an object → expect { permissionIds, replaceAll? }
  else if (payload && typeof payload === "object") {
    permissionIds = payload.permissionIds ?? payload.enabledPermissionIds ?? [];
    if (typeof payload.replaceAll === "boolean") {
      replaceAll = payload.replaceAll;
    }
  } else {
    permissionIds = [];
  }

  return putTry(
    [`/plan/${planId}/permissions`, `/Plan/${planId}/permissions`],
    {
      permissionIds: normalizePermissionIds(permissionIds),
      replaceAll,
    }
  );
};

// ---------- Permission catalog (grouped) ----------
export const getGroupedPermissions = async () => {
  // Prefer lowercase first (your newer endpoints), then PascalCase
  try {
    const res = await axiosClient.get("/permission/grouped");
    // Return array directly for the UI (it maps over it)
    return res?.data?.data ?? res?.data ?? [];
  } catch (err) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      const res2 = await axiosClient.get("/Permission/grouped");
      return res2?.data?.data ?? res2?.data ?? [];
    }
    throw err;
  }
};

// ---------- Plan ↔ Quotas mapping (new) ----------
// These talk to: GET/PUT /admin/plans/{planId}/quotas (with fallbacks)

export const getPlanQuotas = planId =>
  getTry([
    `/admin/plans/${planId}/quotas`,
    `/plans/${planId}/quotas`,
    `/Plans/${planId}/quotas`,
  ]);

export const updatePlanQuotas = (planId, quotas) =>
  putTry(
    [
      `/admin/plans/${planId}/quotas`,
      `/plans/${planId}/quotas`,
      `/Plans/${planId}/quotas`,
    ],
    quotas
  );

// ---------- Plan Assignment (to Businesses) ----------

export const getApprovedBusinessesForAssignment = () =>
  getTry(["/businesses/approved", "/business/approved"]);

export const assignPlanToBusiness = (businessId, planId) =>
  putTry(
    [`/businesses/${businessId}/plan`, `/business/${businessId}/plan`],
    { planId }
  );
