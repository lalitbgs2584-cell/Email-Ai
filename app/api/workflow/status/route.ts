import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId");

    if (workflowId) {
      const workflow = await prisma.workflows.findFirst({
        where: { id: workflowId, userId: user.id },
      });
      return NextResponse.json({ workflow });
    }

    // Get latest active/recent workflow for the user
    const latestWorkflow = await prisma.workflows.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workflow: latestWorkflow });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch workflow status" },
      { status: 500 }
    );
  }
}
