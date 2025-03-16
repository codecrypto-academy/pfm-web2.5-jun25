import styles from "./styles.module.css";

interface Props {
  isConnecting: boolean;
  clickHandler: () => void;
}

const ConnectMetamaskButton = ({ isConnecting, clickHandler }: Props) => {
  return isConnecting ? (
    <p style={{ textAlign: "center", color: "red" }}>Conectando...</p>
  ) : (
    <button className={styles.button} style={{ width: "100%" }} onClick={clickHandler}>
      Conectar a metamask
    </button>
  );
};

export default ConnectMetamaskButton;
