import { Navigate, Outlet, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  roles: string[];
  exp: number;
}

interface ProtectedRouteProps {
  requiredRole?: string;
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    // Redirect to login, saving the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  try {
    const decoded: TokenPayload = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Check Token Expiry
    if (decoded.exp < currentTime) {
      localStorage.removeItem("access_token");
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check Role Access (if a specific role is required)
    if (requiredRole && !decoded.roles.includes(requiredRole)) {
      // User is logged in but doesn't have permission (e.g. Business User trying to access Admin)
      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  } catch (error) {
    // Invalid token
    localStorage.removeItem("access_token");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
};

export default ProtectedRoute;