export interface WhatsAppNotificationParams {
  apiKey: string;
  phoneNumberId: string;
  to: string;
  template: "your_turn" | "approaching" | "skipped";
  params: {
    businessName: string;
    displayNumber: string;
  };
}

export async function sendWhatsAppNotification(
  notification: WhatsAppNotificationParams
): Promise<void> {
  const { apiKey, phoneNumberId, to, template, params } = notification;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: params.businessName },
                  { type: "text", text: params.displayNumber },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `WhatsApp API error: ${response.status} ${await response.text()}`
      );
    }
  } catch (error) {
    // Fail silently — WhatsApp notifications are optional (Layer 2)
    console.error("WhatsApp notification failed:", error);
  }
}
