// src/app/api/ai-analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("KEY exists:", !!process.env.MISTRAL_API_KEY);
  console.log("KEY value:", process.env.MISTRAL_API_KEY?.slice(0, 8));
  console.log("BODY received:", JSON.stringify(body, null, 2));

  const messages = [
    { role: "system", content: body.system },
    ...body.messages,
  ];

  const payload = {
    model: body.model ?? "mistral-small-latest",
    max_tokens: body.max_tokens ?? 1000,
    messages,
  };

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Mistral response:", JSON.stringify(data, null, 2));

  return NextResponse.json(data, { status: res.status });
}