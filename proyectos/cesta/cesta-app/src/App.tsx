import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router";
import Nav from "./components/Nav/Nav";
import ProductDetail from "./components/ProductDetail/ProductDetail";
import Products from "./components/Products/Products";
import ShoppingCart from "./components/ShoppingCart/ShoppingCart";
import { CartProvider } from "./context/CartProvider";

const queryClient = new QueryClient();

const routes = [
  {
    path: "/",
    label: "Products",
    element: <Products />,
  },
  {
    path: "/cart",
    label: "Shopping Cart",
    element: <ShoppingCart />,
  },
];

function App() {
  return (
    <CartProvider>
      <QueryClientProvider client={queryClient}>
        <Nav routes={routes} />
        <Routes>
          {routes.map((route) => (
            <Route path={route.path} element={route.element} key={route.path} />
          ))}
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </QueryClientProvider>
    </CartProvider>
  );
}

export default App;
