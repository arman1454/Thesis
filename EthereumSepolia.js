const { ethers } = require('ethers');
require('dotenv').config();
// const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/b88ece4a38fe403d9f873ab378243eae');
const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_CONNECT);
const contractAbi = require('./EthereumABI.json');
const privateKey = process.env.PRIVATE_KEY; 
const contractAddress = process.env.SEPOLIA_DEPLOYED; 
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, contractAbi, wallet);


// Address: 0x48B5B6435f773e5a4Dc02de1d7f5850ec7f3e7B7
// Private Key: 0xec72f1d9f20d8056902d301da1ff8d08029adf05420bf97c485162e9c3244ccd
// Measurement period in seconds
const measurementPeriod = 60;

// Number of transactions to send
const numberOfTransactions = 10;

// Log results to files
const fs = require('fs');
const logFile = 'Ethereum_logs_individual.txt';
const tpsAndLatencyLog = 'Eth_TPS&AvgLatency_log.txt';

async function sendTransactions() {
    async function executeTransaction(val, gasPriceMultiplier) {
        try {
            // Fetch the current gas price and multiply
            const baseGasPrice = await provider.getGasPrice();
            const gasPrice = baseGasPrice.mul(gasPriceMultiplier);

            // Start time before sending the transaction
            const startTime = Date.now();

            // Send transaction with the specified gas price
            const tx = await contract.setval(val, { gasPrice });
            console.log(`Transaction sent with gasPrice ${gasPrice.toString()}:`, tx.hash);

            // Wait for transaction to be mined
            const receipt = await tx.wait();

            // End time after the transaction is mined
            const endTime = Date.now();

            // Calculate latency in seconds
            const latency = (endTime - startTime) / 1000;
            console.log(`Transaction mined: ${receipt.transactionHash}, Latency: ${latency}s`);

            // Log the result to the file
            fs.appendFileSync(logFile, `GasPrice: ${gasPrice.toString()}, Latency: ${latency}s\n`);

            return latency;
        } catch (error) {
            console.error("Error executing function:", error);
            return null;
        }
    }

    function measureLatency(totalLatency, numOfTransactions) {
        const averageLatency = totalLatency / numOfTransactions;
        console.log(`Average Latency: ${averageLatency}s`);
        // Log average latency
        fs.appendFileSync(tpsAndLatencyLog, `Average Latency: ${averageLatency}s\n`);
    }

    // Test with different gas price multipliers
    const gasPriceMultipliers = [1, 2]; // 1x (default) and 2x gas prices
    const latencies = [];
    const interval = measurementPeriod * 1000 / numberOfTransactions;
    let value = 40;

    for (const multiplier of gasPriceMultipliers) {
        // Add header for the current gas price multiplier
        const header = multiplier === 1 ? 'Default gas Price\n' : `${multiplier}x the default gas Price\n`;
        fs.appendFileSync(logFile, `${header}`);
        fs.appendFileSync(tpsAndLatencyLog, `${header}`);

        // Parallel execution for sending transactions and measuring TPS
        const sendAndMeasure = async () => {
            let totalLatency = 0;
            for (let i = 0; i < numberOfTransactions; i++) {
                const latency = await executeTransaction(value, multiplier);
                if (latency !== null) {
                    totalLatency += latency;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                value++;
            }
            if (totalLatency > 0) {
                measureLatency(totalLatency, numberOfTransactions);
            }
        };

        // Run the transactions and TPS measurement concurrently
        await Promise.all([sendAndMeasure(), measureTPS()]);
    }
}

async function measureTPS() {
    const startBlockNumber = await provider.getBlockNumber();

    // Wait for the measurement period
    await new Promise(resolve => setTimeout(resolve, measurementPeriod * 1000));

    const endBlockNumber = await provider.getBlockNumber();
    let transactionCount = 0;

    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        const block = await provider.getBlockWithTransactions(i);
        transactionCount += block.transactions.filter(tx => tx.to === contractAddress).length;
    }

    const tps = transactionCount / measurementPeriod;
    const timestamp = new Date().toISOString();
    console.log(`Throughput (TPS): ${tps} at ${timestamp}`);

    // Log TPS and timestamp to file
    fs.appendFileSync(tpsAndLatencyLog, `Throughput (TPS): ${tps} at ${timestamp}\n`);
}

async function main() {
    // Run both functions in parallel
    await sendTransactions();
}

main().catch(console.error);
