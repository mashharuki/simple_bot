import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CONFIG } from "./config";
import { checkThresholds, fetchFundingRates, formatMessage } from "./monitor";
import { sendTelegramMessage } from "./notifier";

const app = new Hono();

// --- コアロジック ---
// アプリケーションの中心となる定期チェック処理です

async function runCheck() {
	console.log("Fetching funding rates...");
	const rates = await fetchFundingRates();

	if (rates.length === 0) {
		console.log("No rates fetched.");
		return { status: "error", message: "No rates fetched" };
	}

	const abnormal = checkThresholds(rates, CONFIG.FR_THRESHOLD);

	if (abnormal.length > 0) {
		console.log(`Found ${abnormal.length} abnormal rates.`);
		const result = formatMessage(abnormal);
		if (result) {
			console.log("Sending notification...");
			const success = await sendTelegramMessage(result.text, {
				reply_markup: {
					inline_keyboard: result.buttons,
				},
			});
			if (success) {
				console.log("Notification sent successfully.");
			} else {
				console.log("Failed to send notification.");
			}
		}
		return { status: "abnormal_found", count: abnormal.length };
	} else {
		console.log("No abnormal rates found.");
		return { status: "ok", message: "No abnormal rates" };
	}
}

// --- スケジューラー ---
// 定期的に処理を実行するためのセットアップ

let intervalId: NodeJS.Timeout | null = null;

function startLoop() {
	if (CONFIG.DISABLE_LOOP) {
		console.log("Loop is disabled via config.");
		return;
	}

	if (intervalId) return;

	console.log(
		`Starting monitoring loop. Interval: ${CONFIG.CHECK_INTERVAL_SECONDS}s`,
	);

	// 初回実行
	runCheck().catch(console.error);

	// 定期実行の登録
	intervalId = setInterval(() => {
		runCheck().catch((err) => {
			console.error("Unexpected error in main loop:", err);
		});
	}, CONFIG.CHECK_INTERVAL_SECONDS * 1000);
}

// --- API Routes ---

app.get("/", (c) => {
	return c.text("Hyperliquid FR Bot is running 🤖");
});

app.get("/check", async (c) => {
	const result = await runCheck();
	return c.json(result);
});

// --- Start ---

console.log(`Starting server on port ${CONFIG.PORT}...`);

// Start the scheduler
startLoop();

serve({
	fetch: app.fetch,
	port: CONFIG.PORT,
});
