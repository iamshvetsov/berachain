import { createWalletClient, custom } from 'viem';
import { berachain } from 'viem/chains';

export const connectWallet = async (requestAccess = false): Promise<ReturnType<typeof createWalletClient>> => {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
    }

    const method = requestAccess ? 'eth_requestAccounts' : 'eth_accounts';
    const accounts = await window.ethereum.request({ method });

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts returned');
    }

    const client = createWalletClient({
        account: accounts[0],
        chain: berachain,
        transport: custom(window.ethereum)
    });

    return client;
};
