const { ethers } = require('ethers');

// Connect to the Sepolia network
const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV');

// Address of your smart contract
const contractAddress = '0xa3D40cDf17bc7fFE248B00CE59d5B11dd47321ca';

// Time period for measurement (in seconds)
const measurementPeriod = 60;

async function measureThroughput() {
    // Get the current block number
    const startBlockNumber = await provider.getBlockNumber();

    // Wait for the measurement period
    await new Promise(resolve => setTimeout(resolve, measurementPeriod * 1000));

    // Get the block number after the measurement period
    const endBlockNumber = await provider.getBlockNumber();

    console.log(startBlockNumber);
    console.log(endBlockNumber);
    let transactionCount = 0;
    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        const block = await provider.getBlockWithTransactions(i);
        transactionCount += block.transactions.filter(tx => tx.to === contractAddress).length;
    }

    // Calculate TPS
    const tps = transactionCount / measurementPeriod;
    console.log(`Throughput (TPS): ${tps}`);
}

measureThroughput().catch(console.error);
