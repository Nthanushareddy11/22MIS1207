import { NextResponse } from "next/server";

const AUTH_URL = "http://4.224.186.213/evaluation-service/auth";

const creds = {
  email: "thanusha.n2022@vitstudent.ac.in",
  name: "n thanusha",
  rollNo: "22mis1207",
  accessCode: "SfFuWg",
  clientID: "8eee4f15-1deb-48d1-b3ae-8aae79c69669",
  clientSecret: "fAkesVXMnnDuyEeK",
};

export async function GET() {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
