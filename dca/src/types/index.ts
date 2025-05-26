import { type Address } from 'viem';

export enum Intervals {
    Minute = 1,
    Hour = 60,
    Day = 1440,
    Month = 43200
}

export type Token = {
    address: Address;
    decimals: number;
    name: string;
    symbol: string;
    tokenURI: string;
};

export type SwapParams = {
    tokenIn: Address;
    amount: bigint;
    tokenOut: Address;
    to: Address;
    slippage: number;
};
