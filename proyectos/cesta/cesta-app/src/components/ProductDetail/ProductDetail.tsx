import { useQuery } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { Link, useParams } from "react-router";
import { CartContext, Product } from "../../context/CartContext";

function getProduct(id: number): Promise<{ result: Product }> {
  return fetch(`http://localhost:3000/product/${id}`).then((res) => res.json());
}

const ProductDetail = () => {
  const { addProductToCart } = useContext(CartContext);

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const params = useParams();
  const { data } = useQuery({
    queryKey: ["product"],
    queryFn: getProduct.bind(null, Number(params.id)),
  });

  const addProductHandler = () => {
    if (!data || data.result === null || "error" in data) return;
    addProductToCart(data.result, qty);
    setAdded(true);
  };

  if (!data) return <></>;

  if (data.result === null || "error" in data)
    return (
      <div className="container">
        <h2>Product not found</h2>
      </div>
    );

  return (
    <div className="container">
      <h1>Product Detail</h1>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{data.result.product_name}</h5>
          <p className="card-text">{data.result.quantity_per_unit}</p>
          <p className="card-text">{data.result.unit_price}€</p>
          <label htmlFor="qtyInputField" className="form-label">
            Quantity:
          </label>
          <input
            type="number"
            id="qtyInputField"
            className="form-control"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </div>
        <div className="card-footer">
          <button
            onClick={() => addProductHandler()}
            className="btn btn-primary"
          >
            Add to Cart
          </button>
        </div>
      </div>
      {added && (
        <div className="alert alert-secondary mt-3" role="alert">
          <h4 className="alert-heading">Product added to cart!</h4>
          <Link to="/cart" className="btn btn-success">
            Go to Cart
          </Link>
          <Link to="/products" className="btn btn-secondary ms-2">
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
