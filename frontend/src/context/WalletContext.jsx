import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
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
  const [chainId, setChainId] = useState(null);
  const [nativeBalance, setNativeBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const refreshChainAndBalance = useCallback(async (browserProvider) => {
    if (!browserProvider || !account) {
      setChainId(null);
      setNativeBalance(null);
      return;
    }
    try {
      const net = await browserProvider.getNetwork();
      setChainId(Number(net.chainId));
      const nw = await getNetwork(browserProvider);
      setNetwork(nw);
      const bal = await browserProvider.getBalance(account);
      setNativeBalance(ethers.formatEther(bal));
    } catch (e) {
      console.warn('刷新链信息或余额失败:', e);
    }
  }, [account]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const newProvider = await connectWallet();
      const signer = await newProvider.getSigner();
      const address = await signer.getAddress();
      const currentNetwork = await getNetwork(newProvider);
      
      // 获取详细的网络信息
      const networkInfo = await newProvider.getNetwork();
      const numericChainId = Number(networkInfo.chainId);
      
      // 输出网络信息到控制台
      console.log('========== 钱包连接成功 ==========');
      console.log('账户地址:', address);
      console.log('网络名称:', currentNetwork);
      console.log('Chain ID:', numericChainId);
      console.log('Chain ID (Hex):', networkInfo.chainId.toString());
      console.log('网络信息:', {
        name: networkInfo.name,
        chainId: numericChainId,
        networkName: currentNetwork
      });
      console.log('==================================');

      const daoContract = await getDAOContract(newProvider, currentNetwork);

      setProvider(newProvider);
      setAccount(address);
      setContract(daoContract);
      setNetwork(currentNetwork);
      setChainId(numericChainId);
      try {
        const bal = await newProvider.getBalance(address);
        setNativeBalance(ethers.formatEther(bal));
      } catch {
        setNativeBalance(null);
      }
    } catch (err) {
      console.error('连接钱包失败:', err);
      setError(err.message || '连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setProvider(null);
      setContract(null);
      setNetwork(null);
      setChainId(null);
      setNativeBalance(null);
    } else {
      // 账户切换
      setAccount(accounts[0]);
      if (provider) {
        const newContract = await getDAOContract(provider, network || 'sepolia');
        setContract(newContract);
      }
    }
  };

  const handleChainChanged = async () => {
    window.location.reload();
  };

  useEffect(() => {
    if (!provider || !account) return;
    refreshChainAndBalance(provider);
    const id = setInterval(() => refreshChainAndBalance(provider), 20000);
    return () => clearInterval(id);
  }, [provider, account, refreshChainAndBalance]);

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
    setChainId(null);
    setNativeBalance(null);
    setError(null);
  };

  const value = {
    account,
    provider,
    contract,
    network,
    chainId,
    nativeBalance,
    isConnected: !!account && !!contract,
    isConnecting,
    error,
    connect: handleConnect,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

