import express from "express";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("StockMunshi bot running");
});

app.use("/webhook", webhookRoutes);

export default app;
