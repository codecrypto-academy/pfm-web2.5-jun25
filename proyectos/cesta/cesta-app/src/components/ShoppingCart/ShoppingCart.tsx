import { ethers, TransactionReceipt, TransactionResponse } from "ethers";
import { useContext, useState } from "react";
import { CartContext } from "../../context/CartContext";
import useMetamask from "../../hooks/useMetamask";

const ShoppingCart = () => {
  const { cart, removeProductFromCart } = useContext(CartContext);
  const totalPrice = cart.reduce(
    (acc: number, item) => acc + item.product.unit_price * item.qty,
    0
  );

  const { isWalletConnected, connectWallet, account } = useMetamask();

  const [transacctionPayload, setTransacctionPayload] =
    useState<TransactionResponse | null>(null);
  const [transacctionRecipt, setTransacctionRecipt] =
    useState<TransactionReceipt | null>(null);
  const [transacctionFailed, setTransacctionFailed] = useState<string | null>(
    null
  );

  const buttonsDisabled = !!transacctionPayload;

  async function paymentClickHandler(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): Promise<void> {
    event.preventDefault();

    if (!isWalletConnected || !account) {
      return;
    }

    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const transaction = {
          to: "0xa8596098885536A4CF3601208Ad6D6215425de38", //recipient's address
          value: ethers.parseEther(totalPrice.toString()),
        };

        const txResponse = await signer.sendTransaction(transaction);
        setTransacctionPayload(txResponse);

        const receipt = await txResponse.wait();
        setTransacctionPayload(null);
        setTransacctionRecipt(receipt);
      }
    } catch (error) {
      if (error instanceof Error) {
        setTransacctionFailed(JSON.stringify(error, null, 2));
      }
    }
  }

  return (
    <div className="container">
      <h1>Shopping Cart</h1>
      <table className="table table-striped table-bordered table-hover w-auto">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {cart.map(({ product, qty }) => (
            <tr key={product.product_id}>
              <td>{product.product_name}</td>
              <td>{product.unit_price} KHLOEs</td>
              <td>{qty}</td>
              <td>
                <button
                  className="btn btn-danger"
                  onClick={() => removeProductFromCart(product)}
                  disabled={buttonsDisabled}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Total Price: {totalPrice.toFixed(2)} KHLOEs</h2>
      {isWalletConnected ? (
        <button
          className="btn btn-primary"
          onClick={paymentClickHandler}
          disabled={buttonsDisabled}
        >
          Pay
        </button>
      ) : (
        <button
          className="btn btn-info"
          onClick={connectWallet}
          disabled={buttonsDisabled}
        >
          Connect Wallet
        </button>
      )}

      {transacctionPayload && (
        <div className="alert alert-info mt-3">
          <p>Transaction in progress... Please wait.</p>
          <pre>{JSON.stringify(transacctionPayload, null, 2)}</pre>
        </div>
      )}

      {transacctionRecipt && (
        <div className="alert alert-success mt-3">
          <p>Transaction confirmed!</p>
          <pre>{JSON.stringify(transacctionRecipt, null, 2)}</pre>
        </div>
      )}

      {transacctionFailed && (
        <div className="alert alert-danger mt-3">
          <p>Transaction failed!</p>
          <pre>{transacctionFailed}</pre>
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
