// 📄 src/pages/admin/FeatureAccess/PlanManagement.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { QUOTA_DEFINITIONS } from "../../../capabilities/quotaKeys";
// Icons
import {
  Check,
  ShieldCheck,
  Settings2,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  AlertTriangle,
  Clock4,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  Sparkles,
  Shield,
  LayoutGrid,
} from "lucide-react";

// API helpers
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanPermissions,
  updatePlanPermissions,
  getPlanQuotas,
  updatePlanQuotas,
  assignPlanToBusiness,
  getApprovedBusinessesForAssignment,
} from "../../../api/plans";

import { getGroupedPermissions } from "../../../api/permissions";
import axiosClient from "../../../api/axiosClient";

// Small helpers
const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-rose-100 text-rose-700 border-rose-200",
};

const QUOTA_PERIOD_LABELS = {
  0: "Lifetime",
  1: "Daily",
  2: "Monthly",
};

const KNOWN_QUOTA_LABELS = QUOTA_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.label;
  return acc;
}, {});

// --- Specialized UI Components ---

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

const GlassCard = ({ children, className = "" }) => (
  <div className={`bg-white/70 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl ${className}`}>
    {children}
  </div>
);

const QUOTA_PRESETS = [
  { label: "Free Tier", values: { MESSAGES_PER_MONTH: 100, CRM_CONTACTS: 100, CATALOG_ITEMS: 10 } },
  { label: "Business", values: { MESSAGES_PER_MONTH: 10000, CRM_CONTACTS: 5000, CATALOG_ITEMS: 200 } },
  { label: "Enterprise", values: { MESSAGES_PER_MONTH: 100000, CRM_CONTACTS: 50000, CATALOG_ITEMS: 1000 } },
  { label: "Unlimited", values: { MESSAGES_PER_MONTH: -1, CRM_CONTACTS: -1, CATALOG_ITEMS: -1 } },
];

