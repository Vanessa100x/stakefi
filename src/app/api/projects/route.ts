import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// POST - Create a new project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            projectId,
            owner,
            name,
            description,
            rewardToken,
            rewardAmount,
            duration,
            txHash
        } = body;

        if (projectId === undefined || !owner || !rewardToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Input Validation
        if (!Number.isInteger(projectId) || projectId < 0) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }

        if (!ethers.isAddress(owner) || !ethers.isAddress(rewardToken)) {
            return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
        }

        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            return NextResponse.json({ error: "Invalid transaction hash format" }, { status: 400 });
        }

        if (isNaN(parseFloat(rewardAmount)) || parseFloat(rewardAmount) < 0) {
            return NextResponse.json({ error: "Invalid reward amount" }, { status: 400 });
        }

        if (!Number.isInteger(duration) || duration <= 0) {
            return NextResponse.json({ error: "Duration must be a positive integer" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("projects")
            .upsert({
                project_id: projectId,
                owner: owner.toLowerCase(),
                name: name || `Project #${projectId}`,
                description: description || null,
                reward_token: rewardToken.toLowerCase(),
                reward_token_symbol: body.rewardTokenSymbol || "TOKEN", // Cache symbol
                reward_amount: rewardAmount,
                duration_days: duration,
                tx_hash: txHash,
                approved: false,
                created_at: new Date().toISOString(),
            }, { onConflict: "project_id" })
            .select()
            .single();

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, project: data });
    } catch (error: unknown) {
        console.error("API error:", error);
        return NextResponse.json({ error: (error as Error).message, stack: (error as Error).stack }, { status: 500 });
    }
}

// GET - Fetch all projects
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const approved = searchParams.get("approved");

        let query = supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });

        if (approved === "true") {
            query = query.eq("approved", true);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ projects: data || [] }, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
            }
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
