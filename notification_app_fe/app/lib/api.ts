const AUTH_URL = "http://4.224.186.213/evaluation-service/auth";
const NOTIF_URL = "http://4.224.186.213/evaluation-service/notifications";
const LOG_URL = "http://4.224.186.213/evaluation-service/logs";

const creds = {
  email: "thanusha.n2022@vitstudent.ac.in",
  name: "n thanusha",
  rollNo: "22mis1207",
  accessCode: "SfFuWg",
  clientID: "8eee4f15-1deb-48d1-b3ae-8aae79c69669",
  clientSecret: "fAkesVXMnnDuyEeK",
};

let token: string | null = null;
let tokenExpiry: number = 0;

// logging middleware - use this instead of console.log
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

export async function getToken() {
  if (token && Date.now() / 1000 < tokenExpiry - 60) {
    return token;
  }
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  const data = await res.json();
  token = data.access_token;
  tokenExpiry = data.expires_in;
  await log("info", "auth", "token refreshed for frontend");
  return token;
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
  const t = await getToken();
  let url = NOTIF_URL;
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (type) params.set("notification_type", type);
  if (params.toString()) url += "?" + params.toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${t}` },
  });

  if (!res.ok) {
    await log("error", "api", `failed to fetch notifications: ${res.status}`);
    throw new Error("failed to fetch");
  }

  const data = await res.json();
  await log("info", "api", `fetched ${data.notifications.length} notifications`);
  return data.notifications;
}
