export const normalizeProductName = (name) => {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

export const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
