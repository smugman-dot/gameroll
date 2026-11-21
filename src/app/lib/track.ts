import { ensureSession } from "./supabase/client";

export type EventType = "view" | "like" | "pass" | "undo" | "played";
export type TrackEvent = {
  type: EventType;
  gameId: number;
  t: number;
  dwellMs?: number;
  /** 1-5 stars, only for type "played" */
  rating?: number;
};

const ID_KEY = "GAME_USER_ID";

function userId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

let queue: TrackEvent[] = [];
let timer: number | undefined;

async function flush() {
  window.clearTimeout(timer);
  if (!queue.length) return;
  await ensureSession();
  const body = JSON.stringify({ events: queue });
  queue = [];
  const ok = navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }));
  if (!ok) {
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => { });
  }
}
export async function flushNow() {
  window.clearTimeout(timer);
  if (!queue.length) return;
  await ensureSession();
  const body = JSON.stringify({ events: queue });
  queue = [];
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch { }
}
export function track(e: Omit<TrackEvent, "t">) {
  queue.push({ ...e, t: Date.now() });
  if (queue.length >= 10) return flush();
  window.clearTimeout(timer);
  timer = window.setTimeout(flush, 2000);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
