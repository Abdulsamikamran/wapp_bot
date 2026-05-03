import { Product } from "../models/product.model.js";
import { Sale } from "../models/sale.model.js";
import { StockLog } from "../models/stock-log.model.js";
import { escapeRegex, normalizeProductName } from "../utils/text.js";

export const findProduct = async (shopId, searchTerm) => {
  const normalizedSearch = normalizeProductName(searchTerm);

  if (!normalizedSearch) return null;

  const exact = await Product.findOne({
    shopId,
    normalizedName: normalizedSearch,
  });
  if (exact) return exact;

  const partialRegex = new RegExp(escapeRegex(normalizedSearch), "i");
  return Product.findOne({ shopId, normalizedName: partialRegex });
};

export const addStock = async (command) => {
  const normalizedName = normalizeProductName(command.productName);

  let product = await Product.findOne({
    shopId: command.shopId,
    normalizedName,
  });

  if (!product) {
    product = await Product.create({
      shopId: command.shopId,
      name: command.productName.trim(),
      normalizedName,
      quantity: command.quantity,
      costPrice: command.costPrice,
      salePrice: command.salePrice,
      totalStockAdded: command.quantity,
      totalSold: 0,
    });
  } else {
    product.quantity += command.quantity;
    product.costPrice = command.costPrice;
    product.salePrice = command.salePrice;
    product.totalStockAdded += command.quantity;
    await product.save();
  }

  await StockLog.create({
    shopId: command.shopId,
    type: "ADD_STOCK",
    productName: product.name,
    quantity: command.quantity,
    costPrice: command.costPrice,
    salePrice: command.salePrice,
  });

  return product;
};

export const sellProduct = async (command) => {
  const product = await findProduct(command.shopId, command.productName);

  if (!product) {
    return { success: false, reason: "PRODUCT_NOT_FOUND" };
  }

  if (product.quantity < command.quantity) {
    return { success: false, reason: "LOW_STOCK", product };
  }

  const costTotal = product.costPrice * command.quantity;
  const profit = command.amount - costTotal;

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: product._id, quantity: { $gte: command.quantity } },
    { $inc: { quantity: -command.quantity, totalSold: command.quantity } },
    { new: true },
  );

  if (!updatedProduct) {
    const refreshedProduct = await Product.findById(product._id);
    return { success: false, reason: "LOW_STOCK", product: refreshedProduct };
  }

  const sale = await Sale.create({
    shopId: command.shopId,
    productName: updatedProduct.name,
    quantity: command.quantity,
    paymentMethod: command.paymentMethod,
    amount: command.amount,
    costTotal,
    profit,
  });

  return { success: true, product: updatedProduct, sale };
};

export const getTodayReport = async (shopId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfDay);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [sales, products] = await Promise.all([
    Sale.find({
      shopId,
      createdAt: { $gte: startOfDay, $lt: startOfTomorrow },
    }),
    Product.find({ shopId }),
  ]);

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalItemsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  const paymentSummary = sales.reduce((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.amount;
    return acc;
  }, {});

  const totalStockValue = products.reduce((sum, product) => {
    return sum + product.quantity * product.costPrice;
  }, 0);

  const lowStockItems = products.filter(
    (product) => product.quantity > 0 && product.quantity <= 2,
  );

  return {
    totalProducts: products.length,
    totalSales,
    totalProfit,
    totalItemsSold,
    paymentSummary,
    totalStockValue,
    lowStockItems,
  };
};
