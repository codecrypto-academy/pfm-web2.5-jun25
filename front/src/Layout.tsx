import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "./components/Navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const [isLogged, setIsLogged] = useState(false);

  useLayoutEffect(() => {
    const user = JSON.parse(window.localStorage.getItem("user") ?? "{}");
    if (Object.entries(user).length > 0) {
      setIsLogged(true);
    } else {
      setIsLogged(false);
    }
  }, []);

  const logoutHandler = () => {
    window.localStorage.removeItem("user");
    setIsLogged(false);
    navigate("/");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Navigation isLogged={isLogged} logoutHandler={logoutHandler} />

      <div style={{ marginTop: "24px" }}>{children}</div>
    </div>
  );
};

export default Layout;
