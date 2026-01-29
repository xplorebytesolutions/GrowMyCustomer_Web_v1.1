import React, { useState } from 'react';
import { Container, Grid, Card, CardContent, Typography, TextField, List, ListItem, ListItemText } from '@mui/material';

const ServerTroubleshootingPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const content = `
# XploreByte VPS Incident Runbook (Docker + Coolify + Next.js + .NET + Postgres)

## Goal

When CPU / RAM / traffic spikes happen again, this runbook helps you:

1. **Identify which container is guilty**
2. **Confirm what’s actually wrong** (CPU, memory, logs, disk, attacks, redeploy loops)
3. **Stabilize the VPS quickly**
4. **Apply permanent fixes** (so it doesn’t repeat)

---

## 0) Golden Rules (Read first)

* ✅ Always **identify the culprit container** before stopping anything.
* ✅ Prefer stopping via **Coolify UI** (if it’s a Coolify-managed app).
* ❌ Don’t randomly \`docker rm\` containers unless you know why (Coolify can recreate them anyway).
* ✅ Stabilize first (stop the fire), then diagnose deeper.

---

# A) Quick Triage (2 minutes)

## Step A1 — Check system load (host level)

\`\`\`bash
uptime
\`\`\`

**What it tells you:** system load average.
If load is much higher than your core count (KV4 likely 4 vCPU), the system is overloaded.

---

## Step A2 — See who is eating CPU/RAM (host)

\`\`\`bash
top -o %CPU
\`\`\`

Press:

* \`M\` to sort by memory (RAM)

**What it tells you:** if the problem is Docker, you’ll often see \`dockerd\`, \`containerd\`, or many processes from one container.

---

## Step A3 — Identify the guilty container (most important)

\`\`\`bash
docker stats --no-stream
\`\`\`

**Look for:**

* CPU% very high (e.g., 150% / 300% / 1000%)
* MEM very high (e.g., 8GB+)
* PIDS unusually high (hundreds or thousands)
* NET I/O huge even when you’re not using the app

**Your action depends on what you see.**
(Next sections are “if this → do that”.)

---

# B) Find Root Cause (choose the matching path)

## Case 1 — One container has crazy CPU (like 200%+)

### Step B1.1 — Identify it and inspect

Copy the **NAME** from docker stats, then:

\`\`\`bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -i "<part-of-name>"
\`\`\`

### Step B1.2 — Check logs (usually reveals loop/crash)

\`\`\`bash
docker logs --tail 200 <container_name>
\`\`\`

**Common log clues**

* \`ENOSPC\` → temp or disk space issue (even if df shows free space, /tmp or container FS might be clogged)
* \`ETXTBSY\` → temp file locks / multiple processes fighting in /tmp (common with Next.js)
* endless “starting…” / “restarting…” → deployment loop
* 4xx/5xx spam → bot traffic hammering endpoints

✅ If logs are spamming extremely fast:

\`\`\`bash
docker logs --tail 50 <container_name>
\`\`\`

(avoid hanging your terminal)

---

## Case 2 — Container is eating huge RAM (like 8GB–12GB)

### Step B2.1 — Confirm memory pressure

\`\`\`bash
free -h
\`\`\`

### Step B2.2 — See if host is swapping (bad sign)

\`\`\`bash
swapon --show
\`\`\`

### Step B2.3 — Check container logs for memory leak pattern

\`\`\`bash
docker logs --tail 200 <container_name>
\`\`\`

**Common causes**

* Next.js build/run loop
* too many workers
* memory leak in Node runtime
* runaway background tasks

**Immediate fix (stabilize):** stop the app container from Coolify UI.

---

## Case 3 — CPU is high but docker stats looks fine (no single culprit)

Then the load might be:

* bot traffic hitting Nginx/Traefik
* database getting hammered
* host networking issues

### Step B3.1 — Check inbound connections

\`\`\`bash
ss -tulpn | head -n 50
\`\`\`

### Step B3.2 — Top talking IPs (quick)

\`\`\`bash
sudo apt-get update && sudo apt-get install -y net-tools
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head
\`\`\`

**What it tells you:** which IPs are connecting most.

If you see one IP spamming you:

\`\`\`bash
sudo ufw deny from <ip>
\`\`\`

---

## Case 4 — “ENOSPC: no space left on device” in logs

This does **NOT always mean your disk is full**. It can mean:

* \`/tmp\` full
* Docker logs huge
* container layer full

### Step B4.1 — Check disk + inode

\`\`\`bash
df -h
df -i
\`\`\`

### Step B4.2 — Check Docker disk usage

\`\`\`bash
docker system df
\`\`\`

### Step B4.3 — Find huge docker json logs

\`\`\`bash
sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec ls -lh {} \;
\`\`\`

### Step B4.4 — Truncate huge logs (safe)

\`\`\`bash
sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec truncate -s 0 {} \;
\`\`\`

**What happens:** log files are emptied but containers continue running.

---

# C) Stabilize the VPS (Stop the fire)

## Step C1 — If the guilty container is a Coolify app

✅ Best: stop it from Coolify UI
(so it doesn’t auto-recreate immediately)

If UI is not accessible, emergency stop:

\`\`\`bash
docker stop <container_name>
\`\`\`

⚠️ Note: Coolify might recreate it if the service is still enabled.

---

## Step C2 — If Coolify keeps recreating broken containers

You can temporarily stop Coolify (only if you understand the impact):

\`\`\`bash
docker stop coolify
\`\`\`

**What happens:** deployments stop and Coolify UI may go down, but VPS becomes stable.

---

# D) Permanent Fixes (so it doesn’t repeat)

## Fix D1 — Docker log rotation (prevents log storms forever)

Edit:

\`\`\`bash
nano /etc/docker/daemon.json
\`\`\`

Add / keep:

\`\`\`json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
\`\`\`

Apply:

\`\`\`bash
systemctl restart docker
\`\`\`

**What happens:** new containers have limited logs; old ones need redeploy to fully inherit.

---

## Fix D2 — Disable Coolify Realtime (reduces background load)

From Coolify UI:

* Settings → Realtime → disable it

Or confirm if it exists:

\`\`\`bash
docker ps | grep coolify-realtime
\`\`\`

Stop/remove if not needed:

\`\`\`bash
docker stop coolify-realtime
docker rm coolify-realtime
\`\`\`

---

## Fix D3 — Add resource limits to your apps (non-negotiable)

In Coolify app settings (frontend/backend):

* CPU limit: \`1.0\` (or 1.5)
* Memory limit: \`1024MB\`–\`2048MB\`

**What happens:** even if app goes crazy, it can’t kill the whole VPS.

---

## Fix D4 — Production start only (avoid Next.js dev/watch)

Ensure build/start is:

* \`npm run build\`
* \`npm run start\`

Not:

* \`next dev\`
* watcher mode
* hot reload

**What happens:** eliminates file watching loops and temp thrashing.

---

## Fix D5 — Firewall baseline (you already did correctly)

Check status:

\`\`\`bash
ufw status verbose
\`\`\`

Rules should include:

* 22
* 80
* 443

---

# E) “If this happens again” One-page Checklist

### 1) Identify culprit

\`\`\`bash
docker stats --no-stream
\`\`\`

### 2) Check logs

\`\`\`bash
docker logs --tail 200 <container>
\`\`\`

### 3) Check disk/logs if ENOSPC

\`\`\`bash
df -h
docker system df
sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec ls -lh {} \;
sudo find /var/lib/docker/containers/ -name "*-json.log" -size +200M -exec truncate -s 0 {} \;
\`\`\`

### 4) Stop the fire

* Stop from Coolify UI (preferred)
* Emergency:

\`\`\`bash
docker stop <container>
\`\`\`

### 5) Apply permanent fix

* log rotation (daemon.json)
* resource limits (Coolify)
* disable realtime
* ensure production start

---

# F) Notes specific to your earlier incident (what to watch)

If you ever see:

* \`ETXTBSY: text file is busy\`
* \`ENOSPC\`
* random heavy processes inside Next container
  That usually means **Next.js runtime/temp/log loop**.

Your best action is:

1. Stop the frontend service (Coolify UI)
2. Fix deployment settings (resource limits + proper start command)
3. Redeploy clean
`;

  const filteredContent = content.split('\n').filter(line =>
    line.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Server Troubleshooting Guide
      </Typography>
      <TextField
        label="Search"
        variant="outlined"
        fullWidth
        margin="normal"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {searchTerm ? (
                <List>
                  {filteredContent.map((line, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={line} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography component="div" style={{ whiteSpace: 'pre-line' }}>
                  {content}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ServerTroubleshootingPage;