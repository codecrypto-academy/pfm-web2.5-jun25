import { NavLink } from "react-router-dom";
import react from "../assets/react.svg";
import user from "../assets/user.svg";

type Props = {
  isLogged: boolean;
  logoutHandler: () => void;
};

const Navigation = ({ isLogged, logoutHandler }: Props) => {
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        fontVariant: "small-caps"
      }}
    >
      <NavLink
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
      </NavLink>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          flexGrow: "1",
        }}
      >
        <NavLink to="/contacts">Agenda de contactos</NavLink>
        <NavLink to="/transfer">Transferir fondos</NavLink>
        <NavLink to="/balance">Balance</NavLink>
      </div>
      {!isLogged && (
        <NavLink
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
        </NavLink>
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
  );
};

export default Navigation;
