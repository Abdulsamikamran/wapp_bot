export const parseCommand = (text) => {
  const normalized = text.toLowerCase().trim();

  if (normalized === "start") {
    return { intent: "START" };
  }

  if (["activity", "activity today", "today activity"].includes(normalized)) {
    return { intent: "ACTIVITY" };
  }

  if (normalized.startsWith("add staff ")) {
    const body = normalized.replace(/^add staff\s+/, "").trim();
    const parts = body.split(/\s+/);
    const staffPhone = parts[0] || null;
    const role = ["salesman", "owner"].includes(parts[1])
      ? parts[1]
      : "salesman";
    return { intent: "ADD_STAFF", staffPhone, role };
  }

  if (["help", "/help"].includes(normalized)) {
    return {
      intent: "HELP",
    };
  }

  if (
    ["report", "report today", "today report", "daily report"].includes(
      normalized,
    )
  ) {
    return {
      intent: "REPORT",
    };
  }

  if (
    normalized.startsWith("stock ") ||
    normalized.startsWith("check stock ") ||
    normalized.startsWith("quantity ") ||
    normalized.startsWith("qty ")
  ) {
    const productName = normalized
      .replace(/^check stock\s+/, "")
      .replace(/^stock\s+/, "")
      .replace(/^quantity\s+/, "")
      .replace(/^qty\s+/, "")
      .trim();

    return {
      intent: "CHECK_STOCK",
      productName,
    };
  }

  if (normalized.startsWith("add stock")) {
    const body = normalized.replace(/^add stock\s+/, "").trim();

    const costMatch = body.match(/\bcost\s+(\d+)/);
    const saleMatch = body.match(/\bsale\s+(\d+)/);

    const beforeCost = costMatch ? body.slice(0, costMatch.index).trim() : body;

    const qtyMatch = beforeCost.match(
      /(.+?)\s+(\d+)\s*(pc|pcs|piece|pieces)?$/,
    );

    return {
      intent: "ADD_STOCK",
      productName: qtyMatch ? qtyMatch[1].trim() : beforeCost.trim(),
      quantity: qtyMatch ? Number(qtyMatch[2]) : null,
      costPrice: costMatch ? Number(costMatch[1]) : null,
      salePrice: saleMatch ? Number(saleMatch[1]) : null,
    };
  }

  if (normalized.startsWith("sold")) {
    const body = normalized.replace(/^sold\s+/, "").trim();

    const paymentMethods = ["cash", "jazzcash", "easypaisa", "bank", "card"];
    const paymentMethod = paymentMethods.find((method) =>
      body.includes(` ${method} `),
    );

    if (!paymentMethod) {
      return {
        intent: "SOLD",
        productName: null,
        quantity: null,
        paymentMethod: null,
        amount: null,
      };
    }

    const paymentIndex = body.indexOf(` ${paymentMethod} `);
    const beforePayment = body.slice(0, paymentIndex).trim();
    const afterPayment = body.slice(paymentIndex).trim();

    const amountMatch = afterPayment.match(
      new RegExp(`${paymentMethod}\\s+(\\d+)`),
    );

    const qtyMatch = beforePayment.match(
      /(.+?)\s+(\d+)\s*(pc|pcs|piece|pieces)?$/,
    );

    return {
      intent: "SOLD",
      productName: qtyMatch ? qtyMatch[1].trim() : beforePayment.trim(),
      quantity: qtyMatch ? Number(qtyMatch[2]) : null,
      paymentMethod,
      amount: amountMatch ? Number(amountMatch[1]) : null,
    };
  }

  return {
    intent: "UNKNOWN",
  };
};
