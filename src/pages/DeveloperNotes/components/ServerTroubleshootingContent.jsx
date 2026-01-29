import React, { useMemo, useState } from "react";
import { Copy, Check, AlertTriangle, Shield, Zap, Wrench } from "lucide-react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function CodeBlock({ title, code, note }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback (older browsers)
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onCopy}
            className={cx(
              "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-semibold border shadow-sm transition-colors",
              copied
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
            title="Copy command"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      <div className="px-5 py-4">
        <pre className="whitespace-pre-wrap break-words rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs leading-relaxed overflow-auto">
          {code}
        </pre>
        {note ? (
          <div className="mt-3 text-xs text-slate-600">{note}</div>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl bg-slate-900 text-white p-2 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const styles =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : tone === "ok"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : tone === "danger"
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

export default function ServerTroubleshootingContent() {
  // Everything is “static content” but wrapped so it’s easy to evolve later.
  const content = useMemo(
    () => ({
      title: "XploreByte VPS Incident Runbook (Docker + Coolify)",
      intro:
        "Use this when CPU/RAM/traffic spikes happen. Goal: identify the guilty container, stabilize fast, and apply fixes so it doesn’t repeat.",
    }),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {content.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{content.intro}</p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Shield className="h-4 w-4" />
              Future-You Friendly
            </span>
          </div>
        </div>
      </div>

      {/* Golden Rules */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <SectionHeader
          icon={Shield}
          title="0) Golden Rules (Read first)"
          subtitle="These prevent making a bad situation worse."
        />
        <div className="grid grid-cols-1 gap-3">
          <Pill tone="ok">
            ✅ Always identify the guilty container before stopping anything.
          </Pill>
          <Pill tone="neutral">
            🧠 Prefer stopping via Coolify UI if it’s a Coolify-managed app (it
            may auto-recreate).
          </Pill>
          <Pill tone="warn">
            ⚠️ Don’t randomly restart Docker unless you understand impact — it
            will restart containers and can cause downtime.
          </Pill>
          <Pill tone="danger">
            🧨 If disk is full (or inode-exhausted), everything gets weird. Fix
            storage/logs first.
          </Pill>
        </div>
      </div>

      {/* Quick Triage */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <SectionHeader
          icon={Zap}
          title="A) Quick Triage (2 minutes)"
          subtitle="Find out what’s burning: CPU, RAM, disk, logs, or traffic."
        />

        <CodeBlock
          title="Step A1 — Check system load (host level)"
          code={`uptime`}
          note="If load average is much higher than your CPU cores, the VPS is overloaded."
        />

        <CodeBlock
          title="Step A2 — See who is eating CPU/RAM (host)"
          code={`top -o %CPU`}
          note="Press: Shift+M to sort by RAM. If you see dockerd/containerd dominating, it’s probably a container issue."
        />

        <CodeBlock
          title="Step A3 — Identify the guilty container (most important)"
          code={`docker stats --no-stream`}
          note="Look for: CPU very high, MEM huge, PIDS very high, NET I/O spikes, Block I/O huge."
        />
      </div>

      {/* Find Root Cause */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <SectionHeader
          icon={AlertTriangle}
          title="B) Find Root Cause (choose matching path)"
          subtitle="Pick the scenario that matches what you saw in docker stats."
        />

        {/* Case 1 */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-slate-900">
            Case 1 — One container has crazy CPU (like 200%+)
          </div>

          <CodeBlock
            title="Step B1.1 — Identify the container image + ports quickly"
            code={`docker ps --format "table {{.Names}}\\t{{.Image}}\\t{{.Ports}}"`}
            note="Find the row for the container name you saw in docker stats."
          />

          <CodeBlock
            title="Step B1.2 — Check logs (usually reveals loop/crash)"
            code={`docker logs --tail 200 <container_name>`}
            note="Common patterns: infinite retries, exception spam, restart loops, router conflicts, or DB connection loops."
          />

          <Pill tone="neutral">
            🔎 Tip: If logs are spamming too fast, tail smaller first:
            <div className="mt-2 font-mono text-xs bg-slate-950 text-slate-100 rounded-2xl p-3">
              docker logs --tail 50 &lt;container_name&gt;
            </div>
          </Pill>
        </div>

        {/* Case 2 */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="text-sm font-bold text-slate-900">
            Case 2 — Container is eating huge RAM (8GB–12GB)
          </div>

          <CodeBlock
            title="Step B2.1 — Confirm memory pressure"
            code={`free -h`}
            note="If available memory is tiny and used is huge, you’re under memory pressure."
          />

          <CodeBlock
            title="Step B2.2 — Check if the host is swapping (bad sign)"
            code={`swapon --show`}
            note="If swap is actively used, performance can collapse."
          />

          <CodeBlock
            title="Step B2.3 — Check container logs for memory leak pattern"
            code={`docker logs --tail 200 <container_name>`}
            note="Common causes: Next.js dev mode/watchers, unbounded caching, memory leak, runaway background loop."
          />
        </div>

        {/* Case 3 */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="text-sm font-bold text-slate-900">
            Case 3 — CPU is high but docker stats looks “normal”
          </div>

          <CodeBlock
            title="Step B3.1 — Check inbound connections"
            code={`sudo ss -tunap | head -n 60`}
            note="Shows active sockets and which process owns the port (helpful to detect hammering/bots)."
          />

          <CodeBlock
            title="Step B3.2 — Top ports by connection count"
            code={`sudo ss -tan | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -nr | head`}
            note="Tells which local ports are getting hit most (80/443/8080/5432 etc)."
          />

          <CodeBlock
            title="Step B3.3 — Top remote IPs (who is connecting most)"
            code={`sudo ss -tan | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head`}
            note="If one IP is spamming, you can block it (firewall) or rate-limit at reverse proxy."
          />
        </div>

        {/* Case 4 */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="text-sm font-bold text-slate-900">
            Case 4 — “ENOSPC” / No space left on device (in logs)
          </div>

          <Pill tone="warn">
            ENOSPC can mean: disk is full OR inodes are exhausted OR Docker logs
            grew insanely.
          </Pill>

          <CodeBlock
            title="Step B4.1 — Check disk & inode usage"
            code={`df -h\n\ndf -i`}
            note="df -h: disk usage. df -i: inode usage (tons of tiny files can exhaust inodes even with free GBs)."
          />

          <CodeBlock
            title="Step B4.2 — Docker disk usage"
            code={`docker system df`}
            note="Shows how much space images/volumes/build cache are consuming."
          />

          <CodeBlock
            title="Step B4.3 — Find huge docker json logs (over 200MB)"
            code={`sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec ls -lh {} \\;`}
            note="Finds big log files that can silently eat disk."
          />

          <CodeBlock
            title="Step B4.4 — Truncate huge logs safely (keeps containers running)"
            code={`sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec truncate -s 0 {} \\;`}
            note="This empties log files in-place. Containers keep running, but old logs are gone."
          />
        </div>
      </div>

      {/* Stabilize */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <SectionHeader
          icon={Zap}
          title="C) Stabilize the VPS (Stop the fire)"
          subtitle="Once you know the culprit, stabilize first. Then fix permanently."
        />

        <Pill tone="neutral">
          Preferred: **Stop the app in Coolify UI** (so it doesn’t auto-recreate
          immediately).
          <br />
          If UI isn’t accessible, do an emergency stop via Docker.
        </Pill>

        <CodeBlock
          title="Emergency stop (Docker)"
          code={`docker stop <container_name>`}
          note="Stops only the target container. Safer than restarting Docker."
        />

        <CodeBlock
          title="If Coolify keeps recreating broken containers (last resort)"
          code={`docker stop coolify`}
          note="This will stop Coolify itself, so use only when you must stabilize urgently."
        />
      </div>

      {/* Permanent fixes */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <SectionHeader
          icon={Wrench}
          title="D) Permanent Fixes (so it doesn’t repeat)"
          subtitle="Do these after stabilization."
        />

        <CodeBlock
          title="Fix D1 — Docker log rotation (prevents log storms forever)"
          code={`sudo nano /etc/docker/daemon.json`}
          note="Ensure you have log rotation settings, then restart Docker."
        />

        <CodeBlock
          title="Example daemon.json (safe baseline)"
          code={`{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}`}
          note="This caps log growth per container. Old logs rotate automatically."
        />

        <CodeBlock
          title="Apply log config"
          code={`sudo systemctl restart docker\n\ndocker info | grep -i "Logging Driver"`}
          note="Restarting Docker can restart containers. Plan for a maintenance window if needed."
        />

        <Pill tone="neutral">
          Also recommended in Coolify:
          <ul className="list-disc pl-5 mt-2 text-sm">
            <li>Set CPU/RAM limits per app</li>
            <li>Ensure Next.js runs in production (not dev/watch)</li>
            <li>
              Disable anything you don’t need (extra realtime/monitor services)
            </li>
          </ul>
        </Pill>
      </div>

      {/* One-page checklist */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <SectionHeader
          icon={Shield}
          title="E) “If this happens again” — One-page checklist"
          subtitle="A short repeatable flow you can run fast."
        />

        <CodeBlock
          title="1) Identify culprit"
          code={`docker stats --no-stream`}
          note="Find the container with abnormal CPU/MEM/PIDS/NET."
        />

        <CodeBlock
          title="2) Check logs"
          code={`docker logs --tail 200 <container_name>`}
          note="Look for loops: ENOSPC, restart loops, router conflict, DB retry storms."
        />

        <CodeBlock
          title="3) Check disk/inodes (if ENOSPC or weirdness)"
          code={`df -h\n\ndf -i\n\ndocker system df`}
          note="If logs are huge, truncate safely."
        />

        <CodeBlock
          title="4) Stop the fire"
          code={`docker stop <container_name>`}
          note="Preferred is to stop via Coolify UI (if it’s a Coolify-managed app)."
        />

        <CodeBlock
          title="5) Apply prevention"
          code={`sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec truncate -s 0 {} \\;\n\nsudo nano /etc/docker/daemon.json\n\nsudo systemctl restart docker`}
          note="Rotation prevents future log explosions. Restart Docker only when you understand impact."
        />
      </div>
    </div>
  );
}
