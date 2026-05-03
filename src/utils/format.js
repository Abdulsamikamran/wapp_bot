export const formatMoney = (amount) => {
  return Number(amount || 0).toLocaleString("en-PK");
};
