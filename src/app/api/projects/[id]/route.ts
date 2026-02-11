import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET - Fetch a single project by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = parseInt(id);

        if (isNaN(projectId)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("project_id", projectId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Project not found" }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ project: data });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
// PATCH - Update project details (used for syncing on-chain status)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = parseInt(id);
        const { approved, rewards_deposited, total_staked } = await request.json();

        if (isNaN(projectId)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }

        const updates: { approved?: boolean; rewards_deposited?: boolean; total_staked?: number } = {};
        if (approved !== undefined) {
            if (typeof approved !== "boolean") return NextResponse.json({ error: "Invalid approved value" }, { status: 400 });
            updates.approved = approved;
        }
        if (rewards_deposited !== undefined) {
            if (typeof rewards_deposited !== "boolean") return NextResponse.json({ error: "Invalid rewards_deposited value" }, { status: 400 });
            updates.rewards_deposited = rewards_deposited;
        }
        if (total_staked !== undefined) {
            if (typeof total_staked !== "number" || total_staked < 0) return NextResponse.json({ error: "Invalid total_staked value" }, { status: 400 });
            updates.total_staked = total_staked;
        }

        const { data, error } = await supabase
            .from("projects")
            .update(updates)
            .eq("project_id", projectId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, project: data });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
