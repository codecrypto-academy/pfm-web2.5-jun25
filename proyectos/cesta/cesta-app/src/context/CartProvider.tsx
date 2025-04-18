import { useState } from "react";
import { CartContext, Product } from "./CartContext";

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const addProductToCart = (product: Product, qty: number) => {
    const cartItem = { product, qty };
    setCart((prev) => [...prev, cartItem]);
  };
  const removeProductFromCart = (product: Product) => {
    setCart((prev) =>
      prev.filter((item) => item.product.product_id !== product.product_id)
    );
  };
  return (
    <CartContext.Provider
      value={{ cart, addProductToCart, removeProductFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
