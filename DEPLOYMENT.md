# Deployment Guide - StakeFi

This guide details how to deploy your StakeFi frontend to [Vercel](https://vercel.com).

## Prerequisites
1.  **GitHub Repository**: Push your code to a GitHub repository.
2.  **Vercel Account**: [Sign up](https://vercel.com/signup) if you haven't already.

## Environment Variables
You must add the following environment variables to your Vercel project settings.

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anonymous Key (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key (secret, for API routes). |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | RPC URL for Sepolia (e.g., from Alchemy or Infura). |
| `NEXT_PUBLIC_ATTESTATION_ADDRESS` | Deployed Attestation Contract Address. |
| `NEXT_PUBLIC_PROJECT_REGISTRY_ADDRESS` | Deployed Project Registry Contract Address. |
| `NEXT_PUBLIC_PROJECT_REWARDS_ADDRESS` | Deployed Project Rewards Contract Address. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy App ID (if using Privy). |

> [!WARNING]
> **Never commit your `.env.local` file to GitHub.** It contains secrets.

## Deployment Steps

1.  **Login to Vercel**: Go to your dashboard.
2.  **Add New Project**: Click "Add New..." -> "Project".
3.  **Import Repository**: Select your `stakefi` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Next.js (should be auto-detected).
    *   **Root Directory**: `frontend` (if your `package.json` is in a subfolder, otherwise leave as `./`).
    *   **Environment Variables**: Expand this section and copy-paste your variables.
5.  **Deploy**: Click "Deploy".

Vercel will build your application. Once complete, you will get a live URL (e.g., `stakefi.vercel.app`).

## Verification
After deployment:
1.  **Check Logs**: Go to the "Logs" tab in Vercel to ensure no build errors.
2.  **Test Login**: Verify that Privy login works (you might need to add your Vercel domain to "Allowed Domains" in Privy dashboard).
3.  **Test APIs**: Check if the Activity Feed loads (tests connection to Supabase).
