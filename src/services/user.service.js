import { Shop } from "../models/shop.model.js";
import { User } from "../models/user.model.js";

const STATUS_PRIORITY = {
  active: 3,
  invited: 2,
  awaiting_shop_name: 1,
};

const normalizePhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  const withoutIntlPrefix = digits.startsWith("00") ? digits.slice(2) : digits;

  if (withoutIntlPrefix.startsWith("92")) {
    return withoutIntlPrefix;
  }

  if (withoutIntlPrefix.startsWith("0") && withoutIntlPrefix.length === 11) {
    return `92${withoutIntlPrefix.slice(1)}`;
  }

  if (withoutIntlPrefix.startsWith("3") && withoutIntlPrefix.length === 10) {
    return `92${withoutIntlPrefix}`;
  }

  return withoutIntlPrefix;
};

const getPhoneLookupVariants = (phone) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) return [];

  const variants = new Set([normalizedPhone, `+${normalizedPhone}`]);

  if (normalizedPhone.startsWith("92") && normalizedPhone.length === 12) {
    variants.add(`0${normalizedPhone.slice(2)}`);
    variants.add(normalizedPhone.slice(2));
  }

  return [...variants];
};

const buildLoosePhonePattern = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;

  return new RegExp(
    `^\\+?${digits.replace(/\d/g, "$&\\D*").replace(/\\D\*$/, "")}$`,
  );
};

const getPhoneQuery = (phone) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) return null;

  const phoneVariants = getPhoneLookupVariants(normalizedPhone);
  const loosePatterns = phoneVariants
    .map(buildLoosePhonePattern)
    .filter(Boolean);

  return {
    normalizedPhone,
    query: {
      $or: [
        { phone: { $in: phoneVariants } },
        ...loosePatterns.map((pattern) => ({ phone: { $regex: pattern } })),
      ],
    },
  };
};

const sortUsersByPriority = (users) => {
  return [...users].sort((left, right) => {
    const priorityDiff =
      (STATUS_PRIORITY[right.status] || 0) -
      (STATUS_PRIORITY[left.status] || 0);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
};

const findUsersByPhone = async (phone) => {
  const phoneQuery = getPhoneQuery(phone);

  if (!phoneQuery) return [];

  const users = await User.find(phoneQuery.query);
  return sortUsersByPriority(users);
};

const syncUserPhone = async (user, normalizedPhone) => {
  if (!user || !normalizedPhone || user.phone === normalizedPhone) {
    return user;
  }

  const conflicts = await User.find({
    _id: { $ne: user._id },
    phone: normalizedPhone,
  });

  const staleAwaitingUsers = conflicts.filter(
    (conflict) => conflict.status === "awaiting_shop_name",
  );

  if (staleAwaitingUsers.length === conflicts.length && conflicts.length > 0) {
    await User.deleteMany({
      _id: { $in: staleAwaitingUsers.map((conflict) => conflict._id) },
    });
  }

  const remainingConflict = await User.exists({
    _id: { $ne: user._id },
    phone: normalizedPhone,
  });

  if (!remainingConflict) {
    user.phone = normalizedPhone;
    await user.save();
  }

  return user;
};

export const findUserByPhone = async (phone) => {
  const users = await findUsersByPhone(phone);
  return users[0] || null;
};

export const initiateRegistration = async (phone) => {
  const normalizedPhone = normalizePhoneNumber(phone);
  const [existing] = await findUsersByPhone(normalizedPhone);

  if (existing?.status === "active") {
    await syncUserPhone(existing, normalizedPhone);
    return { alreadyActive: true, user: existing };
  }

  if (existing?.status === "invited") {
    await syncUserPhone(existing, normalizedPhone);
    existing.status = "active";
    await existing.save();
    return { staffActivated: true, user: existing };
  }

  if (existing?.status === "awaiting_shop_name") {
    await syncUserPhone(existing, normalizedPhone);
    return { awaitingShopName: true, user: existing };
  }

  const user = await User.create({
    phone: normalizedPhone,
    status: "awaiting_shop_name",
  });
  return { awaitingShopName: true, user };
};

export const completeShopRegistration = async (phone, shopName) => {
  const normalizedPhone = normalizePhoneNumber(phone);
  const shop = await Shop.create({ name: shopName.trim() });
  const user = await User.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      shopId: shop._id,
      shopName: shop.name,
      status: "active",
      role: "owner",
    },
    { new: true },
  );
  return { shop, user };
};

export const addStaffToShop = async ({
  ownerShopId,
  ownerShopName,
  staffPhone,
  role,
}) => {
  const normalizedPhone = normalizePhoneNumber(staffPhone);
  const existing = await findUserByPhone(normalizedPhone);
  if (existing) return { alreadyExists: true, user: existing };

  const user = await User.create({
    phone: normalizedPhone,
    role,
    shopId: ownerShopId,
    shopName: ownerShopName,
    status: "invited",
  });
  return { success: true, user };
};
