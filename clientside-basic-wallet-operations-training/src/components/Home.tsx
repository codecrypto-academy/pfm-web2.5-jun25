import { Link, Outlet, useLocation } from "react-router-dom";
import react from "../assets/react.svg";
import user from "../assets/user.svg";

const Home = () => {
  const location = useLocation();
  const { pathname } = location;
  const isHome = pathname === "/";

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
            <Link to="/customers">Clientes</Link>
          </li>
          <li>
            <Link to="/balance">Balance</Link>
          </li>
        </ul>
        <Link
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          to="/login"
        >
          <img style={{backgroundColor: "#b9bdf8", borderRadius: "50%"}}src={user} alt="" />
          <span>Login</span>
        </Link>
      </nav>

      {!isHome && (
        <section
          style={{
            backgroundColor: "#1a1a1a",
            padding: "12px 24px",
            borderRadius: "5px",
            marginTop: "24px",
          }}
        >
          <Outlet />
        </section>
      )}
    </div>
  );
};

export default Home;
