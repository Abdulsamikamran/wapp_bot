import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["ADD_STOCK"],
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const StockLog = mongoose.model("StockLog", stockLogSchema);
