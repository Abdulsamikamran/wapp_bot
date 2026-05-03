import { parseCommand } from "./command.service.js";
import {
  addStock,
  findProduct,
  getTodayReport,
  sellProduct,
} from "./inventory.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";
import { formatMoney } from "../utils/format.js";

const capitalize = (str) =>
  String(str).charAt(0).toUpperCase() + String(str).slice(1);

const DIVIDER = "─────────────────";

export const handleIncomingCommand = async (incoming) => {
  const command = parseCommand(incoming.text);

  if (command.intent === "HELP") {
    await sendWhatsAppMessage({
      to: incoming.from,
      text: `🤖 *StockMunshi* — Commands

📦 *Add Stock*
\`add stock iphone 13 2 cost 110000 sale 120000\`

💰 *Record Sale*
\`sold iphone 13 1 cash 120000\`
_Payments: cash · jazzcash · easypaisa · bank · card_

🔍 *Check Stock*
\`stock iphone 13\`

📊 *Daily Report*
\`report today\``,
    });

    return;
  }

  if (command.intent === "ADD_STOCK") {
    if (
      !command.productName ||
      !command.quantity ||
      !command.costPrice ||
      !command.salePrice
    ) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Incomplete Details*

Please use this format:

\`add stock iphone 13 2 cost 110000 sale 120000\`

• _product name_ — any text
• _quantity_ — number of units
• _cost_ — your purchase price
• _sale_ — your selling price`,
      });

      return;
    }

    const product = await addStock(command);

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `✅ *Stock Added*
${DIVIDER}
📦 *${capitalize(product.name)}*

➕ Added:        ${command.quantity} pcs
📊 In Stock:     ${product.quantity} pcs
💸 Cost Price:   Rs. ${formatMoney(product.costPrice)}
🏷️ Sale Price:   Rs. ${formatMoney(product.salePrice)}`,
    });

    return;
  }

  if (command.intent === "SOLD") {
    if (
      !command.productName ||
      !command.quantity ||
      !command.paymentMethod ||
      !command.amount
    ) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Incomplete Details*

Please use this format:

\`sold iphone 13 1 cash 120000\`

• _product name_ — must exist in stock
• _quantity_ — units sold
• _payment_ — cash · jazzcash · easypaisa · bank · card
• _amount_ — total received`,
      });

      return;
    }

    const result = await sellProduct(command);

    if (!result.success && result.reason === "PRODUCT_NOT_FOUND") {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `❌ *Product Not Found*

No stock record for: _${command.productName}_

Add it first:
\`add stock iphone 13 2 cost 110000 sale 120000\``,
      });

      return;
    }

    if (!result.success && result.reason === "LOW_STOCK") {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `❌ *Not Enough Stock*
${DIVIDER}
📦 *${capitalize(result.product.name)}*

✅ Available:    ${result.product.quantity} pcs
❗ Requested:   ${command.quantity} pcs`,
      });

      return;
    }

    const profitSign = result.sale.profit >= 0 ? "+" : "";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `💰 *Sale Recorded*
${DIVIDER}
📦 *${capitalize(result.product.name)}*

🛒 Sold:         ${command.quantity} pcs
📦 Remaining:   ${result.product.quantity} pcs
💳 Payment:     ${capitalize(command.paymentMethod)}
💵 Amount:      Rs. ${formatMoney(command.amount)}
📈 Profit:       Rs. ${profitSign}${formatMoney(result.sale.profit)}`,
    });

    return;
  }

  if (command.intent === "CHECK_STOCK") {
    if (!command.productName) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Missing Product Name*

Example:
\`stock iphone 13\``,
      });

      return;
    }

    const product = await findProduct(command.productName);

    if (!product) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `❌ *No Stock Found*

No record for: _${command.productName}_

Send *help* to see all commands.`,
      });

      return;
    }

    const stockStatus =
      product.quantity === 0
        ? "⛔ Out of Stock"
        : product.quantity <= 2
          ? `⚠️ ${product.quantity} pcs (low)`
          : `✅ ${product.quantity} pcs`;

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `📦 *Stock Details*
${DIVIDER}
*${capitalize(product.name)}*

🔢 In Stock:     ${stockStatus}
💸 Cost Price:   Rs. ${formatMoney(product.costPrice)}
🏷️ Sale Price:   Rs. ${formatMoney(product.salePrice)}
${DIVIDER}
📥 Total Added:  ${product.totalStockAdded} pcs
📤 Total Sold:   ${product.totalSold} pcs`,
    });

    return;
  }

  if (command.intent === "REPORT") {
    const report = await getTodayReport();

    const paymentLines = Object.entries(report.paymentSummary)
      .map(
        ([method, amount]) =>
          `  • ${capitalize(method)}: Rs. ${formatMoney(amount)}`,
      )
      .join("\n");

    const lowStockLines = report.lowStockItems.length
      ? report.lowStockItems
          .map((item) => `  ⚠️ ${capitalize(item.name)}: ${item.quantity} left`)
          .join("\n")
      : "  ✅ All products well stocked";

    const profitSign = report.totalProfit >= 0 ? "+" : "";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `📊 *Daily Report*
${DIVIDER}
🏪 Products:     ${report.totalProducts}
🛒 Items Sold:   ${report.totalItemsSold} pcs
💵 Total Sales:  Rs. ${formatMoney(report.totalSales)}
📈 Profit:        Rs. ${profitSign}${formatMoney(report.totalProfit)}
🏦 Stock Value:  Rs. ${formatMoney(report.totalStockValue)}

💳 *Payments*
${paymentLines || "  No sales yet"}

📦 *Low Stock*
${lowStockLines}`,
    });

    return;
  }

  await sendWhatsAppMessage({
    to: incoming.from,
    text: `🤷 *Command Not Recognized*

Send *help* to see all available commands.`,
  });
};
