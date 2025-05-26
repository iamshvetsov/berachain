import * as dotenv from 'dotenv';
dotenv.config();

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
    solidity: '0.8.28',
    networks: {
        berachain: {
            url: 'https://rpc.berachain.com/',
            chainId: 80094,
            accounts: [process.env.PRIVATE_KEY!]
        }
    }
};

export default config;
