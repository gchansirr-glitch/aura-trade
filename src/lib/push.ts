import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BNrLg8Vaq6XiYXHK3rs9DmjFkQ6XCVD9Szp7S1LLxIhGwJcXl8Xv-CxJ3-L9n0EDdYu2RbKqKMiOJd-eWiIm9os";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

export async function subscribePush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: false, error: "Push not supported on this device/browser" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { success: false, error: "Permission denied" };

  const reg = await registerServiceWorker();
  if (!reg) return { success: false, error: "Service worker failed" };

  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const json = sub.toJSON();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh")),
        auth: json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth")),
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function unsubscribePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function getPushStatus(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
