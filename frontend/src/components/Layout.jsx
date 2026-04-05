import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import Navbar from './Navbar';
import UserDropdown from './UserDropdown';
import logoImage from './tu.jpg';
import './Layout.css';

const NETWORK_LABELS = {
  sepolia: 'Sepolia',
  mainnet: 'Ethereum',
  homestead: 'Ethereum',
  goerli: 'Goerli',
  hardhat: 'Hardhat',
  localhost: 'Localhost',
};

function getNetworkLabel(network, chainId) {
  if (network && NETWORK_LABELS[network]) return NETWORK_LABELS[network];
  if (chainId === 11155111) return 'Sepolia';
  if (chainId === 1) return 'Ethereum';
  if (chainId === 5) return 'Goerli';
  if (chainId === 31337 || chainId === 1337) return 'Hardhat';
  if (network) return network.charAt(0).toUpperCase() + network.slice(1);
  return '未知网络';
}

function formatNativeBalance(raw) {
  if (raw == null || raw === '') return '—';
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0 ETH';
  if (n < 0.0001) return '< 0.0001 ETH';
  return `${n.toFixed(4)} ETH`;
}

const Layout = ({ children }) => {
  const { user } = useAuth();
  const {
    account,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    network,
    chainId,
    nativeBalance,
  } = useWallet();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  };

  const networkLabel = getNetworkLabel(network, chainId);

  return (
    <div className="layout">
      <div className="layout-header">
        <div className="header-content">
          <div className="header-title">
            <img src={logoImage} alt="logo" className="header-logo" />
            <h1>校园 DAO 治理系统</h1>
          </div>
          <div className="user-info">
            {/* 钱包连接按钮 */}
            <div className="wallet-connect">
              {isConnected ? (
                <div className="wallet-card" title={account}>
                  <span className="wallet-network-pill" aria-label="当前网络">
                    <span className="wallet-network-dot" />
                    <span className="wallet-network-name">{networkLabel}</span>
                    {chainId != null && (
                      <span className="wallet-chain-id">#{chainId}</span>
                    )}
                  </span>
                  <span className="wallet-sep" aria-hidden>
                    ·
                  </span>
                  <span className="wallet-balance-value">{formatNativeBalance(nativeBalance)}</span>
                  <span className="wallet-sep" aria-hidden>
                    ·
                  </span>
                  <code className="wallet-address">{formatAddress(account)}</code>
                  <button
                    type="button"
                    className="wallet-disconnect-btn"
                    onClick={disconnect}
                    title="断开钱包"
                  >
                    <span className="wallet-disconnect-icon" aria-hidden>
                      ×
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="wallet-connect-btn"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    '连接中…'
                  ) : (
                    <>
                      <span className="wallet-connect-icon" aria-hidden>
                        ◈
                      </span>
                      连接钱包
                    </>
                  )}
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

