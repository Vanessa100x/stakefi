import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET() {
    try {
        // Fetch top 50 users by reputation score
        // Join with users table to get X info
        const { data, error } = await supabase
            .from("reputation_scores")
            .select(`
                score, 
                attestations_received,
                attestations_given,
                wallet,
                users (
                    x_username,
                    display_name,
                    pfp_url
                )
            `)
            .order("score", { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data to flatten the user object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaderboard = data.map((entry: any) => ({
            wallet: entry.wallet,
            score: entry.score,
            received: entry.attestations_received,
            given: entry.attestations_given,
            x_username: entry.users?.x_username || null,
            display_name: entry.users?.display_name || null,
            pfp_url: entry.users?.pfp_url || null
        }));

        return NextResponse.json({ leaderboard });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
