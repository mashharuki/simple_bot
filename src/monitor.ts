// Hyperliquid APIのメタデータ応答の型定義
interface UniverseItem {
	name: string;
	szDecimals: number;
	maxLeverage: number;
	onlyIsolated: boolean;
}

// 各アセットのコンテキスト情報の型定義
interface AssetCtx {
	funding: string;
	openInterest: string;
	prevDayPx: string;
	dayNtlVlm: string;
	premium: string;
	oraclePx: string;
	markPx: string;
	midPx: string;
	impactPxs: string[];
}

// アプリケーション内で扱うレート情報の型定義
interface RateInfo {
	name: string; // 銘柄名
	funding: number; // Funding Rate (生の数値)
	apr: number; // 年率換算 (パーセント)
}

/**
 * Hyperliquid APIから全アセットのFunding Rateを取得します。
 * @returns RateInfoの配列
 */
export async function fetchFundingRates(): Promise<RateInfo[]> {
	const url = "https://api.hyperliquid.xyz/info";

	try {
		// APIをリクエスト
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ type: "metaAndAssetCtxs" }),
		});

		if (!response.ok) {
			console.error(`Error fetching funding rates: ${response.statusText}`);
			return [];
		}

		// レスポンスの解析: [0]がメタデータ、[1]がコンテキスト情報
		const data = (await response.json()) as [
			{ universe: UniverseItem[] },
			AssetCtx[],
		];
		const universe = data[0].universe;
		const assetCtxs = data[1];

		const rates: RateInfo[] = [];

		for (let i = 0; i < universe.length; i++) {
			if (i >= assetCtxs.length) break;

			const name = universe[i].name;
			const ctx = assetCtxs[i];

			// fundingを数値に変換 (文字列で返ってくるため)
			const fundingRaw = parseFloat(ctx.funding || "0");

			// Annualized Rate = Funding * 24 * 365 * 100 (as percentage)
			// Note: Python code did: apr = funding * 24 * 365 * 100
			const apr = fundingRaw * 24 * 365 * 100;

			rates.push({
				name,
				funding: fundingRaw,
				apr,
			});
		}

		return rates;
	} catch (error) {
		console.error(`Error fetching funding rates: ${error}`);
		return [];
	}
}

/**
 * 閾値を超えるFunding Rateを持つアセットをフィルタリングします。
 * @param rates 取得したレート情報の配列
 * @param threshold 検知する閾値 (絶対値で判定)
 * @returns 閾値を超えたアセットの配列
 */
export function checkThresholds(
	rates: RateInfo[],
	threshold: number,
): RateInfo[] {
	// 絶対値が閾値以上のものを抽出
	return rates.filter((item) => Math.abs(item.funding) >= threshold);
}

/**
 * 異常なレート情報を通知用のメッセージ形式に整形します。
 * @param abnormalRates 異常なレート情報の配列
 * @returns 通知メッセージとボタン設定のオブジェクト。対象がない場合はnull
 */
export function formatMessage(abnormalRates: RateInfo[]): {
	text: string;
	buttons: { text: string; url: string }[][];
} | null {
	if (abnormalRates.length === 0) {
		return null;
	}

	const lines = ["🚨 **金利(FR)アラート** 🚨\n"];
	const buttons: { text: string; url: string }[][] = [];

	for (const item of abnormalRates) {
		const { name, funding, apr } = item;
		// 初心者向けに、「ロング過多」や「ショート過多」といった表現を追加
		const direction =
			funding > 0
				? "ロングポジションが多すぎます (買い優勢)"
				: "ショートポジションが多すぎます (売り優勢)";
		const icon = funding > 0 ? "📈" : "📉";

		// Funding Rateをパーセント表記に変換 (例: 0.0001 -> 0.01%)
		const fundingPct = (funding * 100).toFixed(4);
		const aprStr = apr.toFixed(2);

		// 符号付きで表示するための処理
		const fundingPctSigned = funding * 100 > 0 ? `+${fundingPct}` : fundingPct;
		const aprSigned = apr > 0 ? `+${aprStr}` : aprStr;

		lines.push(
			`${icon} **${name}**\n` +
				`   FR (1時間): \`${fundingPctSigned}%\`\n` +
				`   年換算 (APR): \`${aprSigned}%\`\n` +
				`   解説: ${direction}`,
		);

		// Hyperliquidの取引ページへのリンクボタンを作成
		buttons.push([
			{
				text: `👉 ${name} を取引する (Hyperliquid)`,
				url: `https://app.hyperliquid.xyz/trade/${name}`,
			},
		]);
	}

	return {
		text: lines.join("\n"),
		buttons: buttons,
	};
}
