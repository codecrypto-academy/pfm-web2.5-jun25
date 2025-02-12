import { Link, Outlet, useLocation } from "react-router-dom";
import react from "../assets/react.svg";

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
          width: "100%"
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
          }}
        >
          <li>
            <Link to="/customers">Clientes</Link>
          </li>
          <li>
            <Link to="/balance">Balance</Link>
          </li>
        </ul>
      </nav>

      {!isHome && (
        <section
          style={{
            backgroundColor: "#1a1a1a",
            padding: "12px 24px",
            borderRadius: "25px",
            width: "100%"
          }}
        >
          <Outlet />
        </section>
      )}
    </div>
  );
};

export default Home;
