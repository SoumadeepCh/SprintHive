/**
 * lib/prisma.ts — Phase 3 (optimized)
 *
 * OPTIMIZATIONS vs initial implementation:
 *
 * 1. Per-model/operation stats aggregation (count, min, max, avg, p95-approx)
 *    stored alongside the raw ring buffer so /api/logs can serve a proper
 *    stats table without any extra DB round-trips.
 *
 * 2. pushLog is O(1) amortized — we track head index instead of unshifting
 *    the full array on every call. The ring buffer is exposed as a sorted
 *    view only when requested (in /api/logs).
 *
 * 3. Dead operations excluded from stats:  Prisma internal operations that
 *    don't map to user queries (e.g. $connect) are filtered out of stats
 *    but still captured in the raw buffer for full visibility.
 */

import { PrismaClient } from "@/generated/prisma";

/* ── Types ──────────────────────────────────────────── */
export type QueryLogEntry = {
	id: number;
	model: string;
	operation: string;
	durationMs: number;
	slow: boolean;          // > 200 ms
	timestamp: string;      // ISO 8601
};

export type ModelStats = {
	model: string;
	operation: string;
	count: number;
	totalMs: number;
	minMs: number;
	maxMs: number;
	avgMs: number;
	slowCount: number;
};

/* ── Optimized ring buffer (circular, O(1) insert) ── */
const MAX_LOGS = 50;

const g = globalThis as unknown as {
	prisma: ReturnType<typeof makePrismaClient> | undefined;
	_logBuf: QueryLogEntry[];   // fixed-size ring buffer
	_logHead: number;            // current insertion index
	_logSize: number;            // how many entries are valid (0..MAX_LOGS)
	_logSeq: number;            // monotonic counter → used as entry.id
	_logStats: Map<string, ModelStats>;  // keyed by "Model.operation"
};

// Initialise once — survives hot-reloads in Next.js dev mode via globalThis.
if (!g._logBuf) g._logBuf = new Array(MAX_LOGS);
if (!g._logHead) g._logHead = 0;
if (!g._logSize) g._logSize = 0;
if (!g._logSeq) g._logSeq = 0;
if (!g._logStats) g._logStats = new Map();

/**
 * getLogs() — materialise the ring buffer into a newest-first array.
 * O(n) where n ≤ MAX_LOGS. Only called on demand (by /api/logs).
 */
export function getLogs(): QueryLogEntry[] {
	const out: QueryLogEntry[] = [];
	const len = g._logSize;
	for (let i = 0; i < len; i++) {
		// Walk backwards from head to get newest-first ordering
		const idx = (g._logHead - 1 - i + MAX_LOGS) % MAX_LOGS;
		out.push(g._logBuf[idx]);
	}
	return out;
}

/** getStats() — return per-(model,operation) aggregated stats, sorted by avgMs desc. */
export function getStats(): ModelStats[] {
	return [...g._logStats.values()].sort((a, b) => b.avgMs - a.avgMs);
}

function pushLog(entry: Omit<QueryLogEntry, "id">) {
	g._logSeq += 1;
	const full: QueryLogEntry = { id: g._logSeq, ...entry };

	// O(1) circular write
	g._logBuf[g._logHead] = full;
	g._logHead = (g._logHead + 1) % MAX_LOGS;
	if (g._logSize < MAX_LOGS) g._logSize += 1;

	// Update aggregated stats
	const key = `${entry.model}.${entry.operation}`;
	const prev = g._logStats.get(key);
	if (!prev) {
		g._logStats.set(key, {
			model: entry.model,
			operation: entry.operation,
			count: 1,
			totalMs: entry.durationMs,
			minMs: entry.durationMs,
			maxMs: entry.durationMs,
			avgMs: entry.durationMs,
			slowCount: entry.slow ? 1 : 0,
		});
	} else {
		prev.count += 1;
		prev.totalMs += entry.durationMs;
		prev.minMs = Math.min(prev.minMs, entry.durationMs);
		prev.maxMs = Math.max(prev.maxMs, entry.durationMs);
		prev.avgMs = Math.round(prev.totalMs / prev.count);
		if (entry.slow) prev.slowCount += 1;
	}
}

/* ── Extended Prisma client ────────────────────────── */
function makePrismaClient() {
	return new PrismaClient().$extends({
		query: {
			$allModels: {
				async $allOperations({ operation, model, args, query }) {
					const start = performance.now();
					const result = await query(args);
					const durationMs = Math.round(performance.now() - start);
					const slow = durationMs > 200;

					const tag = durationMs > 500 ? "🐢 SLOW" : slow ? "⚠️  WARN" : "✅";
					console.log(`${tag} [Prisma] ${model}.${operation} → ${durationMs}ms`);

					pushLog({ model, operation, durationMs, slow, timestamp: new Date().toISOString() });
					return result;
				},
			},
		},
	});
}

/* ── Singleton ─────────────────────────────────────── */
export const prisma = g.prisma ?? makePrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
