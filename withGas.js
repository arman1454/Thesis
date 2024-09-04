const { ethers } = require('ethers');
const contractAbi = require('./ABI.json');

// Connect to the Sepolia network
const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV');

// Your wallet private key (Use a test account, never share private keys of real accounts)
const privateKey = "0xf4491d77d82f082f6c0c2fb417ae315992c522f752f207fe427b0a7ce2aad932";

// Address of your smart contract
const contractAddress = '0xa3D40cDf17bc7fFE248B00CE59d5B11dd47321ca';

// Create a wallet instance
const wallet = new ethers.Wallet(privateKey, provider);

// Create a contract instance
const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

// Log results to a file
const fs = require('fs');
const logFile = 'latency_logs.txt';

async function sendTransaction(val, gasPriceMultiplier) {
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

async function main() {
    const numberOfTransactions = 10;
    const interval = 60 * 1000 / numberOfTransactions;
    let value = 23;

    // Test with different gas price multipliers
    const gasPriceMultipliers = [1, 2]; // 1x (default) and 2x gas prices

    for (const multiplier of gasPriceMultipliers) {
        let totalLatency = 0;
        console.log(`Running transactions with gas price multiplier: ${multiplier}`);

        for (let i = 0; i < numberOfTransactions; i++) {
            const latency = await sendTransaction(value, multiplier);
            if (latency !== null) {
                totalLatency += latency;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
            value++;
        }

        if (totalLatency > 0) {
            measureLatency(totalLatency, numberOfTransactions);
        }
    }
}

main().catch(console.error);
