import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = null }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roleAllowed = () => {
    if (!requiredRole && !allowedRoles) return true;
    if (requiredRole) return user?.role === requiredRole;
    if (Array.isArray(allowedRoles)) return allowedRoles.includes(user?.role);
    return true;
  };

  if (!roleAllowed()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

