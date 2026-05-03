import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
];

const missingVariables = requiredVariables.filter(
  (key) => !process.env[key] || process.env[key].trim() === "",
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVariables.join(", ")}`,
  );
}

export const env = {
  PORT: Number(process.env.PORT || 3000),
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/stockmunshi",
};
