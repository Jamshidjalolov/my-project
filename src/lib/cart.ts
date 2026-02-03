export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  quantity: number;
}

const CART_KEY = "cart";
const listeners = new Set<() => void>();

function readCart(): CartItem[] {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCart() {
  return readCart();
}

export function setCart(items: CartItem[]) {
  writeCart(items);
}

export function addToCart(item: CartItem) {
  const current = readCart();
  const existing = current.find((c) => c.product_id === item.product_id);
  if (existing) {
    existing.quantity += item.quantity;
    writeCart([...current]);
    return;
  }
  writeCart([...current, item]);
}

export function updateCartItem(productId: number, quantity: number) {
  const current = readCart();
  const next = current
    .map((item) => (item.product_id === productId ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  writeCart(next);
}

export function removeCartItem(productId: number) {
  const current = readCart();
  writeCart(current.filter((item) => item.product_id !== productId));
}

export function clearCart() {
  writeCart([]);
}
