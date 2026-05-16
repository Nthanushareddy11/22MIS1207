import { NextRequest, NextResponse } from "next/server";

const AUTH_URL = "http://4.224.186.213/evaluation-service/auth";
const NOTIF_URL = "http://4.224.186.213/evaluation-service/notifications";

const creds = {
  email: "thanusha.n2022@vitstudent.ac.in",
  name: "n thanusha",
  rollNo: "22mis1207",
  accessCode: "SfFuWg",
  clientID: "8eee4f15-1deb-48d1-b3ae-8aae79c69669",
  clientSecret: "fAkesVXMnnDuyEeK",
};

async function getToken() {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  const { searchParams } = new URL(req.url);

  let url = NOTIF_URL;
  const params = new URLSearchParams();
  const page = searchParams.get("page");
  const type = searchParams.get("notification_type");
  if (page) params.set("page", page);
  if (type) params.set("notification_type", type);
  if (params.toString()) url += "?" + params.toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
