/**
 * AssetFlow Corporate Chat Webhook Integration
 * Sends alerts to Slack/Teams for critical events (e.g. CRITICAL maintenance, missing assets in audits)
 */

export interface WebhookPayload {
  title: string;
  message: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: Record<string, any>;
}

export async function sendCorporateChatAlert(payload: WebhookPayload) {
  const webhookUrl = process.env.WEBHOOK_URL;
  
  // Format message for Slack/Teams (common JSON structure)
  const color = payload.priority === "CRITICAL" ? "#FF0000" : 
                payload.priority === "HIGH" ? "#FF9900" : "#36A64F";
                
  const formattedMessage = {
    text: `*${payload.title}*`,
    attachments: [
      {
        color: color,
        text: payload.message,
        fields: Object.entries(payload.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        }))
      }
    ]
  };

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedMessage),
      });
      console.log(`[Webhook] Sent alert to corporate chat: ${payload.title}`);
    } catch (err) {
      console.error("[Webhook] Failed to send chat alert:", err);
    }
  } else {
    // Elegant console log fallback for hackathon live demo when no URL is provided
    console.log("\n=======================================================");
    console.log(`🔔 [MOCK WEBHOOK ALERT: CORPORATE CHAT]`);
    console.log(`Title:    ${payload.title}`);
    console.log(`Priority: ${payload.priority}`);
    console.log(`Message:  ${payload.message}`);
    console.log(`Details:  ${JSON.stringify(payload.details, null, 2)}`);
    console.log("=======================================================\n");
  }
}
