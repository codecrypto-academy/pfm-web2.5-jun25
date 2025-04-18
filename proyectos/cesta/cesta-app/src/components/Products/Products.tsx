import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Product } from "../../context/CartContext";

function getProducts(): Promise<{ result: Product[] }> {
  return fetch("http://localhost:3000/products").then((res) => res.json());
}

const Products = () => {
  // const { addProductToCart } = useContext(CartContext);
  const query = useQuery({ queryKey: ["products"], queryFn: getProducts });

  return (
    <div className="container">
      <h1>Northwind Products</h1>
      <div className="table-responsive">
        <table className="table table-striped table-bordered table-hover w-auto">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.result.map((product: Product) => (
              <tr key={product.product_id}>
                <td>{product.product_name}</td>
                <td>{product.unit_price} KHLOEs</td>
                <td>
                  <Link
                    className="btn btn-primary"
                    to={`/product/${product.product_id}`}
                  >
                    Add to cart
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;
