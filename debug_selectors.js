const { ethers } = require("ethers");

function getSelectors() {
    const signatures = [
        "earned(uint256,address)",
        "getUserStake(uint256,address)",
        "getProject(uint256)",
        "attest(address,int8)",
        "hasAttestation(address,address)"
    ];

    signatures.forEach(sig => {
        const hash = ethers.id(sig).slice(0, 10);
        console.log(`${sig}: ${hash}`);
    });
}

getSelectors();
