import { Link } from "react-router-dom";
import styles from "./styles.module.css";
const Login = () => {
  return (
    <>
      <form
        className={styles.loginForm}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          console.log({ email, password });
        }}
      >
        <label>
          Email:
          <input type="email" name="email" />
        </label>
        <label>
          Contraseña:
          <input type="password" name="password" />
        </label>
        <button className={styles.button} type="submit">
          Login
        </button>
      </form>
      <footer>
        <p>
          ¿No tienes una cuenta?, registraté <Link to="/register">aquí</Link>.
        </p>
      </footer>
    </>
  );
};

export default Login;
