type SwapQuoteParams = {
    tokenIn: string;
    amount: number;
    tokenOut: string;
    to: string;
};

const SLIPPAGE = 0.01;

export const getSwapQuote = async ({ tokenIn, tokenOut, amount, to }: SwapQuoteParams): Promise<any> => {
    try {
        const publicApiUrl = new URL(`${process.env.NEXT_PUBLIC_PUBLIC_API_URL}/swap`);
        publicApiUrl.searchParams.set('tokenIn', tokenIn);
        publicApiUrl.searchParams.set('amount', amount.toString());
        publicApiUrl.searchParams.set('tokenOut', tokenOut);
        publicApiUrl.searchParams.set('to', to);
        publicApiUrl.searchParams.set('slippage', SLIPPAGE.toString());

        const res = await fetch(publicApiUrl, {
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
            }
        });

        return res.json();
    } catch {
        throw new Error('Failed to fetch');
    }
};
