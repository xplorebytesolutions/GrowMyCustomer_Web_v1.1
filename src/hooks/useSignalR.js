// 📄 src/hooks/useSignalR.js
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";
import { TOKEN_KEY } from "../api/axiosClient"; // single source of truth

const REALTIME_TOAST_ID = "signalr-realtime-failed";

function getHubUrl() {
  const raw =
    (process.env.REACT_APP_API_BASE_URL &&
      process.env.REACT_APP_API_BASE_URL.trim()) ||
    "http://localhost:7113/api";

  const base = raw.replace(/\/+$/, "");
  return `${base}/hubs/inbox`; // => .../api/hubs/inbox
}

function isIgnorableSignalRError(err) {
  const name = String(err?.name || "");
  const msg = String(err?.message || err || "").toLowerCase();

  return (
    name === "AbortError" ||
    msg.includes("stopped during negotiation") ||
    msg.includes("abort") ||
    msg.includes("canceled") ||
    msg.includes("cancelled")
  );
}

export default function useSignalR({
  onMessageReceived,
  onUnreadChanged,
} = {}) {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connRef = useRef(null);
  const mountedRef = useRef(false);
  const startingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const hubUrl = getHubUrl();
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      console.warn("SignalR skipped: No auth token found.");
      setIsConnected(false);
      return () => {
        mountedRef.current = false;
      };
    }

    // ✅ Build connection
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem(TOKEN_KEY) || "",
        // Prefer WS; fallback allowed
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
        // ✅ IMPORTANT: DO NOT force skipNegotiation here (can cause real failures)
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connRef.current = conn;
    setConnection(conn);

    // ✅ Subscribe before start
    if (onMessageReceived) conn.on("ReceiveInboxMessage", onMessageReceived);
    if (onUnreadChanged) conn.on("UnreadCountChanged", onUnreadChanged);

    conn.onreconnecting(() => {
      if (!mountedRef.current) return;
      setIsConnected(false);
    });

    conn.onreconnected(() => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      toast.dismiss(REALTIME_TOAST_ID);
    });

    conn.onclose(err => {
      if (!mountedRef.current) return;
      setIsConnected(false);

      // Ignore dev-mode abort noise
      if (isIgnorableSignalRError(err)) return;

      // ✅ Only ONE toast ever
      toast.error("Real-time connection failed.", {
        toastId: REALTIME_TOAST_ID,
      });
    });

    const start = async () => {
      if (startingRef.current) return;
      startingRef.current = true;

      try {
        await conn.start();
        if (!mountedRef.current) return;

        setIsConnected(true);
        toast.dismiss(REALTIME_TOAST_ID);
        console.log("✅ SignalR connected:", hubUrl);
      } catch (err) {
        if (!mountedRef.current) return;

        // Ignore dev-mode abort noise
        if (isIgnorableSignalRError(err)) return;

        setIsConnected(false);

        const msg = String(err?.message || err || "").toLowerCase();
        if (msg.includes("401") || msg.includes("unauthorized")) {
          toast.error("SignalR unauthorized. Your session may have expired.", {
            toastId: REALTIME_TOAST_ID,
          });
        } else {
          toast.error("Real-time connection failed.", {
            toastId: REALTIME_TOAST_ID,
          });
        }

        console.error("❌ SignalR start failed:", err);
      } finally {
        startingRef.current = false;
      }
    };

    start();

    return () => {
      mountedRef.current = false;

      try {
        if (onMessageReceived)
          conn.off("ReceiveInboxMessage", onMessageReceived);
        if (onUnreadChanged) conn.off("UnreadCountChanged", onUnreadChanged);
      } catch {
        // ignore
      }

      if (conn && conn.state !== signalR.HubConnectionState.Disconnected) {
        conn.stop().catch(() => {});
      }
    };
  }, [onMessageReceived, onUnreadChanged]);

  return { connection, isConnected };
}
