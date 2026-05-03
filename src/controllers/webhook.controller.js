import { env } from "../config/env.js";
import { handleIncomingCommand } from "../services/bot.service.js";
import { getIncomingMessage } from "../services/whatsapp.service.js";

export const verifyWhatsAppWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const receiveWhatsAppWebhook = async (req, res) => {
  try {
    const incoming = getIncomingMessage(req.body);

    if (!incoming || !incoming.text) {
      return res.sendStatus(200);
    }

    console.log("Incoming message:", incoming);

    await handleIncomingCommand(incoming);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(200);
  }
};
