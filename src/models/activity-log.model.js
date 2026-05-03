import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    userPhone: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "ADD_STOCK",
        "SELL",
        "CHECK_STOCK",
        "ADD_STAFF",
        "REPORT",
        "BLOCKED",
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
