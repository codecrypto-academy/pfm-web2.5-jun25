import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const {
    mutate,
    data: response,
  } = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("http://localhost:3000/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      return response.json();
    },
  });

  const loginUserHandler = (data: FormData) => {
    mutate(data);
  };

  useEffect(() => {
    if (response && "data" in response) {
      window.localStorage.setItem("user", JSON.stringify(response));
      navigate("/contacts");
    }
  }, [navigate, response]);

  return (
    <>
      {response && "message" in response && (
        <p className={styles.errorMessage}>{response.message}</p>
      )}
      <form
        className={styles.loginForm}
        onSubmit={handleSubmit(loginUserHandler)}
      >
        <label>
          Email:
          <input
            type="email"
            {...register("email", { required: true, pattern: /\S+@\S+\.\S+/ })}
          />
        </label>
        {errors.email && <small>Debes introducir tu email válido.</small>}
        <label>
          Contraseña:
          <input
            type="password"
            {...register("password", { required: true, minLength: 6 })}
          />
        </label>
        {errors.password && (
          <small>La contraseña debe tener al menos 6 caracteres.</small>
        )}
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
