"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <PrivyProvider
                appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
                config={{
                    appearance: {
                        theme: "dark", // We can keep Privy dark or dynamically update it later if needed
                        accentColor: "#00ff88",
                        logo: "/logo.svg",
                    },
                    loginMethods: ["wallet", "email"],
                    embeddedWallets: {
                        ethereum: {
                            createOnLogin: "users-without-wallets",
                        },
                    },
                    defaultChain: {
                        id: 11155111, // Sepolia
                        name: "Sepolia",
                        network: "sepolia",
                        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                        rpcUrls: {
                            default: {
                                http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/"],
                            },
                        },
                        blockExplorers: {
                            default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
                        },
                    },
                    supportedChains: [
                        {
                            id: 11155111,
                            name: "Sepolia",
                            network: "sepolia",
                            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                            rpcUrls: {
                                default: {
                                    http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/"],
                                },
                            },
                            blockExplorers: {
                                default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
                            },
                        },
                    ],
                }}
            >
                {children}
            </PrivyProvider>
        </ThemeProvider>
    );
}
