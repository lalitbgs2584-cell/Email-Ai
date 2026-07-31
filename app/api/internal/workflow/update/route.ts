import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    const expectedSecret = process.env.INTERNAL_API_SECRET || "emailai_internal_secret_key_2026";

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized internal call" }, { status: 401 });
    }

    const body = await req.json();
    const { workflowId, status, progress, error } = body;

    if (!workflowId) {
      return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
    }

    const workflow = await prisma.workflows.update({
      where: { id: workflowId },
      data: {
        ...(status && { status }),
        ...(typeof progress === "number" && { progress }),
        ...(error !== undefined && { error }),
      },
    });

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    console.error("Internal Workflow Update Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update workflow" },
      { status: 500 }
    );
  }
}
