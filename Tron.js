const TronWeb = require('tronweb');
const fs = require('fs');

// Set up TronWeb instance
const tronWeb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',  // Using Shasta testnet
    privateKey: 'YOUR_PRIVATE_KEY'  // Replace with your test private key
});

// Contract address and ABI
const contractAddress = 'YOUR_CONTRACT_ADDRESS';  // Replace with your contract address
const contractAbi = require('./ABI.json');  // Load the ABI

const contract = tronWeb.contract(contractAbi, contractAddress);

// Measurement period in seconds
const measurementPeriod = 60;

// Number of transactions to send
const numberOfTransactions = 10;

// Log results to a file
const logFile = 'tron_latency_logs.txt';

async function sendTransactions() {

    async function executeTransaction(val, energyLimit) {
        try {
            // Start time before sending the transaction
            const startTime = Date.now();

            // Send transaction with the specified energy limit
            const tx = await contract.methods.setval(val).send({
                feeLimit: 1000000000,
                callValue: 0,
                shouldPollResponse: true
            });

            // End time after the transaction is mined
            const endTime = Date.now();

            // Calculate latency in seconds
            const latency = (endTime - startTime) / 1000;
            console.log(`Transaction sent with energyLimit ${energyLimit}: ${tx}, Latency: ${latency}s`);

            // Log the result to the file
            fs.appendFileSync(logFile, `EnergyLimit: ${energyLimit}, Latency: ${latency}s\n`);

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
    let value = 23;

    // Test with different energy limits
    const energyLimits = [1000000, 2000000]; // Adjust according to Tron specifics

    for (const limit of energyLimits) {
        console.log(`Running transactions with energy limit: ${limit}`);

        // Parallel execution for sending transactions and measuring TPS
        const sendAndMeasure = async () => {
            let totalLatency = 0;
            for (let i = 0; i < numberOfTransactions; i++) {
                const latency = await executeTransaction(value, limit);
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
}

async function measureTPS() {
    const startBlock = await tronWeb.trx.getCurrentBlock();

    // Wait for the measurement period
    await new Promise(resolve => setTimeout(resolve, measurementPeriod * 1000));

    const endBlock = await tronWeb.trx.getCurrentBlock();
    let transactionCount = 0;

    for (let i = startBlock.blockID; i <= endBlock.blockID; i++) {
        const block = await tronWeb.trx.getBlock(i);
        transactionCount += block.transactions.filter(tx => tx.raw_data.contract[0].parameter.value.contract_address === contractAddress).length;
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
