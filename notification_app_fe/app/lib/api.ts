const LOG_URL = "http://4.224.186.213/evaluation-service/logs";

// logging middleware - posts to eval server instead of console.log
export async function log(level: string, pkg: string, message: string) {
  try {
    await fetch(LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stack: "frontend", level, package: pkg, message }),
    });
  } catch (e) {
    // silently fail
  }
}

export interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
}

export async function fetchNotifications(
  page?: number,
  type?: string
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (type) params.set("notification_type", type);

  let url = "/api/notifications";
  if (params.toString()) url += "?" + params.toString();

  const res = await fetch(url);

  if (!res.ok) {
    await log("error", "api", `failed to fetch notifications: ${res.status}`);
    throw new Error("failed to fetch");
  }

  const data = await res.json();
  await log("info", "api", `fetched ${data.notifications.length} notifications`);
  return data.notifications;
}
