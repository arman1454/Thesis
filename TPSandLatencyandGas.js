const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV');
const contractAbi = require('./ABI.json');
const privateKey = "0xf4491d77d82f082f6c0c2fb417ae315992c522f752f207fe427b0a7ce2aad932"; // Replace with your test private key
const contractAddress = '0xa3D40cDf17bc7fFE248B00CE59d5B11dd47321ca'; // Replace with your contract address
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

// Measurement period in seconds
const measurementPeriod = 60;

// Number of transactions to send
const numberOfTransactions = 10;

// Log results to a file
const fs = require('fs');
const logFile = 'logs.txt';

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
        fs.appendFileSync(logFile, `Average Latency: ${averageLatency}s\n`);
    }

    const latencies = [];
    const interval = measurementPeriod * 1000 / numberOfTransactions;
    let value = 1;

    // Test with different gas price multipliers
    const gasPriceMultipliers = [1, 2]; // 1x (default) and 2x gas prices
    
    for (const multiplier of gasPriceMultipliers) {
        console.log(`Running transactions with gas price multiplier: ${multiplier}`);

        // Parallel execution for sending transactions and measuring TPS
        const sendAndMeasure = async () => {
            let totalLatency = 0;
            for (let i = 0; i < numberOfTransactions; i++) {
                const latency = await executeTransaction(value, multiplier);
                if (latency !== null) {
                    totalLatency += latency;
                }
                await new Promise(resolve => setTimeout(resolve, interval));
                value++;
            }
            if (totalLatency > 0) {
                measureLatency(totalLatency, numberOfTransactions);
            }
        };

        // Run the transactions and TPS measurement concurrently
        await Promise.all([sendAndMeasure(), measureTPS()]);
    }

    // const averageLatency = totalLatency / numberOfTransactions;
    // console.log(`Average Latency: ${averageLatency}s`);

    // // Log latencies to file
    // fs.appendFileSync('latency_and_tps_logs.txt', `Latencies: ${latencies.join(', ')}\nAverage Latency: ${averageLatency}s\n`);
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
    console.log(`Throughput (TPS): ${tps}`);

    // Log TPS to file
    fs.appendFileSync(logFile, `Throughput (TPS): ${tps}\n`);
}

async function main() {
    // Run both functions in parallel
    await sendTransactions();
}

main().catch(console.error);