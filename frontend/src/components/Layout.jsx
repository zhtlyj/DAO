import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import UserDropdown from './UserDropdown';
import './Layout.css';

const Layout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="layout">
      <div className="layout-header">
        <div className="header-content">
          <h1>校园 DAO 治理系统</h1>
          <div className="user-info">
            <UserDropdown user={user} />
          </div>
        </div>
      </div>

      <Navbar />

      <div className="layout-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;

