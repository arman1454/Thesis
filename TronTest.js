const TronWeb = require('tronweb');
const pidusage = require('pidusage'); // For CPU and memory monitoring
const fs = require('fs');
const contractAbi = require('./TronABI.json');
require('dotenv').config();

// Initialize TronWeb instances for both wallets
const tronWebA = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.Tron_WalletA_PrivateKey
});

const tronWebB = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.Tron_WalletB_PrivateKey
});
const contractAddress = process.env.Shasta_Deployed;
const contractInstanceA = tronWebA.contract(contractAbi, contractAddress);
const contractInstanceB = tronWebB.contract(contractAbi, contractAddress);

const measurementPeriod = 60;
const numberOfTransactions = 4;
const logFile = 'Tron_logs_individual.txt';
const tpsAndLatencyLog = 'Tron_TPS&AvgLatency_log.txt';
const WalletResourceUsage = 'WalletResourceUsage.txt';
const resourceUsageLog = 'Tron_Resource_Usage.txt'; // New log for CPU/Memory usage

async function getEnergyAndTRXBalance(tronWeb) {
    try {
        const address = tronWeb.defaultAddress.base58;

        // Fetch account resources to get energy
        const accountResources = await tronWeb.trx.getAccountResources(address);
        const energy = (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0);
        const bandwidth = accountResources.freeNetLimit - (accountResources.freeNetUsed || 0);

        // Fetch TRX balance
        const trxBalance = await tronWeb.trx.getBalance(address);
        const trxBalanceInTRX = trxBalance / 1e6; // Convert from sun to TRX

        return { energy, bandwidth, trxBalance: trxBalanceInTRX };
    } catch (error) {
        console.error('Error fetching energy and TRX balance:', error);
        return { energy: 0, trxBalance: 0 };
    }
}

// Function to fetch transaction information using the transaction hash
async function fetchTransactionInfo(tronWeb, transactionID) {
    try {
        const transaction = await tronWeb.trx.getTransactionInfo(transactionID);
        const energyUsed = transaction.receipt.energy_usage_total || 0;
        const trxUsed = (transaction.fee || 0) / 1e6; // Convert from sun to TRX
        const bandwidthUsed = (transaction.net_fee || 0) / 1e3;
        return { energyUsed, bandwidthUsed, trxUsed };
    } catch (error) {
        console.error('Error fetching transaction info:', error);
        return { energyUsed: 0, trxUsed: 0 };
    }
}

// Function to track wallet resource consumption
async function WalletResourceConsumption(walletName, txIds, tronWeb, initialEnergy, initialBandwidth, initialBalance) {
    let currentEnergy = initialEnergy;
    let currentBandwidth = initialBandwidth
    let currentBalance = initialBalance;
    console.log(`${walletName} Initial Balances - Energy: ${currentEnergy}, BandWidth:${currentBandwidth}, TRX: ${currentBalance}`);
    fs.appendFileSync(WalletResourceUsage, `${walletName} Initial Balances - Energy: ${currentEnergy}, BandWidth:${currentBandwidth}, TRX: ${currentBalance}\n`);
    const trxRates = []
    for (let i = 0; i < txIds.length; i++) {
        const transactionInfo = await fetchTransactionInfo(tronWeb, txIds[i]);
        currentBalance = currentBalance - transactionInfo.trxUsed;
        if (currentEnergy - transactionInfo.energyUsed > 0) {
            currentEnergy = currentEnergy - transactionInfo.energyUsed;
            console.log(`Transaction ${i + 1}: TRX Used: ${transactionInfo.trxUsed}, Energy Used: ${transactionInfo.energyUsed}, Balance: ${currentBalance}, Energy:${currentEnergy}`);
            fs.appendFileSync(WalletResourceUsage, `Transaction ${i + 1}: TRX Used: ${transactionInfo.trxUsed}, Energy Used: ${transactionInfo.energyUsed}, Balance: ${currentBalance},Energy:${currentEnergy}\n`);
            const obj = {
                trxUsed: transactionInfo.trxUsed,
                energyUsed: transactionInfo.energyUsed
            }
            trxRates.push(obj)
        }
        else {
            console.log(`Transaction ${i + 1}: TRX Used: ${transactionInfo.trxUsed}, Energy Used: ${currentEnergy}, Balance: ${currentBalance}, Energy:0`);
            fs.appendFileSync(WalletResourceUsage, `Transaction ${i + 1}: TRX Used: ${transactionInfo.trxUsed}, Energy Used: ${currentEnergy}, Balance: ${currentBalance}, Energy:0\n`);
            const obj = {
                trxUsed: transactionInfo.trxUsed,
                energyUsed: currentEnergy
            }
            trxRates.push(obj)
        }

    }

    console.log(trxRates);

}

