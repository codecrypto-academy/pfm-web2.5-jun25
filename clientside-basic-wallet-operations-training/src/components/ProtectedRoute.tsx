import * as React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
    children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {

    const [userId, setUserId] = useState<string | undefined>();

    useEffect(() => {
        const userId = window.localStorage.getItem("user") ?? '';
        setUserId(userId);
    }, [userId]);

    if (userId !== undefined && !userId) {
        return <Navigate to="/not-autorized" replace />;
    }

    return children;
};

export default ProtectedRoute;