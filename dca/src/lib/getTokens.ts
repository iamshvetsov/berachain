import { type Token } from '@/types';

export const getTokens = async (): Promise<Token[]> => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_PUBLIC_API_URL}/tokens`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
            }
        });

        return res.json();
    } catch {
        throw new Error('Failed to fetch');
    }
};
