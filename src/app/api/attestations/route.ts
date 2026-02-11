import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: NextRequest) {
    try {
        const { from, to, score, comment, txHash } = await request.json();

        if (!from || !to || score === undefined || !txHash) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Input Validation
        if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
            return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
        }

        if (typeof score !== "number" || score < -127 || score > 127 || !Number.isInteger(score)) {
            return NextResponse.json({ error: "Score must be an integer between -127 and 127" }, { status: 400 });
        }

        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            return NextResponse.json({ error: "Invalid transaction hash format" }, { status: 400 });
        }

        // Insert attestation record
        const { data, error } = await supabase
            .from("attestations")
            .insert({
                from_wallet: from.toLowerCase(),
                to_wallet: to.toLowerCase(),
                score,
                comment,
                tx_hash: txHash,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase error:", error);
            // If uniqueness violation (txHash), it might have been indexed already? 
            // Or user retrying. We should handle gracefully.
            if (error.code === "23505") { // unique_violation
                return NextResponse.json({ error: "Attestation already recorded" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Resolve target display name
        let targetName = to.toLowerCase();
        const { data: targetUser } = await supabase
            .from("users")
            .select("x_username, display_name")
            .eq("wallet", to.toLowerCase())
            .single();

        if (targetUser?.x_username) {
            targetName = `@${targetUser.x_username}`;
        } else if (targetUser?.display_name) {
            targetName = targetUser.display_name;
        }

        // Log to activity_logs
        await supabase.from("activity_logs").insert({
            type: "ATTEST",
            wallet: from.toLowerCase(),
            target: targetName,
            amount: `${score} Trust`,
            metadata: { score, comment, targetWallet: to.toLowerCase() },
            tx_hash: txHash
        });

        return NextResponse.json({ success: true, attestation: data });
    } catch (error: unknown) {
        console.error("API error:", error);
        return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
    }
}
