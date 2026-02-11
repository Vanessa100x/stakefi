import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// POST - Register a user wallet
export async function POST(request: NextRequest) {
    try {
        const { wallet, x_username, display_name, pfp_url } = await request.json();

        if (!wallet) {
            return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
        }

        if (!ethers.isAddress(wallet)) {
            return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
        }

        // Prepare update object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            wallet: wallet.toLowerCase(),
            last_seen: new Date().toISOString()
        };
        // Only update X fields if they are provided (prevent overwriting with null if not sent)
        if (x_username !== undefined) updateData.x_username = x_username;
        if (display_name !== undefined) updateData.display_name = display_name;
        if (pfp_url !== undefined) updateData.pfp_url = pfp_url;

        // Upsert user (insert if new, update last_seen if exists)
        const { data, error } = await supabase
            .from("users")
            .upsert(updateData, { onConflict: "wallet" })
            .select()
            .single();

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: data });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// GET - Search users by wallet prefix
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.toLowerCase();

        if (!query || query.length < 3) {
            return NextResponse.json({ users: [] });
        }

        const { data, error } = await supabase
            .from("users")
            .select("wallet, created_at, x_username, display_name, pfp_url")
            .or(`wallet.ilike.${query}%,x_username.ilike.${query}%`)
            .limit(10);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: data || [] });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
