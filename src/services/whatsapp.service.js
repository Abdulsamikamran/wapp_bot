import { env } from "../config/env.js";

export const sendWhatsAppMessage = async ({ to, text }) => {
  const url = `https://graph.facebook.com/v25.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: text,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp send error:", data);
    return null;
  }

  return data;
};

export const getIncomingMessage = (body) => {
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) return null;

  return {
    from: message.from,
    text: message.text?.body?.trim() || "",
    type: message.type,
    messageId: message.id,
    timestamp: message.timestamp,
  };
};
