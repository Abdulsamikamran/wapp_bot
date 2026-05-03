# StockMunshi Bot

WhatsApp inventory and sales bot built with Node.js, Express, and MongoDB.

## Project Structure

- src/config: environment and database configuration
- src/models: MongoDB models (Product, Sale, StockLog)
- src/services: command parsing, WhatsApp integration, and inventory logic
- src/controllers: webhook request handlers
- src/routes: route definitions
- src/utils: shared helpers
- src/app.js: express app setup
- src/server.js: startup and database connection bootstrap

## Environment

Copy `.env.example` to `.env` and update values:

- PORT: internal app port (default 3000)
- APP_PORT: host port for Docker mapping (default 3000)
- WHATSAPP_VERIFY_TOKEN
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- MONGO_URI

## Run Locally

1. Install dependencies:

npm install

2. Start MongoDB locally and ensure `MONGO_URI` points to it.

3. Start the app:

npm start

## Run with Docker

Build and run app + MongoDB:

docker compose up -d --build

If port 3000 is occupied on your host, set another host port before starting:

APP_PORT=3001 docker compose up -d --build

Stop services:

docker compose down

## Webhook Endpoints

- GET /webhook/whatsapp: verification endpoint
- POST /webhook/whatsapp: incoming WhatsApp messages
