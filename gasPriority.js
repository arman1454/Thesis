const { ethers } = require('ethers');
const contractAbi = require('./ABI.json');

// Connect to the Sepolia network
const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/j8pR71uR77igUWtSTwIBPBe2WBaQRxuV');

// Your wallet private key (Use a test account, never share private keys of real accounts)
const privateKey = "0xf4491d77d82f082f6c0c2fb417ae315992c522f752f207fe427b0a7ce2aad932"

// Address of your smart contract
const contractAddress = '0xa3D40cDf17bc7fFE248B00CE59d5B11dd47321ca';

// Create a wallet instance
const wallet = new ethers.Wallet(privateKey, provider);


// Create a contract instance
const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

async function sendTransaction(val,gasPrice) {
    try {
        // Function Call: Execute the function by calling it on the contract object and handling the transaction response and receipt.
        console.time("Default Gas Price Transaction");
        const tx = await contract.setval(val,{gasPrice});
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.timeEnd("Default Gas Price Transaction");
        console.log("Mined:", receipt.transactionHash);

        console.time("Manual Gas Price Transaction");
        const tx2 = await contract.setval(val+1);
        console.log("Transaction sent:", tx2.hash);
        const receipt2 = await tx.wait();
        console.timeEnd("Manual Gas Price Transaction");
        console.log("Mined:", receipt2.transactionHash);
    } catch (error) {
        console.error("Error executing function:", error);
    }
}

//to get the currect updated value of the contract
async function getValue() {
    const value = await contract.x()
    console.log(value.toString());
}


async function main() {
    // Number of transactions to send within 60 seconds
    // const numberOfTransactions = 10;
    // const interval = 60 * 1000 / numberOfTransactions;

    // let totalLatency = 0
    // const latencies = []
    // for (let i = 0; i < numberOfTransactions; i++) {
    //     sendTransaction(value);
    //     await new Promise(resolve => setTimeout(resolve, interval));
    //     value++;
    // }
    const gasPrice = ethers.utils.parseUnits('40', 'gwei'); 
    const gasPriceDefault = await provider.getGasPrice();
    console.log(`Current Gas Price: ${ethers.utils.formatUnits(gasPriceDefault, 'gwei')} Gwei`);
    let value = 12;
    // sendTransaction(value,gasPrice);
    getValue()
}

main().catch(console.error);