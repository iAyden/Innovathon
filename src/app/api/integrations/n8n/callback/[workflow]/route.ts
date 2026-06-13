import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function matchesSecret(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflow: string }> },
) {
  try {
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;
    const receivedSecret = request.headers.get("x-pulso-callback-secret") ?? "";
    if (
      !expectedSecret ||
      !receivedSecret ||
      !matchesSecret(receivedSecret, expectedSecret)
    ) {
      throw new HttpError("Callback no autorizado.", 401);
    }

    const { workflow } = await context.params;
    const body = await request.json().catch(() => ({}));
    const correlationId = String(body.correlationId ?? "");
    if (!correlationId) {
      throw new HttpError("Falta correlationId.", 400);
    }

    await getSupabaseAdmin()!
      .from("integration_events")
      .update({
        workflow,
        direction: "callback",
        status: body.status === "failed" ? "failed" : "completed",
        external_execution_id: body.executionId ?? null,
        response_payload: body,
        error_message: body.error ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("correlation_id", correlationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
