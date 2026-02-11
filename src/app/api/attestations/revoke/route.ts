import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Init Supabase with Service Role Key for admin privileges (bypassing RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: NextRequest) {
    try {
        const { from, to, txHash } = await request.json();

        if (!from || !to) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log(`[API] Revoking attestation from ${from} to ${to} (Tx: ${txHash})`);

        // Soft delete: Mark as revoked
        const { error } = await supabase
            .from("attestations")
            .update({ revoked_at: new Date().toISOString() })
            .match({
                from_wallet: from.toLowerCase(),
                to_wallet: to.toLowerCase()
            });

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Revoke API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
