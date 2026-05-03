import { parseCommand } from "./command.service.js";
import {
  addStock,
  findProduct,
  getTodayReport,
  sellProduct,
} from "./inventory.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";
import { formatMoney } from "../utils/format.js";
import {
  addStaffToShop,
  completeShopRegistration,
  findUserByPhone,
  initiateRegistration,
} from "./user.service.js";
import { getTodayActivity, logActivity } from "./activity.service.js";

const capitalize = (str) =>
  String(str).charAt(0).toUpperCase() + String(str).slice(1);

const DIVIDER = "─────────────────";

const formatActivityLine = (log) => {
  const time = new Date(log.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const actor = capitalize(log.userRole);
  const d = log.details;

  switch (log.action) {
    case "ADD_STOCK":
      return `${time} — ${actor} added stock: ${d.productName} x${d.quantity}`;
    case "SELL":
      return `${time} — ${actor} sold: ${d.productName} x${d.quantity} (${capitalize(d.paymentMethod)})`;
    case "CHECK_STOCK":
      return `${time} — ${actor} checked stock: ${d.productName}`;
    case "ADD_STAFF":
      return `${time} — Owner added staff: ${d.staffPhone} as ${d.role}`;
    case "REPORT":
      return `${time} — ${actor} viewed report`;
    case "BLOCKED":
      return `${time} — ${actor} tried: ${d.command} — *blocked*`;
    default:
      return `${time} — ${actor}: ${log.action}`;
  }
};

export const handleIncomingCommand = async (incoming) => {
  const command = parseCommand(incoming.text);

  // ── 1. START — handle before any auth ────────────────────────────────────
  if (command.intent === "START") {
    const result = await initiateRegistration(incoming.from);

    if (result.alreadyActive) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `✅ *Already Registered*
${DIVIDER}
🏪 Shop: ${result.user.shopName}
👤 Role: ${capitalize(result.user.role)}

Send *help* to see all commands.`,
      });
      return;
    }

    if (result.staffActivated) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `✅ *Account Activated*
${DIVIDER}
🏪 Shop: ${result.user.shopName}
👤 Role: ${capitalize(result.user.role)}

Send *help* to see all commands.`,
      });
      return;
    }

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `👋 *Welcome to StockMunshi*

Please send your shop name:
_Example: Ahmed Mobiles Saddar_`,
    });
    return;
  }

  // ── 2. Find user ──────────────────────────────────────────────────────────
  const user = await findUserByPhone(incoming.from);

  // ── 3. Collect shop name for pending registrations ────────────────────────
  if (user?.status === "awaiting_shop_name") {
    const shopName = incoming.text.trim();
    if (shopName.length < 3) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ Shop name is too short.

Please send your shop name:
_Example: Ahmed Mobiles Saddar_`,
      });
      return;
    }

    const { shop } = await completeShopRegistration(incoming.from, shopName);

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `✅ *Shop Registered*
${DIVIDER}
🏪 *${shop.name}*
👤 Role: Owner

Send *help* to get started.`,
    });
    return;
  }

  // ── 4. Auth guard ─────────────────────────────────────────────────────────
  if (!user || user.status !== "active") {
    await sendWhatsAppMessage({
      to: incoming.from,
      text: `🔒 *Not Registered*

Send *start* to create your shop account.`,
    });
    return;
  }

  const shopId = user.shopId;
  const isOwner = user.role === "owner";

  // ── 5. HELP ───────────────────────────────────────────────────────────────
  if (command.intent === "HELP") {
    const ownerCommands = isOwner
      ? `\n\n👥 *Add Staff*\n\`add staff 923001112222 salesman\`\n\n📋 *Activity Log*\n\`activity today\``
      : "";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `🤖 *StockMunshi* — Commands
🏪 ${user.shopName} · ${capitalize(user.role)}
${DIVIDER}
📦 *Add Stock*
\`add stock iphone 13 2 cost 110000 sale 120000\`

💰 *Record Sale*
\`sold iphone 13 1 cash 120000\`
_Payments: cash · jazzcash · easypaisa · bank · card_

🔍 *Check Stock*
\`stock iphone 13\`

📊 *Daily Report*
\`report today\`${ownerCommands}`,
    });
    return;
  }

  // ── 6. ADD_STOCK ──────────────────────────────────────────────────────────
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

\`add stock iphone 13 2 cost 110000 sale 120000\`

• _product name_ — any text
• _quantity_ — number of units
• _cost_ — your purchase price
• _sale_ — your selling price`,
      });
      return;
    }

    const product = await addStock({ ...command, shopId });

    await logActivity({
      shopId,
      userPhone: user.phone,
      userRole: user.role,
      action: "ADD_STOCK",
      details: { productName: product.name, quantity: command.quantity },
    });

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

  // ── 7. SOLD ───────────────────────────────────────────────────────────────
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

