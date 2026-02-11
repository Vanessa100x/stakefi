import { ethers } from "ethers";

const symbolCache: Record<string, string> = {};
const pendingRequests: Record<string, Promise<string> | undefined> = {};

/**
 * Fetches and caches the symbol for a given ERC20 token address.
 */
export async function getTokenSymbol(
    tokenAddress: string,
    provider: ethers.Provider
): Promise<string> {
    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) return "ETH";

    const normalizedAddress = tokenAddress.toLowerCase();

    // Check if we have the result
    if (symbolCache[normalizedAddress]) {
        return symbolCache[normalizedAddress];
    }

    // Check if a request is already in progress
    if (pendingRequests[normalizedAddress]) {
        return pendingRequests[normalizedAddress];
    }

    // Start a new request and cache the promise
    const promise = (async () => {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                ["function symbol() view returns (string)"],
                provider
            );
            const symbol = await tokenContract.symbol();
            symbolCache[normalizedAddress] = symbol;
            return symbol;
        } catch (error) {
            console.error(`Error fetching symbol for ${tokenAddress}:`, error);
            return "TOKEN"; // Fallback
        } finally {
            delete pendingRequests[normalizedAddress];
        }
    })();

    pendingRequests[normalizedAddress] = promise;
    return promise;
}
