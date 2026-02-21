import { getLogs, getStats } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/logs
 *
 * Phase 3 optimization: supports ?since=<id> for INCREMENTAL polling.
 * The /logs page sends the ID of the newest entry it already has.
 * Only entries with id > since are returned, shrinking payloads to near-zero
 * when nothing has changed.
 *
 * Response shape:
 *   {
 *     totalCaptured : number,          // all-time count (for stats display)
 *     logs          : QueryLogEntry[], // newest-first, filtered by since
 *     stats         : ModelStats[],    // per-(model,operation) aggregates
 *     slowThresholdMs: 200,
 *   }
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sinceId = Number(searchParams.get("since") ?? 0);

    const allLogs = getLogs();                       // O(n), newest-first
    const filtered = sinceId > 0
        ? allLogs.filter(l => l.id > sinceId)       // only new entries
        : allLogs;

    return NextResponse.json({
        totalCaptured: allLogs.length,
        logs: filtered,
        stats: getStats(),                  // per-model sorted by avgMs desc
        slowThresholdMs: 200,
    });
}
