import { useLayoutEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import react from "../assets/react.svg";
import user from "../assets/user.svg";

const Nav = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const [isLogged, setIsLogged] = useState(false);

  useLayoutEffect(() => {
    const userId = window.localStorage.getItem("user") ?? "";

    if (!userId) {
      setIsLogged(false);
    } else {
      setIsLogged(true);
    }
  }, []);

  const logoutHandler = () => {
    window.localStorage.removeItem("user");
    setIsLogged(false);
    navigate("/");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <nav
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <Link
          style={{
            flexGrow: "1",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
          to={"/"}
        >
          <img src={react} />
          <span>Home</span>
        </Link>
        <ul
          style={{
            listStyle: "none",
            textAlign: "left",
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            flexGrow: "1",
          }}
        >
          <li>
            <Link to="/contacts">Contactos</Link>
          </li>
          <li>
            <Link to="/balance">Balance</Link>
          </li>
        </ul>
        {!isLogged && (
          <Link
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            to="/login"
          >
            <img
              style={{ backgroundColor: "#b9bdf8", borderRadius: "50%" }}
              src={user}
              alt=""
            />
            Login
          </Link>
        )}
        {isLogged && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: "500",
              color: "#b9bdf8",
              cursor: "pointer",
            }}
            onClick={logoutHandler}
          >
            <img
              style={{ backgroundColor: "#b9bdf8", borderRadius: "50%" }}
              src={user}
              alt=""
            />
            <span>Logout</span>
          </div>
        )}
      </nav>

      <div style={{ marginTop: "24px" }}>{children}</div>
    </div>
  );
};

export default Nav;
