import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized, hasRole, forbiddenResponse } from "@/lib/auth-utils";
import { sendCorporateChatAlert } from "@/lib/webhook";

/**
 * PATCH /api/audits/[id]/close
 * Closes an audit cycle and fires a webhook if there are missing assets.
 * Role: ADMIN, ASSET_MANAGER
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN", "ASSET_MANAGER"])) {
    return forbiddenResponse(["ADMIN", "ASSET_MANAGER"]);
  }

  try {
    const { id } = await context.params;
    
    const audit = await db.auditCycle.findUnique({
      where: { id },
      include: {
        auditItems: {
          include: {
            asset: { select: { assetTag: true, name: true } }
          }
        }
      }
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit cycle not found" }, { status: 404 });
    }

    if (audit.status === "CLOSED") {
      return NextResponse.json({ error: "Audit cycle is already closed" }, { status: 400 });
    }

    // Close the audit
    const updatedAudit = await db.auditCycle.update({
      where: { id },
      data: {
        status: "CLOSED",
        completedAt: new Date(),
      }
    });

    // Check for missing assets
    const missingItems = audit.auditItems.filter(item => item.status === "MISSING");

    if (missingItems.length > 0) {
      // Create summary of missing assets for the webhook
      const missingDetails: Record<string, string> = {
        "Audit Cycle": audit.cycleNumber,
        "Total Missing": String(missingItems.length),
        "Closed By": session!.user.name,
      };

      // Add up to 5 specific missing assets to the details
      missingItems.slice(0, 5).forEach((item, idx) => {
        missingDetails[`Missing Asset ${idx + 1}`] = `${item.asset.assetTag} - ${item.asset.name}`;
      });

      if (missingItems.length > 5) {
        missingDetails["..."] = `And ${missingItems.length - 5} more assets`;
      }

      // Fire the webhook
      await sendCorporateChatAlert({
        title: "🚨 AUDIT ALERT: Missing Assets Detected",
        message: `Audit Cycle **${audit.cycleNumber}** has been closed with **${missingItems.length}** missing asset(s). Immediate investigation required.`,
        priority: "CRITICAL",
        details: missingDetails
      });
    }

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "AUDIT_CLOSED",
        resourceType: "AuditCycle",
        resourceId: audit.id,
        details: JSON.stringify({
          cycleNumber: audit.cycleNumber,
          missingAssets: missingItems.length
        }),
      },
    });

    return NextResponse.json(updatedAudit);
  } catch (err) {
    console.error("Audit close error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
