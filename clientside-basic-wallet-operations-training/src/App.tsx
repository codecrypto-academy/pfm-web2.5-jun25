import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Balance from "./components/Balance";
import Contacts from "./components/Contacts.tsx";
import Login from "./components/Login";
import Nav from "./components/Nav.tsx";
import NotAuthorized from "./components/NotAuthorized.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Register from "./components/Register";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Nav>
                <h1>Wallet Contacts App</h1>
              </Nav>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Nav>
                  <Contacts />
                </Nav>
              </ProtectedRoute>
            }
          />
          <Route
            path="/balance"
            element={
              <Nav>
                <Balance />
              </Nav>
            }
          />
          <Route
            path="/login"
            element={
              <Nav>
                <Login />
              </Nav>
            }
          />
          <Route
            path="/register"
            element={
              <Nav>
                <Register />
              </Nav>
            }
          />
          <Route
            path="/not-autorized"
            element={
              <Nav>
                <NotAuthorized />
              </Nav>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
