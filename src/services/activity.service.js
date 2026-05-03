import { ActivityLog } from "../models/activity-log.model.js";

export const logActivity = async ({
  shopId,
  userPhone,
  userRole,
  action,
  details = {},
}) => {
  try {
    await ActivityLog.create({ shopId, userPhone, userRole, action, details });
  } catch (err) {
    console.error("Activity log error:", err);
  }
};

export const getTodayActivity = async (shopId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return ActivityLog.find({
    shopId,
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  }).sort({ createdAt: 1 });
};
