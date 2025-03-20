import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import styles from "./styles.module.css";

type FormData = {
    name: string;
    email: string;
    password: string;
    repeatPassword: string;
}

const Register = () => {
    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<FormData>();

    const {mutate, data: response, isSuccess} = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await fetch("http://localhost:3000/user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password
                }),
            });
            return response.json();
        },
    });

    const registerUserHandler = (data: FormData) => {
        mutate(data);
        console.log(response);
    };

    if (isSuccess) {
        window.localStorage.setItem("user", JSON.stringify(response.data.id));
        return <Navigate replace to={'/contacts'} />;
    }

    return (
        <>
            <p>Por favor, ingresa tus datos para registrarte.</p>
            <form
                className={styles.loginForm}
                onSubmit={handleSubmit(registerUserHandler)}
            >
                <label>
                    Nombre:
                    <input type="text" {...register("name", {required: true})} />
                </label>
                {errors.name && <small>Debes introducir tu nombre.</small>}

                <label>
                    Email:
                    <input
                        type="email"
                        {...register("email", {required: true, pattern: /\S+@\S+\.\S+/})}
                    />
                </label>
                {errors.email && <small>Debes introducir tu email válido.</small>}

                <label>
                    Contraseña:
                    <input
                        type="password"
                        {...register("password", {required: true, minLength: 6})}
                    />
                </label>
                {errors.password && (
                    <small>La contraseña debe tener al menos 6 caracteres.</small>
                )}

                <label>
                    Repite la contraseña:
                    <input
                        type="password"
                        {...register("repeatPassword", {
                            required: true,
                            validate: (value, {password}) => value === password,
                        })}
                    />
                </label>
                {errors.repeatPassword && <small>Las contraseñas no coinciden.</small>}

                <button className={styles.button} type="submit">
                    Registraté
                </button>
            </form>
            <footer>
                <p>
                    ¿Ya tienes una cuenta?, entra <Link to="/login">aquí</Link>.
                </p>
            </footer>
        </>
    );
};

export default Register;
