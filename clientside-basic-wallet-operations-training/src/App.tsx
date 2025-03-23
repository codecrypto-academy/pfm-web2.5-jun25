import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Balance from "./components/Balance";
import Contacts from "./components/Contacts.tsx";
import Login from "./components/Login";
import NotAuthorized from "./components/NotAuthorized.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Register from "./components/Register";
import Layout from "./Layout.tsx";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <h1>Wallet Contacts App</h1>
              </Layout>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contacts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/balance"
            element={
              <Layout>
                <Balance />
              </Layout>
            }
          />
          <Route
            path="/login"
            element={
              <Layout>
                <Login />
              </Layout>
            }
          />
          <Route
            path="/register"
            element={
              <Layout>
                <Register />
              </Layout>
            }
          />
          <Route
            path="/not-autorized"
            element={
              <Layout>
                <NotAuthorized />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
