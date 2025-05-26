// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const DCAStrategyModule = buildModule('DCAStrategyModule', (m) => {
    const router = m.getParameter('router', '0xFd88aD4849BA0F729D6fF4bC27Ff948Ab1Ac3dE7');

    const DCAStrategy = m.contract('DCAStrategy', [router]);

    return { DCAStrategy };
});

export default DCAStrategyModule;
