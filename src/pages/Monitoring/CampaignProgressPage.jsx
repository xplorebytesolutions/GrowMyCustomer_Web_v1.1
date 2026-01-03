import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient";
import {
  Loader2,
  RefreshCcw,
  Play,
  Pause,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Target,
  PhoneOutgoing,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

// ---- helpers ----
const nf = new Intl.NumberFormat();
const pf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function fmtMs(v) {
  if (v == null) return "–";
  if (v < 1000) return `${Math.round(v)} ms`;
  const s = v / 1000;
  if (s < 60) return `${pf.format(s)} s`;
  return `${pf.format(s / 60)} min`;
}

function tsLabel(iso) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, accent = "" }) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 ${accent}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-sm opacity-70">{title}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {subtitle && <div className="mt-1 text-xs opacity-60">{subtitle}</div>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 px-4 py-3 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default function CampaignProgressPage({
  campaignId: campaignIdProp = "",
  refreshMs = 4000,
}) {
  const { campaignId: campaignIdParam } = useParams();
  const initialId = campaignIdParam || campaignIdProp;

  const [campaignId, setCampaignId] = useState(initialId);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [since, setSince] = useState(null);

  const ctlRef = useRef(null);
  const canQuery = Boolean(campaignId);

  async function fetchOnce() {
    if (!canQuery) return;
    setLoading(true);
    setErr("");
    // cancel in-flight
    ctlRef.current?.abort();
    const ctl = new AbortController();
    ctlRef.current = ctl;
    try {
      // axiosClient already knows baseURL + auth; path-only like your reports pages
      const res = await axiosClient.get(`/campaigns/${campaignId}/progress`, {
        signal: ctl.signal,
      });
      const j = res.data;
      setData(j);
      setSince(s => s ?? new Date());
      setHistory(h => {
        const item = {
          t: new Date(j.retrievedAtUtc),
          pending: j.pending,
          inFlight: j.inFlight,
          sent: j.sent,
          failed: j.failed,
          dead: j.dead,
          completionPct: j.completionPct,
        };
        const next = [...h, item];
        return next.slice(Math.max(0, next.length - 50)); // last 50
      });
    } catch (e) {
      if (e?.name === "CanceledError" || e?.name === "AbortError") return;
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load progress";
      setErr(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  // if route param changes later, sync it into state
  useEffect(() => {
    if (campaignIdParam && campaignIdParam !== campaignId)
      setCampaignId(campaignIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignIdParam]);

  useEffect(() => {
    if (!auto) return;
    fetchOnce();
    const id = setInterval(fetchOnce, refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, refreshMs, campaignId]);

  const completion = data?.completionPct ?? 0;
  const progressSubtitle = useMemo(() => {
    if (!data) return "";
    return `${nf.format(data.sent)} sent • ${nf.format(
      data.failed
    )} failed • ${nf.format(data.dead)} dead`;
  }, [data]);
  const lastUpdated = tsLabel(data?.retrievedAtUtc);

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6" /> Campaign Progress
          </h1>
          <p className="text-sm opacity-70 mt-1">
            Live view of queue and delivery metrics for a single campaign.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1">Campaign ID</label>
              <input
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={fetchOnce}
              disabled={!canQuery || loading}
              title="Refresh now"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}{" "}
              Refresh
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border ${
                auto
                  ? "border-emerald-500/60 bg-emerald-500 text-white"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
              onClick={() => setAuto(a => !a)}
              disabled={!canQuery}
              title={auto ? "Pause auto-refresh" : "Start auto-refresh"}
            >
              {auto ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}{" "}
              {auto ? "Pause" : "Auto"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-4">
          <ErrorBanner message={err} />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard
          title="Total"
          value={nf.format(data?.totalJobs ?? 0)}
          icon={Target}
        />
        <StatCard
          title="Completed"
          value={nf.format(data?.completed ?? 0)}
          subtitle={`${pf.format(completion)}%`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Pending"
          value={nf.format(data?.pending ?? 0)}
          icon={Clock}
        />
        <StatCard
          title="In Flight"
          value={nf.format(data?.inFlight ?? 0)}
          icon={PhoneOutgoing}
        />
        <StatCard
          title="Sent"
          value={nf.format(data?.sent ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Failed"
          value={nf.format(data?.failed ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          title="Dead"
          value={nf.format(data?.dead ?? 0)}
          icon={Gauge}
        />
        <StatCard title="Last Updated" value={lastUpdated} icon={Activity} />
      </div>

      {/* Progress */}
      <div className="rounded-2xl p-5 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <TrendingUp className="w-4 h-4" /> Completion
          </div>
          <div className="text-sm font-medium">{pf.format(completion)}%</div>
        </div>
        <ProgressBar value={completion} />
        <div className="mt-3 text-xs opacity-70">
          {data
            ? `${nf.format(data.sent)} sent • ${nf.format(
                data.failed
              )} failed • ${nf.format(data.dead)} dead`
            : ""}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <TrendingUp className="w-4 h-4" /> Completion over time
            </div>
            <div className="text-xs opacity-60">
              since {since ? since.toLocaleTimeString() : "–"}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="t"
                  tickFormatter={t => new Date(t).toLocaleTimeString()}
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  width={40}
                />
                <Tooltip
                  labelFormatter={l => new Date(l).toLocaleTimeString()}
                  formatter={v => [`${pf.format(v)}%`, "completion"]}
                />
                <Area
                  type="monotone"
                  dataKey="completionPct"
                  stroke="currentColor"
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Clock className="w-4 h-4" /> Queue state over time
            </div>
            <div className="text-xs opacity-60">pending & in-flight</div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={history}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="t"
                  tickFormatter={t => new Date(t).toLocaleTimeString()}
                  minTickGap={24}
                />
                <YAxis width={48} />
                <Tooltip
                  labelFormatter={l => new Date(l).toLocaleTimeString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="currentColor"
                  dot={false}
                  name="Pending"
                />
                <Line
                  type="monotone"
                  dataKey="inFlight"
                  stroke="currentColor"
                  dot={false}
                  name="InFlight"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency chips */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60">
          <div className="text-xs opacity-70">p50 latency (last hour)</div>
          <div className="text-lg font-semibold">
            {fmtMs(data?.p50ms ?? null)}
          </div>
        </div>
        <div className="rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60">
          <div className="text-xs opacity-70">p95 latency (last hour)</div>
          <div className="text-lg font-semibold">
            {fmtMs(data?.p95ms ?? null)}
          </div>
        </div>
        <div className="rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60">
          <div className="text-xs opacity-70">p99 latency (last hour)</div>
          <div className="text-lg font-semibold">
            {fmtMs(data?.p99ms ?? null)}
          </div>
        </div>
      </div>

      {!data && (
        <div className="mt-10 text-center text-sm opacity-60">
          Enter a campaign ID above, then enable auto-refresh.
        </div>
      )}
      </div>
    </div>
  );
}
