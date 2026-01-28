import { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, isWalletConnected, getDAOContract, getNetwork } from '../utils/contract';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const newProvider = await connectWallet();
      const signer = await newProvider.getSigner();
      const address = await signer.getAddress();
      const currentNetwork = await getNetwork(newProvider);

      const daoContract = await getDAOContract(newProvider, currentNetwork);

      setProvider(newProvider);
      setAccount(address);
      setContract(daoContract);
      setNetwork(currentNetwork);
    } catch (err) {
      console.error('连接钱包失败:', err);
      setError(err.message || '连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // 用户断开连接
      setAccount(null);
      setProvider(null);
      setContract(null);
    } else {
      // 账户切换
      setAccount(accounts[0]);
      if (provider) {
        const newContract = await getDAOContract(provider, network || 'hardhat');
        setContract(newContract);
      }
    }
  };

  const handleChainChanged = async (chainId) => {
    // 网络切换，重新连接
    window.location.reload();
  };

  // 检查是否已连接钱包
  useEffect(() => {
    const checkConnection = async () => {
      if (isWalletConnected()) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await handleConnect();
          }
        } catch (err) {
          console.error('检查钱包连接失败:', err);
        }
      }
    };

    checkConnection();

    // 监听账户变化
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setNetwork(null);
    setError(null);
  };

  const value = {
    account,
    provider,
    contract,
    network,
    isConnected: !!account && !!contract,
    isConnecting,
    error,
    connect: handleConnect,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

