import { createContext } from "react";

export type Product = {
  product_id: number;
  product_name: string;
  supplier_id: number;
  category_id: number;
  quantity_per_unit: string;
  unit_price: number;
  units_in_stock: number;
  units_on_order: number;
  reorder_level: number;
};

type CartContextProps = {
  cart: {product: Product, qty: number}[];
  addProductToCart: (product: Product, qty: number) => void;
  removeProductFromCart: (product: Product) => void;
};

export const CartContext = createContext({} as CartContextProps);
