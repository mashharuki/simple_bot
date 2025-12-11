import "dotenv/config";

export const CONFIG = {
	// Telegram Bot Token (BotFatherから取得)
	TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
	// 通知送信先のチャットID (userinfobot等から取得)
	TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
	// FRの閾値。デフォルトは 0.0001 (0.01%)
	FR_THRESHOLD: parseFloat(process.env.FR_THRESHOLD || "0.0001"),
	// チェック間隔 (秒)。デフォルトは 300秒 (5分)
	CHECK_INTERVAL_SECONDS: parseInt(
		process.env.CHECK_INTERVAL_SECONDS || "300",
		10,
	),
	// サーバーのポート番号
	PORT: parseInt(process.env.PORT || "3000", 10),
	// ループ実行を無効化するかどうか (外部トリガーのみで動かす場合など)
	DISABLE_LOOP: process.env.DISABLE_LOOP === "true",
};

if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
	console.warn(
		"⚠️ Telegram Bot Token or Chat ID is missing. Notifications will be skipped.",
	);
}
