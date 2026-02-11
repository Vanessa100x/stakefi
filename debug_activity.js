const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testActivityFeed() {
    console.log("--- Testing Activity Feed APIs ---");

    // 1. Create a Fake Attestation
    console.log("\n1. Testing POST /api/attestations...");
    try {
        const attestRes = await fetch(`${BASE_URL}/api/attestations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account 0
                to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",   // Hardhat Account 1
                score: 5,
                comment: "Debug script test attestation",
                txHash: "0x" + "1".repeat(64) // Fake hash
            })
        });
        const attestData = await attestRes.json();
        console.log("Status:", attestRes.status);
        console.log("Response:", attestData);
    } catch (e) {
        console.error("Attest Error:", e.message);
    }

    // 2. Create a Fake Stake
    console.log("\n2. Testing POST /api/stakes...");
    try {
        const stakeRes = await fetch(`${BASE_URL}/api/stakes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 1,
                userWallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                amount: "10.5",
                txHash: "0x" + "2".repeat(64) // Fake hash
            })
        });
        const stakeData = await stakeRes.json();
        console.log("Status:", stakeRes.status);
        console.log("Response:", stakeData);
    } catch (e) {
        console.error("Stake Error:", e.message);
    }

    // 3. Fetch Activity Feed (from new activity_logs table)
    console.log("\n3. Testing GET /api/activity...");
    try {
        const feedRes = await fetch(`${BASE_URL}/api/activity`);
        const feedData = await feedRes.json();
        console.log("Status:", feedRes.status);
        if (feedData.activity) {
            console.log("Activity Count:", feedData.activity.length);
            console.log("First Item:", feedData.activity[0]);
        } else {
            console.log("Response:", feedData);
        }
    } catch (e) {
        console.error("Feed Error:", e.message);
    }
}

testActivityFeed();
