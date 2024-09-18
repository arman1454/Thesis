const TronWeb = require('tronweb');
require('dotenv').config();
const tronWeb = new TronWeb({
    fullHost: process.env.Shasta_Connect,
    privateKey: process.env.Tron_WalletA_PrivateKey
});

const wallet = process.env.Tron_WalletA_Address;
async function checkResources() {
    try{
    const accountResources = await tronWeb.trx.getAccountResources(wallet);

    const remainingEnergy = accountResources.EnergyLimit - (accountResources.EnergyUsed||0);
    const remainingBandwidth = accountResources.freeNetLimit - (accountResources.freeNetUsed || 0);

    console.log(`Remaining Energy: ${remainingEnergy}`);
    console.log(`Remaining Bandwidth: ${remainingBandwidth}`);
    console.log(`Maximum Energy: ${accountResources.EnergyLimit}`);
    console.log(`Maximum Bandwidth: ${accountResources.freeNetLimit}`);
} catch (error) {
    console.error("Error fetching resources:", error);
}
}

checkResources().catch(console.error);
