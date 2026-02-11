import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(request: NextRequest) {
    try {
        const { data: logs, error } = await supabase
            .from("activity_logs")
            .select(`
                id,
                type,
                created_at,
                wallet,
                target,
                amount,
                metadata,
                users:wallet (
                    display_name,
                    x_username,
                    pfp_url
                )
            `)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("Activity API Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activity = (logs || []).map((log: any) => {
            const userVal = Array.isArray(log.users) ? log.users[0] : log.users;
            return {
                id: `log-${log.id}`,
                type: log.type === "ATTEST" ? "attestation" : "stake",
                createdAt: log.created_at,
                user: {
                    wallet: log.wallet,
                    displayName: userVal?.display_name,
                    username: userVal?.x_username,
                    pfpUrl: userVal?.pfp_url
                },
                target: log.target,
                details: log.amount
            };
        });

        return NextResponse.json({ activity }, {
            headers: {
                "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10"
            }
        });
    } catch (error: unknown) {
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
