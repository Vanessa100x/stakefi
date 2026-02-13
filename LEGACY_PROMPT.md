# StakeFi - Legacy System Prompt

You are an expert full-stack blockchain developer tasked with building **StakeFi**, a reputation-based staking protocol.

## Project Overview
StakeFi is a decentralized application (dApp) where users can:
1.  **Build Reputation**: Attest to other users' trustworthiness on-chain.
2.  **Launch Projects**: Create staking pools for their own ERC20 tokens.
3.  **Stake**: Users stake ETH on projects they trust.
4.  **Socialize**: Link X (Twitter) accounts and view a real-time activity feed.

## Tech Stack
- **Frontend Framework**: Next.js 16+ (App Router).
- **Language**: TypeScript.
- **Styling**: Tailwind CSS v4 (Glassmorphism design system).
- **Database**: Supabase (PostgreSQL) for indexing and user data.
- **Authentication**: Privy (Wallet + Email + Socials).
- **Blockchain**: Ethers.js v6 (Sepolia Testnet).
- **Icons**: Lucide React.
- **Animations**: Framer Motion.

## Database Schema (Supabase)
The application relies on Supabase for caching on-chain data and managing user profiles.

### 1. `users`
- `wallet` (Text, PK): Ethereum address (lowercase).
- `x_username` (Text): Linked X handle (e.g., "vitalikbuterin").
- `display_name` (Text): Privy display name.
- `pfp_url` (Text): Profile picture URL.
- `last_seen` (Timestamp).

### 2. `attestations`
- `id` (BigInt, PK).
- `from_wallet` (Text, FK users).
- `to_wallet` (Text, FK users).
- `score` (Int): Trust score (1-100).
- `comment` (Text).
- `tx_hash` (Text).

### 3. `projects`
- `project_id` (Int, PK): ID from smart contract.
- `owner` (Text): Creator's wallet.
- `name`, `description` (Text).
- `reward_token` (Text): ERC20 address.
- `reward_token_symbol` (Text): Cached symbol (e.g., "USDC") to avoid RPC limits.
- `reward_amount` (Text).
- `duration_days` (Int).
- `approved` (Bool): Admin approval status.
- `tx_hash` (Text).

### 4. `stakes`
- `id` (BigInt, PK).
- `project_id` (Int).
- `user_wallet` (Text).
- `amount` (Text).
- `tx_hash` (Text).

### 5. `activity_logs` (Unified Feed)
- `id` (BigInt, PK).
- `type` (Enum: 'STAKE', 'ATTEST', 'REVOKE').
- `wallet` (Text, FK users).
- `target` (Text): Target username/project name.
- `amount` (Text): Display string (e.g., "10 ETH").
- `metadata` (JSONB): Store raw values (score, project_id).
- `tx_hash` (Text).
- **Indices**: `created_at` (DESC) for fast feed queries.

## Smart Contracts (Sepolia)
- **Attestation Contract**: Stores trust scores between users.
- **Project Registry**: Manages project creation and approval.
- **Project Rewards**: Handles ETH staking and ERC20 reward distribution.

## Key Features & Implementation Details

### 1. Activity Feed
- **Design**: "Pump.fun" style, live updates, ticker animation.
- **Implementation**: Polls `/api/activity` every 5 seconds.
- **Optimization**: Queries the single `activity_logs` table instead of joining large tables. API has `Cache-Control: s-maxage=5` to protect DB.

### 2. RPC Optimization (Critical)
- **Problem**: Fetching token symbols for every project list caused "Too Many Requests" (Infura).
- **Solution**: The `projects` table has a `reward_token_symbol` column.
    - When creating a project, the frontend fetches the symbol ONCE and saves it to DB.
    - The Project List page reads from DB, never calls RPC for symbols.

### 3. User Search & Display
- **Search**: `/api/users` supports fuzzy search on `wallet` OR `x_username`.
- **Display**: Always prioritizes `x_username` > `display_name` > `wallet`.
- **Avatar**: `UserAvatar` component handles PFP or generated gradient fallback.

### 4. X Integration
- Uses **Privy** to link X accounts.
- `POST /api/users` updates the Supabase record with X metadata upon login/link.

## Design System
- **Theme**: Dark mode default.
- **Background**: `grid-bg` (CSS pattern).
- **Cards**: `glass-card` (backdrop-blur, white/5 border).
- **Colors**:
    - Primary/Accent: `#00ff88` (Green).
    - Secondary: `#7000ff` (Purple).
    - Text: `var(--text-primary)` (White), `var(--text-secondary)` (Gray-400).

## API Routes
- `GET /api/activity`: Fetches latest 50 logs.
- `POST /api/attestations`: Logs attestation + updates `activity_logs`.
- `POST /api/stakes`: Logs stake + updates `activity_logs`.
- `GET /api/users?q=...`: Search users.
- `POST /api/users`: Upsert user profile.
- `POST /api/projects`: Register project + cache token symbol.

This prompt captures the essence of the StakeFi application as of February 2026.
