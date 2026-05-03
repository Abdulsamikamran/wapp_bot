import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
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
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "jazzcash", "easypaisa", "bank", "card"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    costTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Sale = mongoose.model("Sale", saleSchema);
