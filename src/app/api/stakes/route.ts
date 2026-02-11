import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: NextRequest) {
    try {
        const { projectId, userWallet, amount, txHash } = await request.json();

        if (!projectId || !userWallet || !amount || !txHash) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("stakes")
            .insert({
                project_id: projectId,
                user_wallet: userWallet.toLowerCase(),
                amount: amount,
                tx_hash: txHash,
            })
            .select()
            .single();

        if (error) {
            console.error("Error logging stake:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log to activity_logs
        await supabase.from("activity_logs").insert({
            type: "STAKE",
            wallet: userWallet.toLowerCase(),
            target: `Project #${projectId}`,
            amount: `${amount} ETH`,
            metadata: { projectId, amount },
            tx_hash: txHash
        });

        return NextResponse.json({ success: true, stake: data });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
