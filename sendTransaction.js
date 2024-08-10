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

async function sendTransaction(val) {
    try {
        // Start time before sending the transaction
        const startTime = Date.now();

        // Send transaction
        const tx = await contract.setval(val);
        console.log("Transaction sent:", tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();

        // End time after the transaction is mined
        const endTime = Date.now();

        // Calculate latency in seconds
        const latency = (endTime - startTime) / 1000;
        console.log(`Transaction mined: ${receipt.transactionHash}, Latency: ${latency}s`);

        return latency;
    } catch (error) {
        console.error("Error executing function:", error);
        return null;
    }
}

function measureLatency(totalLatency, numOfTransactions) {
    const averageLatency = totalLatency / numOfTransactions;
    console.log(`Average Latency: ${averageLatency}s`);
}

async function main() {
    const numberOfTransactions = 10;
    const interval = 60 * 1000 / numberOfTransactions;
    let value = 23;
    let totalLatency = 0;
    const latencies = [];

    for (let i = 0; i < numberOfTransactions; i++) {
        const latency = await sendTransaction(value);
        if (latency !== null) {
            latencies.push(latency);
            totalLatency += latency;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        value++;
    }

    console.log(`Latencies: ${latencies}`);

    if (latencies.length > 0) {
        measureLatency(totalLatency, latencies.length);
    } else {
        console.log('No valid latency measurements recorded.');
    }
}

main().catch(console.error);
