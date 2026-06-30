export function saveOrder(order) {
  const previous = JSON.parse(localStorage.getItem('toolsop_orders') || '[]')
  localStorage.setItem('toolsop_orders', JSON.stringify([order, ...previous]))
}

export function getOrders() {
  return JSON.parse(localStorage.getItem('toolsop_orders') || '[]')
}
