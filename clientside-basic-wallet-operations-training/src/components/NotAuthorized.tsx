import { Link } from "react-router-dom";
import styles from "./styles.module.css";

const NotAuthorized = () => {
  return (
    <>
      <h2>Not Authorized</h2>
      <p>You need to be logged in to access this content</p>
      <Link to="/login">
        <button className={styles.button}>Log in</button>
      </Link>
    </>
  );
};

export default NotAuthorized;
