'use client';

import { useEffect, useState, useMemo } from 'react';
import { type Address, createWalletClient, parseUnits } from 'viem';
import { berachain } from 'viem/chains';
import { connectWallet } from '@/lib/connectWallet';
import { getTokens } from '@/lib/getTokens';
import { type Token, Intervals } from '@/types';
import IERC20 from '@/abi/IERC20.json';
import DCAStrategy from '@/abi/DCAStrategy.json';

export default function Home() {
    const intervalOptions = useMemo(
        () => [
            { label: 'Minute', value: Intervals.Minute },
            { label: 'Hour', value: Intervals.Hour },
            { label: 'Day', value: Intervals.Day },
            { label: 'Month', value: Intervals.Month }
        ],
        []
    );

    const [formData, setFormData] = useState({
        tokenIn: '',
        amount: 1, // Using a number can lead to precision issues — it's safer to use a string
        tokenOut: '',
        interval: 1,
        intervalType: intervalOptions[0].value,
        ordersAmount: 1
    });

    const [client, setClient] = useState<ReturnType<typeof createWalletClient>>();
    const [tokens, setTokens] = useState<Token[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        console.log({ name, value });
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (!client) return;

        await client.writeContract({
            address: formData.tokenIn as Address,
            account: client?.account?.address as Address,
            chain: berachain,
            abi: IERC20.abi,
            functionName: 'approve',
            args: [process.env.NEXT_PUBLIC_DCA_CONTRACT as Address, parseUnits(formData.amount.toString(), 18)]
        });

        await client.writeContract({
            address: process.env.NEXT_PUBLIC_DCA_CONTRACT as Address,
            account: client?.account?.address as Address,
            chain: berachain,
            abi: DCAStrategy.abi,
            functionName: 'depositTokens',
            args: [formData.tokenIn, parseUnits(formData.amount.toString(), 18)]
        });

        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...formData, wallet: client?.account?.address })
            });

            const result = await response.json();
            console.log('Server response:', result);
        } catch (err) {
            throw new Error(`Error while submitting the form ${err}`);
        }
    };

    const handleConnectWallet = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const client = await connectWallet(true);

        setClient(client);
    };

    useEffect(() => {
        const checkWallet = async () => {
            const client = await connectWallet();

            if (client) {
                setClient(client);
            }
        };

        const uploadTokens = async () => {
            const tokens = await getTokens();

            if (tokens) {
                setTokens(tokens);
                setFormData((prev) => ({ ...prev, tokenIn: tokens[0].address, tokenOut: tokens[1].address }));
            }
        };

        checkWallet();
        uploadTokens();
    }, []);

    return (
        <div className="grid place-items-center h-screen">
            <form className="bg-neutral-900 rounded w-[50%] p-10">
                <div className="flex justify-center items-center h-[50px]">
                    <label className="font-semibold w-[75px]" htmlFor="tokenIn">
                        Sell
                    </label>
                    <select
                        name="tokenIn"
                        value={formData.tokenIn}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 rounded-tr-none rounded-br-none text-md w-[175px] h-full"
                    >
                        {tokens.map((token: Token) => (
                            <option key={token.symbol} value={token.address}>
                                {token.symbol}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="0"
                        placeholder="$0"
                        id="tokenIn"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 rounded-tl-none rounded-bl-none text-md w-[300px] h-full"
                    />
                </div>

                <div className="flex justify-center items-center mt-5 h-[50px]">
                    <label className="font-semibold w-[75px]">Buy</label>
                    <select
                        name="tokenOut"
                        value={formData.tokenOut}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 text-md w-[475px] h-full"
                    >
                        {tokens.map((token: Token) => (
                            <option key={token.symbol} value={token.address}>
                                {token.symbol}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-center items-center mt-5 h-[50px]">
                    <label className="font-semibold w-[75px]" htmlFor="every">
                        Every
                    </label>
                    <input
                        type="number"
                        min="1"
                        placeholder="1"
                        id="every"
                        name="interval"
                        value={formData.interval}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 rounded-tr-none rounded-br-none text-md w-[300px] h-full"
                    />
                    <select
                        name="intervalType"
                        value={formData.intervalType}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 rounded-tl-none rounded-bl-none text-md w-[175px] h-full"
                    >
                        {intervalOptions.map(({ label, value }) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-center items-center mt-5 h-[50px]">
                    <label className="font-semibold w-[75px]" htmlFor="orders">
                        Over
                    </label>
                    <input
                        type="number"
                        min="1"
                        placeholder="1"
                        id="orders"
                        name="ordersAmount"
                        value={formData.ordersAmount}
                        onChange={handleInputChange}
                        className="outline-none rounded bg-neutral-800 p-2 text-md w-[400px] h-full"
                    />
                    <label className="w-[75px] text-right">Orders</label>
                </div>

                <div className="flex justify-center mt-5 h-[50px]">
                    <button
                        onClick={client?.account?.address ? handleSubmit : handleConnectWallet}
                        className="w-[550px] bg-amber-500/90 text-black rounded cursor-pointer hover:bg-amber-500/60 transition duration-500"
                    >
                        {client?.account?.address ? 'Swap' : 'Connect Wallet'}
                    </button>
                </div>
            </form>
        </div>
    );
}
