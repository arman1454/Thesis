//https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV
// priv - 0xf4491d77d82f082f6c0c2fb417ae315992c522f752f207fe427b0a7ce2aad932


const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV');

const WalletAddress = '0xE79659315Fdc076Eaa954b3C37ee49EF9B5D01e1';

async function checkBalance() {
    const balance = await provider.getBalance(WalletAddress);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
}

checkBalance();
