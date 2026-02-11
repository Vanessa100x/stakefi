import { ethers } from "ethers";

// Contract addresses (Sepolia)
export const ADDRESSES = {
    attestation: process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS || "0xbDa97d12b19F35e259992FCe3E1E517fA284decC",
    projectRegistry: process.env.NEXT_PUBLIC_PROJECT_REGISTRY_ADDRESS || "0x9ea1d45E8B0a7D906a5F94dc4AC10db03979C982",
    projectRewards: process.env.NEXT_PUBLIC_PROJECT_REWARDS_ADDRESS || "0x51b05676836e738742dD166dce159c8993148405",
};

// ABIs (minimal for frontend use)
export const ATTESTATION_ABI = [
    "function attest(address wallet, int8 score) external",
    "function revokeAttestation(address wallet) external",
    "function getAttestation(address from, address to) external view returns (int8)",
    "function hasAttestation(address from, address to) external view returns (bool)",
    "event AttestationCreated(address indexed from, address indexed to, int8 score, uint256 timestamp)",
    "event AttestationRevoked(address indexed from, address indexed to, uint256 timestamp)",
];

export const PROJECT_REGISTRY_ABI = [
    "function registerProject(address rewardToken, uint256 rewardAmount) external returns (uint256)",
    "function approveProject(uint256 projectId) external",
    "function getProject(uint256 projectId) external view returns (address owner, address rewardToken, uint256 rewardAmount, bool approved, bool rewardsDeposited)",
    "function isProjectApproved(uint256 projectId) external view returns (bool)",
    "function projectCount() external view returns (uint256)",
    "event ProjectRegistered(uint256 indexed projectId, address indexed owner, address rewardToken, uint256 rewardAmount)",
    "event ProjectApproved(uint256 indexed projectId, uint256 timestamp)",
];

export const PROJECT_REWARDS_ABI = [
    "function depositRewards(uint256 projectId, address rewardToken, uint256 amount, uint256 duration) external",
    "function stake(uint256 projectId) external payable",
    "function unstake(uint256 projectId) external",
    "function claimRewards(uint256 projectId) external",
    "function reclaimRewards(uint256 projectId) external",
    "function earned(uint256 projectId, address account) external view returns (uint256)",
    "function getUserStake(uint256 projectId, address account) external view returns (uint256 amount, uint256 pendingRewards)",
    "function getRewardPool(uint256 projectId) external view returns (address rewardToken, uint256 totalRewards, uint256 startTime, uint256 endTime, uint256 totalStaked, uint256 totalClaimed)",
    "event RewardsDeposited(uint256 indexed projectId, address rewardToken, uint256 amount, uint256 duration, uint256 startTime, uint256 endTime)",
    "event Staked(uint256 indexed projectId, address indexed user, uint256 amount)",
    "event Unstaked(uint256 indexed projectId, address indexed user, uint256 amount)",
    "event RewardsClaimed(uint256 indexed projectId, address indexed user, uint256 amount)",
];

// Get contract instances
export function getContracts(provider: ethers.BrowserProvider) {
    const signer = provider.getSigner();

    return {
        attestation: new ethers.Contract(ADDRESSES.attestation, ATTESTATION_ABI, provider),
        projectRegistry: new ethers.Contract(ADDRESSES.projectRegistry, PROJECT_REGISTRY_ABI, provider),
        projectRewards: new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, provider),
    };
}

export async function getSignedContracts(provider: ethers.BrowserProvider) {
    const signer = await provider.getSigner();

    return {
        attestation: new ethers.Contract(ADDRESSES.attestation, ATTESTATION_ABI, signer),
        projectRegistry: new ethers.Contract(ADDRESSES.projectRegistry, PROJECT_REGISTRY_ABI, signer),
        projectRewards: new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer),
    };
}
