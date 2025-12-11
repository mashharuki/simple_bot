import { CONFIG } from "./config";

/**
 * Telegramにメッセージを送信します。
 * @param message 送信するメッセージ内容 (Markdown形式対応)
 * @param options 追加オプション (インラインキーボードなど)
 * @returns 送信成功時は true, 失敗時は false
 */
export async function sendTelegramMessage(
	message: string,
	options?: {
		reply_markup?: {
			inline_keyboard: { text: string; url: string }[][];
		};
	},
): Promise<boolean> {
	if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
		console.error("Telegram configuration missing.");
		return false;
	}

	const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
	const payload = {
		chat_id: CONFIG.TELEGRAM_CHAT_ID,
		text: message,
		parse_mode: "Markdown",
		...options,
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`Failed to send Telegram message: ${response.status} ${response.statusText}`,
				errorText,
			);
			return false;
		}

		return true;
	} catch (error) {
		console.error(`Failed to send Telegram message: ${error}`);
		return false;
	}
}
