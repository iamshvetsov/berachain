import { NextRequest, NextResponse } from 'next/server';
import { type Address, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { berachain } from 'viem/chains';
import { getSwapQuote } from '@/lib/getSwapQuote';
import DCAStrategy from '@/abi/DCAStrategy.json';

const account = privateKeyToAccount(`0x${process.env.NEXT_PUBLIC_PRIVATE_KEY}`);

const client = createWalletClient({
    account,
    chain: berachain,
    transport: http('https://rpc.berachain.com/')
});

export async function POST(req: NextRequest) {
    const data = await req.json();
    const { tokenIn, amount, tokenOut, interval, intervalType, ordersAmount, wallet } = data;

    const { status, routerParams } = await getSwapQuote({ tokenIn, tokenOut, amount, to: wallet });

    if (status === 'Success') {
        await client.writeContract({
            address: process.env.NEXT_PUBLIC_DCA_CONTRACT as Address,
            chain: berachain,
            abi: DCAStrategy.abi,
            functionName: 'createStrategy',
            args: [
                wallet as Address,
                tokenIn as Address,
                tokenOut as Address,
                BigInt(Math.floor(amount / ordersAmount)), // It's better to calculate the remainder and add it to one of the orders
                BigInt(interval * intervalType),
                BigInt(ordersAmount)
            ]
        });

        // need to call executeSwap via Gelato or Chainlink
        const txHash = await client.writeContract({
            address: process.env.NEXT_PUBLIC_DCA_CONTRACT as Address,
            abi: DCAStrategy.abi,
            functionName: 'executeSwap',
            args: [
                wallet as Address,
                0n,
                routerParams.pathDefinition,
                BigInt(routerParams.swapTokenInfo.outputQuote),
                BigInt(routerParams.swapTokenInfo.outputMin),
                BigInt(routerParams.referralCode)
            ]
        });

        return NextResponse.json(txHash);
    } else throw new Error('There is no way');
}
