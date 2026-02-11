import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface DbProject {
    id: number;
    owner: string;
    reward_token: string;
    reward_amount: string;
    approved: boolean;
    rewards_deposited: boolean;
    created_at: string;
}

export interface DbAttestation {
    id: string;
    from_wallet: string;
    to_wallet: string;
    score: number;
    tx_hash: string;
    block_number: number;
    created_at: string;
}

export interface DbStake {
    id: string;
    project_id: number;
    wallet: string;
    amount: string;
    is_active: boolean;
    tx_hash: string;
    created_at: string;
}

export interface DbReputationScore {
    wallet: string;
    score: number;
    attestations_received: number;
    attestations_given: number;
    updated_at: string;
}
