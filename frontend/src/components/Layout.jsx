import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import Navbar from './Navbar';
import UserDropdown from './UserDropdown';
import './Layout.css';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const { account, isConnected, isConnecting, connect, disconnect, error } = useWallet();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="layout">
      <div className="layout-header">
        <div className="header-content">
          <h1>校园 DAO 治理系统</h1>
          <div className="user-info">
            {/* 钱包连接按钮 */}
            <div className="wallet-connect">
              {isConnected ? (
                <div className="wallet-connected">
                  <span className="wallet-icon">🔗</span>
                  <span className="wallet-address">{formatAddress(account)}</span>
                  <button className="wallet-disconnect-btn" onClick={disconnect} title="断开连接">
                    ✕
                  </button>
                </div>
              ) : (
                <button 
                  className="wallet-connect-btn" 
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? '连接中...' : '🔗 连接钱包'}
                </button>
              )}
              {error && <span className="wallet-error">{error}</span>}
            </div>
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