\`sold iphone 13 1 cash 120000\`

• _product name_ — must exist in stock
• _quantity_ — units sold
• _payment_ — cash · jazzcash · easypaisa · bank · card
• _amount_ — total received`,
      });
      return;
    }

    const result = await sellProduct({ ...command, shopId });

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

    await logActivity({
      shopId,
      userPhone: user.phone,
      userRole: user.role,
      action: "SELL",
      details: {
        productName: result.product.name,
        quantity: command.quantity,
        paymentMethod: command.paymentMethod,
        amount: command.amount,
      },
    });

    const profitLine = isOwner
      ? `\n📈 Profit:       Rs. ${result.sale.profit >= 0 ? "+" : ""}${formatMoney(result.sale.profit)}`
      : "";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `💰 *Sale Recorded*
${DIVIDER}
📦 *${capitalize(result.product.name)}*

🛒 Sold:         ${command.quantity} pcs
📦 Remaining:   ${result.product.quantity} pcs
💳 Payment:     ${capitalize(command.paymentMethod)}
💵 Amount:      Rs. ${formatMoney(command.amount)}${profitLine}`,
    });
    return;
  }

  // ── 8. CHECK_STOCK ────────────────────────────────────────────────────────
  if (command.intent === "CHECK_STOCK") {
    if (!command.productName) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Missing Product Name*

Example: \`stock iphone 13\``,
      });
      return;
    }

    const product = await findProduct(shopId, command.productName);

    await logActivity({
      shopId,
      userPhone: user.phone,
      userRole: user.role,
      action: "CHECK_STOCK",
      details: { productName: command.productName },
    });

    if (!product) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `❌ *No Stock Found*

No record for: _${command.productName}_`,
      });
      return;
    }

    const stockStatus =
      product.quantity === 0
        ? "⛔ Out of Stock"
        : product.quantity <= 2
          ? `⚠️ ${product.quantity} pcs (low)`
          : `✅ ${product.quantity} pcs`;

    const costLine = isOwner
      ? `\n💸 Cost Price:   Rs. ${formatMoney(product.costPrice)}`
      : "";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `📦 *Stock Details*
${DIVIDER}
*${capitalize(product.name)}*

🔢 In Stock:     ${stockStatus}${costLine}
🏷️ Sale Price:   Rs. ${formatMoney(product.salePrice)}
${DIVIDER}
📥 Total Added:  ${product.totalStockAdded} pcs
📤 Total Sold:   ${product.totalSold} pcs`,
    });
    return;
  }

  // ── 9. REPORT ─────────────────────────────────────────────────────────────
  if (command.intent === "REPORT") {
    const report = await getTodayReport(shopId);

    await logActivity({
      shopId,
      userPhone: user.phone,
      userRole: user.role,
      action: "REPORT",
      details: {},
    });

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

    if (isOwner) {
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
    } else {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `📊 *Daily Report*
${DIVIDER}
🛒 Items Sold:   ${report.totalItemsSold} pcs
💵 Total Sales:  Rs. ${formatMoney(report.totalSales)}

💳 *Payments*
${paymentLines || "  No sales yet"}`,
      });
    }
    return;
  }

  // ── 10. ADD_STAFF (owner only) ────────────────────────────────────────────
  if (command.intent === "ADD_STAFF") {
    if (!isOwner) {
      await logActivity({
        shopId,
        userPhone: user.phone,
        userRole: user.role,
        action: "BLOCKED",
        details: { command: "add staff" },
      });
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `🔒 *Access Denied*

This command is for shop owners only.`,
      });
      return;
    }

    if (!command.staffPhone) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Incomplete Details*

\`add staff 923001112222 salesman\``,
      });
      return;
    }

    const result = await addStaffToShop({
      ownerShopId: shopId,
      ownerShopName: user.shopName,
      staffPhone: command.staffPhone,
      role: command.role,
    });

    if (result.alreadyExists) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `⚠️ *Already Registered*

${command.staffPhone} already has an account.`,
      });
      return;
    }

    await logActivity({
      shopId,
      userPhone: user.phone,
      userRole: user.role,
      action: "ADD_STAFF",
      details: { staffPhone: command.staffPhone, role: command.role },
    });

    const allowedLines =
      command.role === "salesman"
        ? "• Add stock\n• Record sales\n• Check stock\n• View daily sales"
        : "• All commands";

    const blockedLines =
      command.role === "salesman"
        ? "• View profit\n• Activity log\n• Add staff"
        : "None";

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `✅ *Staff Added*
${DIVIDER}
📱 Phone: ${command.staffPhone}
👤 Role:   ${capitalize(command.role)}

✅ *Allowed*
${allowedLines}

🔒 *Blocked*
${blockedLines}

_They must send *start* to activate their account._`,
    });
    return;
  }

  // ── 11. ACTIVITY (owner only) ─────────────────────────────────────────────
  if (command.intent === "ACTIVITY") {
    if (!isOwner) {
      await logActivity({
        shopId,
        userPhone: user.phone,
        userRole: user.role,
        action: "BLOCKED",
        details: { command: "activity" },
      });
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `🔒 *Access Denied*

Activity log is for shop owners only.`,
      });
      return;
    }

    const logs = await getTodayActivity(shopId);

    if (!logs.length) {
      await sendWhatsAppMessage({
        to: incoming.from,
        text: `📋 *Today's Activity*
${DIVIDER}
No activity recorded today.`,
      });
      return;
    }

    const lines = logs.map(formatActivityLine).join("\n");

    await sendWhatsAppMessage({
      to: incoming.from,
      text: `📋 *Today's Activity*
${DIVIDER}
${lines}`,
    });
    return;
  }

  // ── 12. Unknown ───────────────────────────────────────────────────────────
  await sendWhatsAppMessage({
    to: incoming.from,
    text: `🤷 *Command Not Recognized*

Send *help* to see all available commands.`,
  });
};
