export function calculateAmounts(items, discountPercent = 0) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const discount = Math.round((subtotal * Number(discountPercent || 0)) / 100);
    return { subtotal, discount, payable: subtotal - discount };
  }