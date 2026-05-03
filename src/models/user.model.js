import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "salesman"],
      default: "owner",
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    shopName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["awaiting_shop_name", "invited", "active"],
      default: "awaiting_shop_name",
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