function formatCompactNumber(value) {
  if (value === -1) return "∞";
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function StatusPill({ isActive }) {
  const label = isActive ? "Active" : "Inactive";
  const color = isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`relative px-2 py-2.5 text-sm font-semibold transition-all outline-none rounded-t-lg hover:bg-slate-50 ${
        active ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <span className="relative z-10">{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabUnderline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}

export default function PlanManagementPage() {
  const navigate = useNavigate();

  // Plans
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Active tab: plan | features | quotas

  const [activeTab, setActiveTab] = useState("plan");
  // Plan form (create/update)
  const [isEditing, setIsEditing] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: null,
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Permissions
  const [groupedPermissions, setGroupedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());
  const [permissionFilter, setPermissionFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Quotas
  const [quotaRows, setQuotaRows] = useState([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);
  const [showQuotaPresets, setShowQuotaPresets] = useState(false);

  // Per-plan quota summary (for Plan tab)
  const [planQuotaSummaries, setPlanQuotaSummaries] = useState({});
 
  // Business assignment state
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [businessFilter, setBusinessFilter] = useState("");
  const [savingBusinessPlan, setSavingBusinessPlan] = useState({}); // { businessId: bool }

  // --- helpers for quota summaries ---
  const buildQuotaSummary = useCallback(list => {
    const normalizeKey = key => (key ?? "").toString().trim().toUpperCase();
    const findRow = quotaKey => {
      const row = list.find(
        q => normalizeKey(q.quotaKey ?? q.QuotaKey) === quotaKey
      );
      if (!row) return null;
      const limit =
        typeof row.limit === "number"
          ? row.limit
          : typeof row.Limit === "number"
          ? row.Limit
          : undefined;
      const period =
        typeof row.period === "number"
          ? row.period
          : typeof row.Period === "number"
          ? row.Period
          : undefined;
      if (limit === undefined) return null;
      return { limit, period };
    };

    return {
      messagesPerMonth: findRow("MESSAGES_PER_MONTH"),
      campaignsPerDay: findRow("CAMPAIGNS_PER_DAY"),
    };
  }, []);

  const prefetchPlanQuotaSummaries = useCallback(
    async plansArray => {
      try {
        const entries = await Promise.all(
          plansArray.map(async p => {
            try {
              const data = await getPlanQuotas(p.id);
              const list = Array.isArray(data) ? data : data?.data ?? [];
              return [p.id, buildQuotaSummary(list)];
            } catch (err) {
              console.error("Failed to prefetch quotas for plan", p.id, err);
              return [p.id, null];
            }
          })
        );

        setPlanQuotaSummaries(prev => {
          const next = { ...prev };
          for (const [id, summary] of entries) {
            if (summary) next[id] = summary;
          }
          return next;
        });
      } catch (err) {
        console.error("Prefetch quota summaries failed", err);
      }
    },
    [buildQuotaSummary]
  );

  // Effects – initial load
  useEffect(() => {
    loadPlans();
    loadPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getPlans();
      const data = Array.isArray(res?.data ?? res) ? res.data ?? res : res;
      const safe = data || [];
      setPlans(safe);

      if ((!selectedPlan || !selectedPlan.id) && safe.length > 0) {
        setSelectedPlan(safe[0]);
      }

      if (Array.isArray(safe) && safe.length > 0) {
        prefetchPlanQuotaSummaries(safe);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedPlan, prefetchPlanQuotaSummaries]);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await getGroupedPermissions();
      const payload = res?.data?.data ?? res?.data ?? res;
      const groups = payload?.groups ?? payload ?? [];
      setGroupedPermissions(groups);

      const allGroups = new Set(groups.map(g => g.group ?? g.Group ?? "Other"));
      setExpandedGroups(allGroups);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions catalog");
    }
  }, []);

  const loadPlanPermissions = useCallback(async planId => {
    if (!planId) {
      setSelectedPermissionIds(new Set());
      return;
    }
    setLoadingPermissions(true);
    try {
      const res = await getPlanPermissions(planId);
      const payload = res?.data ?? res;
      const ids = new Set(payload.map(p => p.id ?? p.Id));
      setSelectedPermissionIds(ids);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions for this plan");
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  const loadPlanQuotas = useCallback(
    async planId => {
      if (planId === undefined || planId === null) {
        setQuotaRows([]);
        return;
      }
      setQuotaLoading(true);
      try {
        const data = await getPlanQuotas(planId);
        const list = Array.isArray(data) ? data : data?.data ?? [];

        const normalized = list.map(q => ({
          id: q.id ?? q.Id,
          planId: q.planId ?? q.PlanId,
          quotaKey: (q.quotaKey ?? q.QuotaKey ?? "").toUpperCase(),
          limit:
            typeof q.limit === "number"
              ? q.limit
              : typeof q.Limit === "number"
              ? q.Limit
              : 0,
          period:
            typeof q.period === "number"
              ? q.period
              : typeof q.Period === "number"
              ? q.Period
              : 2,
          denialMessage: q.denialMessage ?? q.DenialMessage ?? "",
        }));

        setQuotaRows(normalized);

        setPlanQuotaSummaries(prev => ({
          ...prev,
          [planId]: buildQuotaSummary(normalized),
        }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load plan quotas");
        setQuotaRows([]);
      } finally {
        setQuotaLoading(false);
      }
    },
    [buildQuotaSummary]
  );

  useEffect(() => {
    if (selectedPlan?.id != null) {
      loadPlanPermissions(selectedPlan.id);
      loadPlanQuotas(selectedPlan.id);
    } else {
      setSelectedPermissionIds(new Set());
      setQuotaRows([]);
    }
  }, [selectedPlan, loadPlanPermissions, loadPlanQuotas]);

  useEffect(() => {
    if (activeTab === "assignment") {
      loadBusinesses();
    }
  }, [activeTab]);

  const loadBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      const res = await getApprovedBusinessesForAssignment();
      setBusinesses(res?.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load businesses");
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const handleAssignPlan = async (businessId, planId) => {
    if (!planId) return;
    setSavingBusinessPlan(prev => ({ ...prev, [businessId]: true }));
    try {
      await assignPlanToBusiness(businessId, planId);
      toast.success("Plan assigned successfully");
      loadBusinesses(); // refresh list
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to assign plan");
    } finally {
      setSavingBusinessPlan(prev => ({ ...prev, [businessId]: false }));
    }
  };

  // ---- Plan selection + modal handlers ----
  const handlePlanSelectChange = e => {
    const id = e.target.value;
    const found = plans.find(p => String(p.id) === String(id));
    if (found) {
      setSelectedPlan(found);
    } else {
      setSelectedPlan(null);
    }
  };

  const openCreatePlan = () => {
    setIsEditing(false);
    setPlanForm({
      id: null,
      name: "",
      code: "",
      description: "",
      isActive: true,
    });
    setPlanModalOpen(true);
  };

  const openEditPlan = plan => {
    setIsEditing(true);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description ?? "",
      isActive: plan.isActive,
    });
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
  };

  const handlePlanFormChange = (field, value) => {
    setPlanForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePlan = async e => {
    e.preventDefault();
    if (!planForm.name?.trim() || !planForm.code?.trim()) {
      toast.warn("Code and Name are required");
      return;
    }

    setSavingPlan(true);
    try {
      if (isEditing && planForm.id) {
        await updatePlan(planForm.id, {
          name: planForm.name.trim(),
          code: planForm.code.trim(),
          description: planForm.description?.trim() ?? "",
          isActive: planForm.isActive,
        });
        toast.success("Plan updated");
      } else {
        const res = await createPlan({
          name: planForm.name.trim(),
          code: planForm.code.trim(),
          description: planForm.description?.trim() ?? "",
          isActive: planForm.isActive,
        });

        const newId = res?.data?.id ?? res?.id;
        toast.success("Plan created");

        if (newId) {
          const newPlan = {
            id: newId,
            name: planForm.name.trim(),
            code: planForm.code.trim(),
            description: planForm.description?.trim() ?? "",
            isActive: planForm.isActive,
          };
          setSelectedPlan(newPlan);
        }
      }

      await loadPlans();
      setPlanModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async plan => {
    if (
      !window.confirm(
        `Are you sure you want to delete plan "${plan.name}"? This will not delete businesses, only the plan definition.`
      )
    ) {
      return;
    }

    try {
      await deletePlan(plan.id);
      toast.success("Plan deleted");
      await loadPlans();
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(null);
        setSelectedPermissionIds(new Set());
        setQuotaRows([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete plan");
    }
  };

  // ---- Permission mapping handlers ----
  const togglePermissionForPlan = (permissionId, checked) => {
    if (!permissionId) return;
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const toggleGroupPermissions = (features, enable) => {
    const ids = features
      .map(f => f.id ?? f.Id)
      .filter(id => id !== undefined && id !== null);

    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (enable) {
        ids.forEach(id => next.add(id));
      } else {
        ids.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }

    const enabledPermissionIds = Array.from(selectedPermissionIds);

    setSavingPermissions(true);
    try {
      await updatePlanPermissions(selectedPlan.id, {
        enabledPermissionIds,
        replaceAll: true,
      });

      toast.success("Permissions updated for plan");
      await loadPlanPermissions(selectedPlan.id);
    } catch (err) {
      console.error("Failed to update plan permissions", err);
      toast.error("Failed to update plan permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleGroupExpanded = groupName => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const filteredGroups = groupedPermissions.map(group => {
    const name = group.group ?? group.Group ?? "Other";
    const features = group.features ?? group.Features ?? [];
    if (!permissionFilter.trim()) return { name, features };

    const needle = permissionFilter.trim().toLowerCase();
    const filtered = features.filter(p => {
      const label = `${p.name ?? ""} ${p.code ?? ""} ${
        p.description ?? ""
      }`.toLowerCase();
      return label.includes(needle);
    });
    return { name, features: filtered };
  });

  // ---- Quotas handlers ----
  const handleQuotaFieldChange = (index, field, value) => {
    setQuotaRows(prev => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === "quotaKey") {
        row.quotaKey = value.toUpperCase();
      } else if (field === "limit") {
        const parsed = Number(value);
        row.limit = Number.isNaN(parsed) ? 0 : parsed;
      } else if (field === "period") {
        row.period = Number(value);
      } else if (field === "denialMessage") {
        row.denialMessage = value;
      }

      next[index] = row;
      return next;
    });
  };

  const handleAddQuotaRow = () => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }
    setQuotaRows(prev => [
      ...prev,
      {
        id: null,
        planId: selectedPlan.id,
        quotaKey: "",
        limit: 0,
        period: 2,
        denialMessage: "",
      },
    ]);
  };

  // ✅ NEW: remove quota row (for mistakes)
  const handleRemoveQuotaRow = index => {
    setQuotaRows(prev => prev.filter((_, i) => i !== index));
    toast.success("Quota rule removed. Click “Save quotas” to apply changes.");
  };

  const applyQuotaPreset = values => {
    if (!selectedPlan?.id) {
      toast.warn("Select a plan first");
      return;
    }

    setQuotaRows(prev => {
      // Create a map of existing rows for easy lookup
      const next = [...prev];
      
      Object.entries(values).forEach(([key, limit]) => {
        const uKey = key.toUpperCase();
        const existingIdx = next.findIndex(q => (q.quotaKey ?? "").toUpperCase() === uKey);
        
        if (existingIdx >= 0) {
          next[existingIdx] = { ...next[existingIdx], limit };
        } else {
          next.push({
            id: null,
            planId: selectedPlan.id,
            quotaKey: uKey,
            limit: limit,
            period: uKey.includes("MONTH") ? 2 : (uKey.includes("DAY") ? 1 : 0),
            denialMessage: "",
          });
        }
      });
      
      return next;
    });
    
    toast.info("Preset values applied. Review and Save.");
  };

  const handleSaveQuotas = async () => {
    if (selectedPlan?.id == null) {
      toast.warn("Select a plan first");
      return;
    }

    const cleaned = quotaRows
      .filter(q => (q.quotaKey ?? "").trim() !== "")
      .map(q => {
        const dto = {
          planId: selectedPlan.id,
          quotaKey: q.quotaKey.trim().toUpperCase(),
          limit: q.limit,
          period: q.period,
          denialMessage: q.denialMessage?.trim() || null,
        };

        // ✅ Only send id if we actually have one
        if (q.id) {
          dto.id = q.id;
        }

        return dto;
      });

    if (cleaned.length === 0) {
      const confirmed = window.confirm(
        "This will remove all quota rules for this plan. Continue?"
      );
      if (!confirmed) return;
    }

    setSavingQuotas(true);
    try {
      await updatePlanQuotas(selectedPlan.id, cleaned);
      toast.success("Quotas saved for this plan");
      await loadPlanQuotas(selectedPlan.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan quotas");
    } finally {
      setSavingQuotas(false);
    }
  };

  // ---- Render helpers for tabs ----
  const renderPlanSummaryTab = () => {
    const summary = planQuotaSummaries[selectedPlan.id] || {
      messagesPerMonth: null,
      campaignsPerDay: null,
    };

    const totalPermissions = groupedPermissions.reduce(
      (acc, g) => acc + (g.features ?? g.Features ?? []).length,
      0
    );
    const enabledPermissions = selectedPermissionIds.size;
    const permissionPercent = totalPermissions > 0 ? (enabledPermissions / totalPermissions) * 100 : 0;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
        
        {/* Top Row: Identity, Limits Summary, Coverage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Card 1: Plan Identity */}
           <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                    <Shield className="h-5 w-5" />
                 </div>
                 <h4 className="font-semibold text-slate-900 tracking-tight">Plan Identity</h4>
              </div>
              
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Name</span>
                    <span className="text-sm font-medium text-slate-900">{selectedPlan.name}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Code</span>
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                       {selectedPlan.code}
                    </span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Status</span>
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${
                        selectedPlan.isActive 
                           ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                           : "bg-slate-50 text-slate-500 border-slate-100"
                     }`}>
                        {selectedPlan.isActive ? "Active" : "Inactive"}
                     </span>
                 </div>
              </div>
           </div>

           {/* Card 2: Usage Summary */}
           <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                 <h4 className="font-semibold text-slate-900 tracking-tight mb-1">Usage Limits</h4>
                 <p className="text-xs text-slate-500">
                    {quotaRows.length > 0 
                      ? `${quotaRows.length} quota rules configured.` 
                      : "No quotas configured yet."}
                 </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                 <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">{quotaRows.length}</span>
                    <span className="text-xs font-medium text-slate-500">total rules</span>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">
                    Set limits in the <b>Quotas & usage</b> tab.
                 </p>
              </div>
           </div>

           {/* Card 3: Feature Coverage */}
           <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                 <h4 className="font-semibold text-slate-900 tracking-tight mb-1">Feature Coverage</h4>
                 <div className="flex items-baseline gap-2 mt-2">
                     <span className="text-2xl font-bold text-emerald-600">{enabledPermissions}</span>
                     <span className="text-xs font-medium text-slate-500">of {totalPermissions} features</span>
                 </div>
              </div>

              <div className="mt-4 space-y-2">
                 <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${permissionPercent}%` }}
                      className="h-full bg-emerald-500" 
                    />
                 </div>
                 <p className="text-[10px] text-slate-400 text-right">
                    {permissionPercent.toFixed(0)}% coverage
                 </p>
              </div>
           </div>
        </div>

        {/* Quota Breakdown Grid */}
        <div className="flex flex-col gap-4">
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Quota Breakdown For This Plan</h3>
           
           {quotaRows.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                 <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3">
                    <LayoutGrid className="h-5 w-5 text-slate-400" />
                 </div>
                 <p className="text-sm font-medium text-slate-900">No Quotas Defined</p>
                 <p className="text-xs text-slate-500 mt-1">This plan has no specific usage limits.</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {quotaRows.map((quota, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                             <LayoutGrid className="h-4 w-4" />
                          </div>
                          <span className="text-xl font-bold text-slate-900">
                             {formatCompactNumber(quota.limit)}
                          </span>
                       </div>
                       
                       <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate" title={quota.quotaKey}>
                             {quota.quotaKey}
                          </p>
                          <p className="text-xs font-medium text-slate-600 capitalize mt-0.5">
                             {QUOTA_PERIOD_LABELS[quota.period]}
                          </p>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>

      </div>
    );
  };

  const renderFeatureMappingTab = () => {
    const filteredGroups = groupedPermissions
      .map(group => {
        const features =
          (group.features ?? group.Features ?? []).filter(f => {
            const needle = permissionFilter.toLowerCase();
            return (
              f.name?.toLowerCase().includes(needle) ||
              f.code?.toLowerCase().includes(needle)
            );
          }) || [];
        return { ...group, features };
      })
      .filter(g => g.features.length > 0);

    return (
      <div className="flex flex-col gap-6 h-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pt-4">
          {filteredGroups.map((groupData) => {
            const { name, features } = groupData;
            const menuName = groupData.group ?? groupData.Group;
            
            const ids = features
              .map(f => f.id ?? f.Id)
              .filter(id => id !== undefined && id !== null);
            const enabledCount = ids.filter(id =>
              selectedPermissionIds.has(id)
            ).length;
            const allEnabled = enabledCount === ids.length;

            return (
              <div key={name} className="group/section">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <div>
                      {menuName && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-500">
                            {menuName}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-semibold shadow-sm">
                            {enabledCount}/{ids.length} Active
                          </span>
                        </div>
                      )}
                      <h5 className="text-sm font-bold text-slate-900">
                        {name}
                      </h5>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGroupPermissions(features, !allEnabled)}
                    className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    {allEnabled ? "Remove All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {features.map(f => {
                    const isEnabled = selectedPermissionIds.has(f.id ?? f.Id);
                    return (
                      <motion.div 
                        key={f.id ?? f.Id}
                        layout
                        onClick={() => togglePermissionForPlan(f.id ?? f.Id, !isEnabled)}
                        className={`p-4 rounded-lg border transition-all flex items-start gap-4 cursor-pointer select-none group/item ${
                          isEnabled
                            ? "bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-600/20"
                            : "bg-slate-50 border-slate-200 hover:border-emerald-200 hover:bg-white"
                        }`}
                      >
                        <div className={`mt-0.5 h-8 w-8 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          isEnabled
                            ? "bg-emerald-500/30 border-emerald-400/50 text-white"
                            : "bg-white border-slate-300 group-hover/item:border-emerald-300 text-slate-300"
                        }`}>
                          {isEnabled && <Check className="h-4 w-4 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 pt-0.5">
                           <p className={`text-sm font-semibold truncate ${isEnabled ? "text-white" : "text-slate-700"}`}>
                             {f.name}
                           </p>
                           <p className={`text-[10px] mt-0.5 line-clamp-1 font-medium ${isEnabled ? "text-emerald-100/80" : "text-slate-300"}`}>
                             {f.description || "Description not available"}
                           </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuotasTab = () => {
    return (
      <div className="flex flex-col gap-6 h-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="flex-1 overflow-hidden flex flex-col pt-2">
          {quotaLoading ? (
             <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
             </div>
          ) : quotaRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200">
               <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-sm mb-6">
                  <Clock4 className="h-8 w-8 text-slate-200" />
               </div>
               <h4 className="text-sm font-semibold text-slate-900">No defined resource limits</h4>
               <p className="text-xs text-slate-500 mt-2 mb-6">System defaults will apply until a specific plan override is configured.</p>
               <button 
                onClick={handleAddQuotaRow}
                className="px-6 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
              >
                Create First Limit
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
               {/* Table Header Wrapper */}
               <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <Layers className="h-4 w-4" />
                     </div>
                     <div>
                       <h4 className="text-sm font-semibold text-slate-900 leading-none">Limit Configuration Table</h4>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">Define quantity and time window for specific plan features.</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <div className="relative inline-flex rounded-xl shadow-sm">
                        <motion.button
                           whileHover={{ backgroundColor: "#F8FAFC" }}
                           whileTap={{ backgroundColor: "#F1F5F9" }}
                           type="button"
                           onClick={handleAddQuotaRow}
                           disabled={!selectedPlan}
                           className="relative z-10 inline-flex items-center gap-2 rounded-l-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Limit
                        </motion.button>
                        <button
                           type="button"
                           disabled={!selectedPlan}
                           onClick={() => setShowQuotaPresets(!showQuotaPresets)}
                           className="relative z-0 -ml-px inline-flex items-center rounded-r-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-50"
                        >
                           <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showQuotaPresets ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                           {showQuotaPresets && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden"
                              >
                                 <div className="p-1">
                                    <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                       Use Preset
                                    </div>
                                    {QUOTA_PRESETS.map((preset) => (
                                       <button
                                          key={preset.label}
                                          onClick={() => {
                                             applyQuotaPreset(preset.values);
                                             setShowQuotaPresets(false);
                                          }}
                                          className="flex w-full items-center rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                       >
                                          <Sparkles className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                          {preset.label}
                                       </button>
                                    ))}
                                 </div>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>

                     <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                        type="button"
                        onClick={handleSaveQuotas}
                        disabled={savingQuotas || !selectedPlan}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 shadow-md shadow-emerald-50 transition-all disabled:opacity-50"
                     >
                       {savingQuotas ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                       Save
                     </motion.button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                  <table className="w-full border-separate border-spacing-y-2 -mt-2">
                    <thead>
                      <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        <th className="px-4 py-2 text-left w-[30%]">Capability Key</th>
                        <th className="px-4 py-2 text-left w-[20%]">Time Window</th>
                        <th className="px-4 py-2 text-left w-[15%]">Max Units</th>
                        <th className="px-4 py-2 text-left">UX Context</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotaRows.map((row, idx) => {
                        const isNew = !row.id && !row.Id;
                        return (
                          <motion.tr 
                            key={idx}
                            initial={isNew ? { opacity: 0, x: -10 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            className="group"
                          >
                            <td className="px-3 py-1.5 bg-white border-y border-l border-slate-100 rounded-l-xl group-hover:bg-slate-50/50 transition-colors">
                              <select
                                className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2.5 text-xs font-semibold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                value={row.quotaKey}
                                onChange={e => handleQuotaFieldChange(idx, "quotaKey", e.target.value)}
                              >
                                <option value="" disabled>Feature Key</option>
                                {QUOTA_DEFINITIONS.map(def => (
                                  <option key={def.key} value={def.key}>{def.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-1.5 bg-white border-y border-slate-100 group-hover:bg-slate-50/50 transition-colors">
                              <select
                                  className="w-full rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2 text-xs font-semibold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                  value={row.period}
                                  onChange={e => handleQuotaFieldChange(idx, "period", parseInt(e.target.value, 10))}
                                >
                                  {Object.entries(QUOTA_PERIOD_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-3 py-1.5 bg-white border-y border-slate-100 group-hover:bg-slate-50/50 transition-colors">
                              <input
                                type="number"
                                className="w-full rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-600 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                value={row.limit}
                                onChange={e => handleQuotaFieldChange(idx, "limit", parseInt(e.target.value, 10))}
                                placeholder="-1 for ∞"
                              />
                            </td>
                            <td className="px-3 py-1.5 bg-white border-y border-slate-100 group-hover:bg-slate-50/50 transition-colors">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2 text-xs font-medium focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                placeholder="User-facing denial text..."
                                value={row.denialMessage ?? ""}
                                onChange={e => handleQuotaFieldChange(idx, "denialMessage", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-1.5 bg-white border-y border-r border-slate-100 rounded-r-xl group-hover:bg-slate-50/50 transition-colors text-right">
                               <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  type="button"
                                  onClick={() => handleRemoveQuotaRow(idx)}
                                  className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
               
               <div className="px-8 py-4 bg-amber-50/50 border-t border-amber-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                     <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed max-w-2xl">
                    CAUTION: Quotas are enforced in real-time by the Message Engine. Incorrectly low limits can 
                    block production traffic. Use presets for safe starting points.
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBusinessAssignmentTab = () => {
    const filtered = businesses.filter(b => {
      const needle = businessFilter.toLowerCase().trim();
      return (
        b.companyName?.toLowerCase().includes(needle) ||
        b.businessEmail?.toLowerCase().includes(needle)
      );
    });

    return (
      <div className="flex flex-col gap-6 h-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200/60 rounded-lg shadow-sm">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-600 text-left">
                    <th className="px-6 py-3">Organization Profile</th>
                    <th className="px-6 py-3">Current Entitlement</th>
                    <th className="px-6 py-3 text-right">Assignment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingBusinesses ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-3"><Skeleton className="h-4 w-40 mb-2"/><Skeleton className="h-3 w-60"/></td>
                        <td className="px-6 py-3"><Skeleton className="h-7 w-24 rounded-xl"/></td>
                        <td className="px-6 py-3 text-right"><Skeleton className="h-10 w-40 rounded-xl ml-auto"/></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                            <Layers className="h-8 w-8 text-slate-200" />
                          </div>
                          <p className="text-sm font-semibold text-slate-500">No organizations match your query.</p>
                          <p className="text-xs">Try searching for a different company name or administrative email.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b, idx) => (
                      <motion.tr 
                        key={b.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-50/30 transition-colors group"
                      >
                        <td className="px-6 py-3">
                          <div className="flex flex-col min-w-0">
                             <span className="font-semibold text-slate-900 truncate">{b.companyName}</span>
                             <span className="text-[11px] text-slate-400 font-medium truncate">{b.businessEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                           <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
                                {b.planName || "No Plan"}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <div className="relative">
                              <select
                                className="appearance-none rounded-md border border-slate-200/60 bg-white px-5 py-2.5 pr-10 text-xs font-semibold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all cursor-pointer hover:border-emerald-400 shadow-sm"
                                value={b.planId || ""}
                                onChange={(e) => handleAssignPlan(b.id, e.target.value)}
                                disabled={savingBusinessPlan[b.id]}
                              >
                                <option value="" disabled>Change Status...</option>
                                {plans.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                            
                            {savingBusinessPlan[b.id] && (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  // ---- Render ----
  return (
    <div className="relative flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Page header - Unified and Professional */}
      <header className="px-8 py-5 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              Plan Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure subscription tiers, entitlements, and resource quotas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            onClick={() => navigate("/app/admin/permissions")}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Permissions Catalog
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            onClick={openCreatePlan}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Plan Selection */}
        <aside className="w-80 border-r border-slate-200/60 bg-gradient-to-b from-white/40 to-slate-50/40 flex flex-col">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/40">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Available Plans
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                {plans.length}
              </span>
            </div>
            {loadingPlans && <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />}
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 custom-scrollbar">
            {plans.map((p, idx) => {
              const isSelected = selectedPlan?.id === p.id;
              const summary = planQuotaSummaries[p.id];
              const businessCount = businesses.filter(b => b.planId === p.id || b.PlanId === p.id).length;
              
              // Determine tier based on plan name (you can customize this logic)
              const getTierInfo = (planName) => {
                const name = planName.toLowerCase();
                if (name.includes('enterprise') || name.includes('unlimited')) {
                  return { color: 'amber', label: 'Enterprise', dotClass: 'bg-amber-400', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' };
                } else if (name.includes('business') || name.includes('pro') || name.includes('premium')) {
                  return { color: 'purple', label: 'Business', dotClass: 'bg-purple-400', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' };
                } else {
                  return { color: 'blue', label: 'Starter', dotClass: 'bg-blue-400', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' };
                }
              };
              
              const tierInfo = getTierInfo(p.name);
              
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPlan(p)}
                    className={`w-full px-4 py-3.5 rounded-lg border transition-all text-left flex flex-col gap-2 relative overflow-hidden ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white/40 border-slate-200/60 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Accent Line */}
                    {isSelected && (
                      <motion.div 
                        layoutId="sidebarActiveIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between w-full gap-2 pl-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-sm font-semibold truncate ${isSelected ? "text-emerald-700" : "text-slate-800"}`}>
                          {p.name}
                        </span>
                      </div>
                      
                      {isSelected && (
                        <div className="shrink-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    {/* Metadata Pills */}
                    <div className="flex items-center gap-2 flex-wrap pl-2">
                      {/* Quota Summary */}
                      {summary?.messagesPerMonth && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                          <Sparkles className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-700">
                            {formatCompactNumber(summary.messagesPerMonth.limit)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                  
                  {/* Quick Actions - Show on Hover */}
                  <div className={`absolute right-2 top-2 flex items-center gap-1 transition-all ${
                    isSelected ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPlan(p);
                      }}
                      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-colors"
                      title="Edit Plan"
                    >
                      <Edit3 className="h-3 w-3" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(p);
                      }}
                      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-3 w-3" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}

            {!loadingPlans && plans.length === 0 && (
              <div className="py-12 px-4 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No plans configured</p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                  Create your first subscription tier to begin managing entitlements
                </p>
                <button 
                  onClick={openCreatePlan}
                  className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Create Plan
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Detail Content Area */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {!selectedPlan ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                 <Sparkles className="h-8 w-8 text-slate-200" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Ready to manage?</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">
                Select a subscription plan from the sidebar to view its profile, permissions, and system limits.
              </p>
            </div>
          ) : (
            <>
              <div className="px-8 bg-white border-b border-slate-100 flex items-center justify-between pt-6 pb-0">
                <div className="flex items-center gap-8">
                  <TabButton
                    id="plan"
                    label="Plan Details"
                    active={activeTab === "plan"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="features"
                    label="Feature Map"
                    active={activeTab === "features"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="quotas"
                    label="Quota Limit"
                    active={activeTab === "quotas"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="assignment"
                    label="Plan Assignment"
                    active={activeTab === "assignment"}
                    onClick={setActiveTab}
                  />
                </div>

                {activeTab === "features" && (
                  <div className="flex items-center gap-3 mb-1">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter capabilities..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
                        value={permissionFilter}
                        onChange={e => setPermissionFilter(e.target.value)}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || !selectedPlan}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-100 transition-all disabled:opacity-50"
                    >
                      {savingPermissions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Save Map
                    </motion.button>
                  </div>
                )}

                {activeTab === "assignment" && (
                  <div className="flex items-center gap-3 mb-1">
                    <div className="relative w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                       <input
                         type="text"
                         placeholder="Search companies..."
                         className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
                         value={businessFilter}
                         onChange={e => setBusinessFilter(e.target.value)}
                       />
                    </div>
                    <motion.button
                      whileHover={{ rotate: 180 }}
                      onClick={loadBusinesses}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                      title="Refresh list"
                    >
                      <Clock4 className={`h-4 w-4 ${loadingBusinesses ? "animate-spin" : ""}`} />
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Main Content Scroll Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedPlan.id}-${activeTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="h-full min-h-[400px]"
                  >
                    {activeTab === "plan" && renderPlanSummaryTab()}
                    {activeTab === "features" && renderFeatureMappingTab()}
                    {activeTab === "quotas" && renderQuotasTab()}
                    {activeTab === "assignment" && renderBusinessAssignmentTab()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Plan create/edit modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
            onClick={closePlanModal}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/60 overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100/80 bg-gradient-to-b from-slate-50/50 to-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                     {isEditing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                      {isEditing ? "Modify Plan" : "Create New Plan"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure subscription properties
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSavePlan}
              className="px-6 py-5 flex flex-col gap-5"
            >
              {/* Name and Code Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Plus"
                    className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                    value={planForm.name}
                    onChange={e => handlePlanFormChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    System Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E_PLUS_24"
                    className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-widest focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case"
                    value={planForm.code}
                    onChange={e =>
                      handlePlanFormChange("code", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Scope Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize the value proposition..."
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-relaxed focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all resize-none placeholder:text-slate-400"
                  value={planForm.description}
                  onChange={e =>
                    handlePlanFormChange("description", e.target.value)
                  }
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div 
                  className={`w-10 h-6 rounded-full relative transition-all cursor-pointer ${planForm.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                  onClick={() => handlePlanFormChange("isActive", !planForm.isActive)}
                >
                  <motion.div 
                    animate={{ x: planForm.isActive ? 16 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </div>
                <div className="flex-1">
                   <span className="text-xs font-semibold text-slate-900 block">Make plan active</span>
                   <span className="text-[10px] text-slate-500">Available for assignment</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="px-4 py-2 rounded-lg border-2 border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Discard
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {savingPlan ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {isEditing ? "Save Changes" : "Create Plan"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/admin/FeatureAccess/PlanManagement.jsx