// Function to send transaction and measure system resource usage
async function sendTransaction(contract, val, walletName) {
    try {
        const beforeStats = await pidusage(process.pid) // Capture CPU/Memory before the transaction

        const startTime = Date.now();
        const tx = await contract.methods.setval(val).send();
        console.log(`Transaction sent from ${walletName}:`, tx);

        const endTime = Date.now();
        const latency = (endTime - startTime) / 1000;
        console.log(`Transaction confirmed from ${walletName}: ${tx}, Latency: ${latency}s`);

        const afterStats = await pidusage(process.pid) // Capture CPU/Memory after the transaction

        // Calculate CPU and memory usage differences
        const cpuUsage = (afterStats.cpu - beforeStats.cpu).toFixed(2);
        const memoryUsage = ((afterStats.memory - beforeStats.memory) / 1024 / 1024).toFixed(2); // Convert memory to MB

        console.log(`CPU used: ${cpuUsage}%, Memory used: ${memoryUsage} MB for this transaction`);
        fs.appendFileSync(resourceUsageLog, `Transaction ${tx} - CPU Used: ${cpuUsage}%, Memory Used: ${memoryUsage} MB\n`);

        // Log latency
        fs.appendFileSync(logFile, `Transaction confirmed from ${walletName}: ${tx}, Latency: ${latency}s\n`);

        return { latency, tx };
    } catch (error) {
        console.error(`Error executing transaction from ${walletName}:`, error);
        return null;
    }
}

// Function to measure average latency
function measureLatency(totalLatency, numOfTransactions, walletName) {
    const averageLatency = totalLatency / numOfTransactions;
    console.log(`Average Latency for ${walletName}: ${averageLatency}s`);
    fs.appendFileSync(tpsAndLatencyLog, `Average Latency for ${walletName}: ${averageLatency}s\n`);
}

// Function to measure throughput (TPS)
async function measureThroughput(tronWeb, walletName) {
    try {
        const startBlock = await tronWeb.trx.getCurrentBlock();
        const startBlockNum = startBlock.block_header.raw_data.number;

        await new Promise(resolve => setTimeout(resolve, measurementPeriod * 1000));

        const endBlock = await tronWeb.trx.getCurrentBlock();
        const endBlockNum = endBlock.block_header.raw_data.number;

        let transactionCount = 0;

        for (let i = startBlockNum; i <= endBlockNum; i++) {
            const block = await tronWeb.trx.getBlock(i);

            if (block.transactions && block.transactions.length > 0) {
                block.transactions.forEach(tx => {
                    if (tx.raw_data.contract[0].parameter.value.contract_address === tronWeb.address.toHex(contractAddress)) {
                        transactionCount++;
                    }
                });
            }
        }

        const tps = transactionCount / measurementPeriod;
        console.log(`Throughput (TPS) for ${walletName}: ${tps}`);
        fs.appendFileSync(tpsAndLatencyLog, `Throughput (TPS) for ${walletName}: ${tps}\n`);
    } catch (error) {
        console.error(`Error measuring throughput for ${walletName}:`, error);
    }
}

async function main() {
    const wallets = [
        { tronWeb: tronWebA, contract: contractInstanceA, name: 'Wallet A (Energy-Paying)', txIds: [], energy: 0, bandwidth: 0, trxBalance: 0 },
        { tronWeb: tronWebB, contract: contractInstanceB, name: 'Wallet B (TRX-Paying)', txIds: [], energy: 0, bandwidth: 0, trxBalance: 0 },
    ];

    for (const wallet of wallets) {
        fs.appendFileSync(logFile, `\nTesting transactions from ${wallet.name}\n`);
        let totalLatency = 0;
        const { energy, bandwidth, trxBalance } = await getEnergyAndTRXBalance(wallet.tronWeb);
        wallet.energy = energy;
        wallet.bandwidth = bandwidth;
        wallet.trxBalance = trxBalance;

        const sendAndMeasure = async () => {
            let value = 44;
            for (let i = 0; i < numberOfTransactions; i++) {
                const { latency, tx } = await sendTransaction(wallet.contract, value, wallet.name);
                if (latency !== null) {
                    totalLatency += latency;
                }
                wallet.txIds.push(tx);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second interval between transactions
                value++;
            }
            if (totalLatency > 0) {
                measureLatency(totalLatency, numberOfTransactions, wallet.name);
            }
        };

        await Promise.all([sendAndMeasure(), measureThroughput(wallet.tronWeb, wallet.name)]);
    }

    await new Promise(resolve => setTimeout(resolve, 4000)); // Just waiting for 4 seconds

    for (const wallet of wallets) {
        await WalletResourceConsumption(wallet.name, wallet.txIds, wallet.tronWeb, wallet.energy, wallet.bandwidth, wallet.trxBalance);
    }
}

main().catch(console.error);
