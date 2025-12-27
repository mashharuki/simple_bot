---
title: "328行で作る本番運用Bot - Bun+Hono+Terraformで月額0円を実現した話"
emoji: "🤖"
type: "tech"
topics: ["bun", "hono", "typescript", "terraform", "cloudrun"]
published: false
---

## この記事で分かること

- **Bun + Honoでの開発体験** - 実際に使って感じた良い点と注意点
- **328行でBot実装** - シンプルに保つための設計の工夫
- **Terraformでインフラ管理** - GCP Cloud Runへの自動デプロイ
- **月額0円運用** - 無料枠内で動かすコツ
- **図解7つ** - アーキテクチャや処理フローを可視化

想定読者: TypeScript経験者で、モダンなスタックやサーバーレス運用に興味がある方
読了時間: 約15分

## はじめに

「328行のコードで本番運用できるBotって作れるの?」

そう思われるかもしれませんが、実際に動いているコードがあります。今回作ったのは、Hyperliquid取引所のFunding Rate(FR)を監視して、異常値を検知したらTelegramで通知するBot。シンプルだけど、本番で使える品質を目指しました。

### 技術スタック

- **ランタイム:** Bun 1.0+
- **Webフレームワーク:** Hono
- **インフラ:** Google Cloud Run + Terraform
- **コード品質:** Biome

https://github.com/mashharuki/simple_bot

## なぜこのBotを作ったのか

### Funding Rateについて

Funding Rate(資金調達率)は、無期限先物取引で市場の需給バランスを調整するための手数料です。

| 状態 | 意味 | 手数料の方向 |
|------|------|--------------|
| 大きくプラス | ロング(買い)が多い | ロング保有者がショート保有者に支払う |
| 大きくマイナス | ショート(売り)が多い | ショート保有者がロング保有者に支払う |

つまり、FRの異常値は市場が一方向に偏っているサインなんですね。このBotでは、時給±0.01%(年率換算で約87.6%)を超える値を検知して通知します。

100銘柄以上を24時間監視するのは手動では無理なので、5分ごとに自動チェックして異常値だけ教えてくれるようにしました。

## プロジェクト概要

### 何ができるBot?

1. **5分ごと**にHyperliquid APIから全銘柄のFunding Rateを取得
2. 設定した閾値(デフォルト: 時給±0.01%)を超えたら検知
3. **Telegram**に年率換算(APR)と時給を含むリッチなメッセージを送信
4. メッセージには取引ページへの直リンクボタンも付与

### システムアーキテクチャ図

全体のシステム構成を図で示します:

```mermaid
graph TB
    subgraph "トリガー層"
        Scheduler["Google Cloud Scheduler<br/>(オプション)"]
        Timer["setInterval<br/>(常時監視モード)"]
    end

    subgraph "アプリケーション層 (Cloud Run / Docker)"
        Server["Hono Web Server<br/>:3000"]
        RunCheck["runCheck()<br/>メインロジック"]

        subgraph "monitor.ts"
            Fetch["fetchFundingRates()<br/>データ取得 & APR計算"]
            Check["checkThresholds()<br/>閾値判定"]
            Format["formatMessage()<br/>メッセージ整形"]
        end

        subgraph "notifier.ts"
            Send["sendTelegramMessage()<br/>通知送信"]
        end

        subgraph "config.ts"
            Config["CONFIG<br/>設定管理"]
        end
    end

    subgraph "外部API層"
        Hyperliquid["Hyperliquid API<br/>POST /info"]
        Telegram["Telegram Bot API<br/>POST sendMessage"]
    end

    subgraph "ユーザー"
        User["Telegramユーザー"]
    end

    Scheduler -->|"GET /check"| Server
    Timer -->|"定期実行"| RunCheck
    Server -->|"手動トリガー"| RunCheck

    RunCheck --> Fetch
    Fetch -->|"FR取得リクエスト"| Hyperliquid
    Hyperliquid -->|"FR + メタデータ"| Fetch
    Fetch --> Check
    Check --> Format
    Format --> Send
    Send -->|"通知リクエスト"| Telegram
    Telegram -->|"プッシュ通知"| User

    Config -.->|"設定参照"| Fetch
    Config -.->|"設定参照"| Send

    style RunCheck fill:#e1f5ff
    style Config fill:#fff4e1
    style Hyperliquid fill:#ffe1e1
    style Telegram fill:#e1ffe1
```

**構成の特徴:**
- 🔄 **2つのトリガーモード**: Cloud SchedulerまたはsetIntervalで実行可能
- 🧩 **モジュラー設計**: 各機能が独立したファイルに分離
- ⚙️ **設定の一元管理**: CONFIGで全体の振る舞いを制御

## プロジェクト構造

わずか328行のコードでどのように構成されているか、ファイル構造を可視化します:

```mermaid
graph TD
    subgraph "プロジェクトルート"
        Root["/"]

        subgraph "ソースコード (src/)"
            Config["config.ts<br/>📋 25行<br/>環境変数管理"]
            Index["index.ts<br/>🚀 95行<br/>サーバー & ルーティング"]
            Monitor["monitor.ts<br/>🔍 155行<br/>FR監視ロジック"]
            Notifier["notifier.ts<br/>📢 53行<br/>Telegram通知"]
        end

        subgraph "インフラ (terraform/)"
            Main["main.tf<br/>プロバイダー設定"]
            CloudRun["cloud_run.tf<br/>Cloud Run & Registry"]
            Vars["variables.tf<br/>変数定義"]
        end

        subgraph "設定ファイル"
            Package["package.json<br/>依存関係 & スクリプト"]
            Biome["biome.json<br/>コード品質設定"]
            TSConfig["tsconfig.json<br/>TypeScript設定"]
            Dockerfile["Dockerfile<br/>コンテナ定義"]
            Compose["compose.yaml<br/>Docker Compose設定"]
        end
    end

    Root --> Config
    Root --> Index
    Root --> Monitor
    Root --> Notifier
    Root --> Main
    Root --> CloudRun
    Root --> Vars
    Root --> Package
    Root --> Biome
    Root --> TSConfig
    Root --> Dockerfile
    Root --> Compose

    Index -.->|import| Config
    Index -.->|import| Monitor
    Index -.->|import| Notifier
    Monitor -.->|import| Config
    Notifier -.->|import| Config

    style Config fill:#fff4e1
    style Index fill:#e1f5ff
    style Monitor fill:#ffe1e1
    style Notifier fill:#e1ffe1
```

**ファイルの役割:**

| ファイル | 行数 | 責務 |
|----------|------|------|
| **config.ts** | 25行 | 環境変数の読み込みと型変換、設定の一元管理 |
| **index.ts** | 95行 | Honoサーバー起動、ルーティング、スケジューラー管理 |
| **monitor.ts** | 155行 | FR取得、APR計算、閾値チェック、メッセージ整形 |
| **notifier.ts** | 53行 | Telegram API連携、通知送信 |
| **合計** | **328行** | すべてのアプリケーションロジック |

**依存関係の流れ:**
- すべてのモジュールが`config.ts`を参照
- `index.ts`が他のモジュールをオーケストレーション
- 循環依存なしのクリーンな構造

## 技術選定の理由

### Bunを選んだ理由

[Bun](https://bun.sh/)は2024年に安定版1.0をリリースしたJavaScriptランタイムです。

#### パフォーマンス比較

測定環境: M1 Mac, macOS 14.0, 同一プロジェクトで計測

| 操作 | Node.js v20 | Bun v1.0 |
|------|-------------|----------|
| TypeScript実行 | 2.3s | 0.8s |
| `npm install` | 45s | 8s |
| ビルド設定 | 必要 | 不要 |

選んだ理由:
- TypeScriptをそのまま実行できる(トランスパイル不要)
- パッケージインストールが速い
- テストランナーやバンドラーが標準で入っている
- Web標準APIが最初から使える

```json:package.json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "check": "tsc --noEmit"
  }
}
```

`bun --watch`で保存するたびに自動再起動してくれるので、`ts-node`や`nodemon`が不要になりました。

### Honoを選んだ理由

[Hono](https://hono.dev/)はエッジ環境向けに作られた軽量Webフレームワークです。

#### 各フレームワークの比較

| フレームワーク | バンドルサイズ | TypeScript対応 |
|----------------|----------------|----------------|
| Express | 200+ KB | △ (別途型定義) |
| Fastify | 150 KB | ○ |
| Hono | 20 KB | ◎ (ネイティブ) |

選んだ理由:
- 軽量でCold Startが速い
- TypeScriptの型推論が効く
- Cloudflare Workers、Deno、Bun、Node.js全部で動く
- Web標準のFetch APIベース

```typescript:src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => c.text("Hyperliquid FR Bot is running 🤖"));

app.get("/check", async (c) => {
  const result = await runCheck();
  return c.json(result);  // 型推論が効く
});

serve({ fetch: app.fetch, port: CONFIG.PORT });
```

Expressの`req`/`res`と違って、Web標準のRequest/Responseを使うので、エッジ環境への移植も簡単です。

### Biomeを選んだ理由

[Biome](https://biomejs.dev/)はRustで書かれたLinter + Formatterです。

#### ツール比較

測定環境: 10,000ファイルのプロジェクト

| ツール | Lint時間 | Format時間 | 設定ファイル数 |
|--------|----------|------------|----------------|
| ESLint + Prettier | 45s | 12s | 3-5個 |
| Biome | 1.2s | 0.3s | 1個 |

選んだ理由:
- LintとFormatが1つのツールで済む
- 速い(Rust製)
- デフォルトで使えるルールセット
- VSCode拡張で保存時に自動フォーマット

```json:biome.json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

`.eslintrc.js`や`.prettierrc`など複数の設定ファイルが不要になってスッキリしました。

## AI開発ツールを活用

このプロジェクトの骨格部分は、Google Antigravity(2025年11月発表のAI開発環境)を使って作りました。

Antigravityは従来のコード補完ツールと違って、プロジェクトの初期設定からAPI実装、Terraform設定まで、プロンプトを書くだけで自動生成してくれます。Claude Sonnet 4.5が無料で使えるのも大きなメリットです。

ただ、生成されたコードをそのまま使うのは危険です。特にセキュリティ面やエラーハンドリングは人間がしっかりレビューして手を入れる必要があります。

:::message
**AIツールの使い方:**
- 初期設定やボイラープレートは AI に任せる
- ビジネスロジックは人間が書く
- 生成されたコードは必ずレビューする
:::

## 処理フローの詳細

### シーケンス図: 異常検知から通知までの流れ

実際の処理がどのように流れるのかを、シーケンス図で詳しく見てみましょう:

```mermaid
sequenceDiagram
    participant Timer as タイマー/Scheduler
    participant RunCheck as runCheck()
    participant Monitor as monitor.ts
    participant Hyperliquid as Hyperliquid API
    participant Notifier as notifier.ts
    participant Telegram as Telegram API
    participant User as ユーザー

    Timer->>RunCheck: 定期実行 (5分ごと)
    activate RunCheck

    RunCheck->>Monitor: fetchFundingRates()
    activate Monitor
    Monitor->>Hyperliquid: POST /info<br/>{type: "metaAndAssetCtxs"}
    Hyperliquid-->>Monitor: [universe[], assetCtxs[]]
    Note over Monitor: ループ処理で各銘柄を処理<br/>parseFloat(funding)<br/>APR = funding × 24 × 365 × 100
    Monitor-->>RunCheck: RateInfo[] (全銘柄データ)
    deactivate Monitor

    RunCheck->>Monitor: checkThresholds(rates, 0.0001)
    activate Monitor
    Note over Monitor: Math.abs(funding) >= threshold<br/>でフィルタリング
    Monitor-->>RunCheck: RateInfo[] (異常銘柄のみ)
    deactivate Monitor

    alt 異常値が検出された場合
        RunCheck->>Monitor: formatMessage(abnormalRates)
        activate Monitor
        Note over Monitor: 日本語メッセージ作成<br/>符号付きAPR計算<br/>ボタンURL生成
        Monitor-->>RunCheck: {text, buttons}
        deactivate Monitor

        RunCheck->>Notifier: sendTelegramMessage(text, options)
        activate Notifier
        Notifier->>Telegram: POST /sendMessage<br/>{chat_id, text, parse_mode, reply_markup}
        Telegram-->>Notifier: {ok: true}
        Telegram->>User: 📱 プッシュ通知
        Notifier-->>RunCheck: true
        deactivate Notifier

        RunCheck-->>Timer: {status: "abnormal_found", count: N}
    else 異常値なし
        RunCheck-->>Timer: {status: "ok"}
    end
    deactivate RunCheck
```

**処理のポイント:**
1. **データ取得と変換を一度に実施** - fetchFundingRates()でFR取得とAPR計算を同時に行う
2. **段階的なフィルタリング** - 全データ → 異常値のみ → メッセージ整形という流れ
3. **null安全** - 異常値がない場合はformatMessage()がnullを返し、通知をスキップ
4. **非同期処理の連鎖** - async/awaitで可読性の高いコードを実現

### データフロー図

データがどのように変換されていくかを視覚化します:

```mermaid
graph LR
    subgraph "1. API取得"
        Raw["生データ<br/>funding: '0.0001' (string)"]
    end

    subgraph "2. 型変換 & 計算"
        Parsed["パース済み<br/>funding: 0.0001 (number)<br/>apr: 87.6"]
    end

    subgraph "3. フィルタリング"
        Filtered["異常値のみ<br/>|funding| >= 0.0001"]
    end

    subgraph "4. 表示用変換"
        Display["表示用文字列<br/>FR: '+0.01%'<br/>APR: '+87.60%'"]
    end

    subgraph "5. メッセージ化"
        Message["Telegram形式<br/>Markdown + Buttons"]
    end

    Raw -->|parseFloat| Parsed
    Parsed -->|filter| Filtered
    Filtered -->|toFixed + 符号| Display
    Display -->|formatMessage| Message

    style Raw fill:#ffe1e1
    style Parsed fill:#fff4e1
    style Filtered fill:#e1f5ff
    style Display fill:#f0e1ff
    style Message fill:#e1ffe1
```

**変換の流れ:**
- 文字列 → 数値 → フィルタリング → 表示用文字列 → メッセージオブジェクト
- 各段階で型安全性を保ちながら、必要な形式に変換

## 実装のポイント

実際に開発していてハマった部分と、その解決方法を共有します。

### 1. API連携で文字列と数値を間違えた

Hyperliquid APIは、Funding Rateを数値ではなく文字列で返してきます。最初これに気づかず`funding * 24 * 365`と計算したら、`NaN`になって焦りました。

```typescript:src/monitor.ts
// APIレスポンスの型定義
interface UniverseItem {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

interface AssetCtx {
  funding: string;  // 注意: 数値ではなく文字列!
  openInterest: string;
  prevDayPx: string;
  // ... その他のフィールド
}

// アプリケーション内で扱うレート情報の型定義
interface RateInfo {
  name: string;      // 銘柄名
  funding: number;   // Funding Rate (生の数値)
  apr: number;       // 年率換算 (パーセント)
}

export async function fetchFundingRates(): Promise<RateInfo[]> {
  const response = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
  });

  const data = await response.json() as [
    { universe: UniverseItem[] },
    AssetCtx[],
  ];
  const universe = data[0].universe;
  const assetCtxs = data[1];

  const rates: RateInfo[] = [];

  for (let i = 0; i < universe.length; i++) {
    const name = universe[i].name;
    const fundingRaw = parseFloat(assetCtxs[i].funding || "0");

    // APRを取得時に計算: Funding * 24 * 365 * 100
    const apr = fundingRaw * 24 * 365 * 100;

    rates.push({ name, funding: fundingRaw, apr });
  }

  return rates;
}
```

**学び:**
- API仕様書をよく読む!数値型だと思っても文字列で返ってくることがある
- `parseFloat()`で明示的に変換して型の一貫性を保つ
- **APR計算をデータ取得時に行う**ことで、後続の処理がシンプルに

### 2. 閾値チェックとAPR変換

Funding Rateを年率(APR)に変換し、閾値を超えたものだけをフィルタリングします。

```typescript:src/monitor.ts
// APR計算は fetchFundingRates() で実施済み
export function checkThresholds(
  rates: RateInfo[],
  threshold: number,
): RateInfo[] {
  // 絶対値が閾値以上のものを抽出
  return rates.filter((item) => Math.abs(item.funding) >= threshold);
}
```

**APR計算式:**
```
APR = 時給FR × 24時間 × 365日 × 100(%)
```

例えば、時給0.01%(0.0001)のFRの場合:
```
APR = 0.0001 × 24 × 365 × 100 = 87.6%
```

**設計のポイント:**
- APR計算を`fetchFundingRates()`で行うことで、関心の分離を実現
- `checkThresholds()`はシンプルなフィルタリングに専念
- 各関数が単一責任を持つことでテストしやすいコードに

### 3. 日本語対応のリッチなTelegram通知

ただのテキストではなく、**日本語の解説付き** + Markdownフォーマット + インラインボタンでリッチな通知を実現しています。

```typescript:src/monitor.ts
export function formatMessage(abnormalRates: RateInfo[]): {
  text: string;
  buttons: { text: string; url: string }[][];
} | null {
  if (abnormalRates.length === 0) return null;

  const lines = ["🚨 **金利(FR)アラート** 🚨\n"];
  const buttons: { text: string; url: string }[][] = [];

  for (const item of abnormalRates) {
    const { name, funding, apr } = item;

    // 初心者向けに、わかりやすい日本語で解説
    const direction = funding > 0
      ? "ロングポジションが多すぎます (買い優勢)"
      : "ショートポジションが多すぎます (売り優勢)";
    const icon = funding > 0 ? "📈" : "📉";

    // パーセント表記に変換
    const fundingPct = (funding * 100).toFixed(4);
    const aprStr = apr.toFixed(2);

    // 符号付きで表示
    const fundingPctSigned = funding > 0 ? `+${fundingPct}` : fundingPct;
    const aprSigned = apr > 0 ? `+${aprStr}` : aprStr;

    lines.push(
      `${icon} **${name}**\n` +
      `   FR (1時間): \`${fundingPctSigned}%\`\n` +
      `   年換算 (APR): \`${aprSigned}%\`\n` +
      `   解説: ${direction}`,
    );

    // Hyperliquidの取引ページへのリンクボタン
    buttons.push([{
      text: `👉 ${name} を取引する (Hyperliquid)`,
      url: `https://app.hyperliquid.xyz/trade/${name}`
    }]);
  }

  return { text: lines.join("\n"), buttons };
}
```

```typescript:src/notifier.ts
export async function sendTelegramMessage(
  message: string,
  options?: {
    reply_markup?: {
      inline_keyboard: { text: string; url: string }[][];
    };
  },
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown",
    ...options,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.ok;
}
```

**学び:**
- **日本語で解説を添えることで初心者にも優しい通知に**
- `parse_mode: "Markdown"`で`**太字**`や`` `コード` ``が使える
- `reply_markup`のインラインボタンで直接アクションを促せる
- 符号付き表示(`+87.6%`)で視覚的に方向性がわかりやすい

### 4. 環境変数の一元管理

設定を`config.ts`に集約することで、メンテナンス性を向上させています。

```typescript:src/config.ts
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

// 起動時に警告を表示
if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
  console.warn(
    "⚠️ Telegram Bot Token or Chat ID is missing. Notifications will be skipped.",
  );
}
```

**学び:**
- **CONSTという命名で設定値であることを明示**
- 環境変数のデフォルト値を設定することで、開発時の利便性向上
- 数値型の変数は`parseInt/parseFloat`で明示的に変換
- `dotenv`でローカル開発時の`.env`ファイルサポート
- **起動時に設定の検証を行い、問題を早期発見**

### 5. 柔軟なデプロイモード

Cloud Schedulerとの連携を考慮して、ループの有効/無効を切り替えられるようにしています。

```typescript:src/index.ts
async function runCheck() {
  console.log("Fetching funding rates...");
  const rates = await fetchFundingRates();
  const abnormal = checkThresholds(rates, CONFIG.FR_THRESHOLD);

  if (abnormal.length > 0) {
    const result = formatMessage(abnormal);
    if (result) {
      await sendTelegramMessage(result.text, {
        reply_markup: { inline_keyboard: result.buttons },
      });
    }
    return { status: "abnormal_found", count: abnormal.length };
  }
  return { status: "ok", message: "No abnormal rates" };
}

function startLoop() {
  if (CONFIG.DISABLE_LOOP) {
    console.log("Loop is disabled via config.");
    return;
  }

  console.log(`Starting monitoring loop. Interval: ${CONFIG.CHECK_INTERVAL_SECONDS}s`);

  runCheck().catch(console.error); // 初回実行

  setInterval(() => {
    runCheck().catch(console.error);
  }, CONFIG.CHECK_INTERVAL_SECONDS * 1000);
}

// ループを開始
startLoop();

// Serverは常に起動 (ヘルスチェック & 手動トリガー用)
serve({ fetch: app.fetch, port: CONFIG.PORT });
```

**デプロイパターン:**

| モード | 設定 | 用途 |
|--------|------|------|
| 常時監視 | `DISABLE_LOOP=false` | Docker Composeなど常時起動環境 |
| Webhook | `DISABLE_LOOP=true` | Cloud Scheduler → `/check`エンドポイント |

**学び:**
- `runCheck()`関数でロジックを集約し、再利用可能に
- エラーハンドリングを`.catch()`で実装
- サーバーは常に起動することで、ヘルスチェックや手動トリガーに対応

## Terraformによるインフラ自動化

GCPへのデプロイを完全にコード化しています。

```hcl:terraform/cloud_run.tf
# Artifact Registryリポジトリの作成
resource "google_artifact_registry_repository" "simple_bot_repo" {
  location      = var.region
  repository_id = "simple-bot"
  format        = "DOCKER"
}

# Cloud Runサービスのデプロイ
resource "google_cloud_run_v2_service" "simple_bot" {
  name     = "simple-bot"
  location = var.region

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/simple-bot/simple_bot:latest"

      env {
        name  = "TELEGRAM_BOT_TOKEN"
        value = var.telegram_bot_token
      }
      env {
        name  = "TELEGRAM_CHAT_ID"
        value = var.telegram_chat_id
      }
      env {
        name  = "DISABLE_LOOP"
        value = "true"  # Cloud Schedulerと連携
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}
```

**学び:**
- Terraformで環境変数も管理することで、手動設定ミスを防止
- `DISABLE_LOOP=true`でCloud Scheduler連携モードに
- リソース制限を明示的に設定してコスト最適化

## Dockerマルチステージビルド

本番環境のイメージサイズを最小化するため、マルチステージビルドを採用しています。

```dockerfile:Dockerfile
# Stage 1: ビルド環境
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run check  # 型チェック実行

# Stage 2: 本番環境
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/src ./src
EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

**学び:**
- ビルドステージでは型チェックも実行してCI/CD的な検証を実施
- 本番ステージでは`--production`で開発依存を除外
- Alpineベースで最小イメージサイズ化(約100MB)

## デプロイ手順

このBotは柔軟なデプロイ戦略をサポートしています。環境に応じて最適な方法を選択できます。

### デプロイメントパターン比較

```mermaid
graph TB
    subgraph "パターン1: ローカル開発"
        Local["Bunランタイム<br/>DISABLE_LOOP=false"]
        LocalLoop["setInterval<br/>(5分ごと)"]
        Local --> LocalLoop
    end

    subgraph "パターン2: Docker常時起動"
        Docker["Dockerコンテナ<br/>DISABLE_LOOP=false"]
        DockerLoop["setInterval<br/>(5分ごと)"]
        Docker --> DockerLoop
    end

    subgraph "パターン3: Cloud Run + Scheduler"
        CloudRun["Cloud Run<br/>DISABLE_LOOP=true"]
        Scheduler["Cloud Scheduler<br/>(5分ごと)"]
        Scheduler -->|"GET /check"| CloudRun
    end

    style Local fill:#e1f5ff
    style Docker fill:#fff4e1
    style CloudRun fill:#e1ffe1

    note1["💻 開発時<br/>コスト: 無料<br/>管理: 手動起動"]
    note2["🐳 本番運用<br/>コスト: サーバー代<br/>管理: 常時稼働"]
    note3["☁️ サーバーレス<br/>コスト: 従量課金(月数円)<br/>管理: 自動スケール"]

    Local -.-> note1
    Docker -.-> note2
    CloudRun -.-> note3
```

### パターン別の詳細

| パターン | メリット | デメリット | 推奨環境 |
|----------|----------|------------|----------|
| **ローカル開発** | 即座に起動、デバッグ容易 | PC起動中のみ動作 | 開発・テスト |
| **Docker常時起動** | 環境一貫性、移植性高い | サーバー維持コスト | VPS、自宅サーバー |
| **Cloud Run + Scheduler** | 従量課金、自動スケール、メンテ不要 | コールドスタート | 本番運用 |

### 1. ローカル開発

```bash
# 依存関係のインストール
bun install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してTelegram credentialsを設定

# 開発サーバー起動(ホットリロード付き)
bun run dev
```

### 2. Docker Composeで起動

```bash
# バックグラウンドで起動
docker compose up -d

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

### 3. GCP Cloud Runへのデプロイ

```bash
# Dockerイメージのビルド
docker build -t asia-northeast1-docker.pkg.dev/PROJECT_ID/simple-bot/simple_bot:latest .

# Artifact Registryへのプッシュ
docker push asia-northeast1-docker.pkg.dev/PROJECT_ID/simple-bot/simple_bot:latest

# Terraformでインフラ構築
cd terraform
terraform init
terraform apply
```

**Cloud Runのコスト試算:**
- リクエスト: 200万回/月まで無料
- CPU時間: 180,000 vCPU秒/月まで無料
- メモリ: 360,000 GiB秒/月まで無料

**このBotの場合:**
- 5分ごと実行 = 月間8,640リクエスト
- 実行時間約2秒 = 月間17,280秒
- → **完全に無料枠内で運用可能!** 💰

## 学びとポイント

### 1. **モダンスタックの威力**

Bun + Hono + TypeScriptの組み合わせで、**驚くほど少ないコード量**で実用的なサービスが構築できました。

- Bunのネイティブ TypeScriptサポート → `ts-node`や複雑なビルド設定不要
- HonoのシンプルなAPI → Express的な複雑さなし
- Biomeのオールインワン → Prettier + ESLint の設定ファイル地獄から解放

### 2. **型安全性の重要性**

APIレスポンスの型定義により、以下のようなバグを防げました:

```typescript
// ❌ 型定義なし - fundingが文字列だと気づかずハマる
const apr = assetCtx.funding * 24 * 365 * 100; // NaNになる!

// ✅ 型定義あり - parseFloatで明示的に変換
const fundingRaw = parseFloat(assetCtx.funding || "0");
const apr = fundingRaw * 24 * 365 * 100; // 正しく計算できる
```

TypeScriptの型システムにより、以下のような恩恵を受けられます:
- APIレスポンスの構造を明確に把握
- プロパティ名のタイポを防止
- リファクタリング時の変更漏れを検出

### 3. **関心の分離**

- `config.ts` - 設定管理
- `monitor.ts` - ビジネスロジック
- `notifier.ts` - 外部サービス連携
- `index.ts` - アプリケーション構成

この分離により、**各モジュールが50-150行程度**で収まり、理解しやすいコードベースになりました。

### 4. **インフラのコード化のメリット**

Terraformでインフラを管理することで:
- ✅ 環境の再現性が完璧
- ✅ GitHubでインフラ変更の履歴管理
- ✅ 手動設定ミスの撲滅
- ✅ ドキュメント不要(コードがドキュメント)

### 5. **柔軟なデプロイ戦略**

`DISABLE_LOOP`フラグ一つで、以下のモードを切り替え:

| 環境 | モード | メリット |
|------|--------|----------|
| ローカル/Docker | 常時監視 | シンプルな構成 |
| Cloud Run | Webhook | 従量課金でコスト最適化 |

Cloud Runは**リクエストがない時は課金されない**ので、Cloud Schedulerと組み合わせることで月額数円で運用できます!

## 今後やりたいこと

作ってみて、改善したい点もいくつか見えてきました。

すぐできそうなのは、API障害時の自動リトライ機能。今は1回失敗したらそれで終わりなので、exponential backoffを入れたいですね。あとはユニットテストも書いていない状態なので、Bunの組み込みテストランナーを使って追加したいところ。

もう少し手を入れるなら、Discord や Slack にも通知できるようにしたいです。今は Telegram だけなので、複数チャネル対応にすると便利そう。

長期的には、データを Firestore に溜めて過去のFRトレンドを可視化するとか、機械学習で異常値を予測するとか、面白そうなことはいろいろあります。でも、まずはシンプルに動くものを作るのが大事かなと。

## まとめ

Bun、Hono、TypeScriptの組み合わせで、328行のコードで動く監視Botを作ってみました。

個人的に一番良かったのは、Bunのおかげでビルド設定が不要になったこと。`bun --watch`で即座に開発を始められるのは快適でした。Honoも軽量でシンプル、Expressみたいに複雑な設定がいらないのが良いです。

コードは4ファイルに分けて、各モジュール50-155行程度。小さく保つことで、後から見返した時に理解しやすくなりました。Terraformでインフラもコード化したので、環境構築も自動化できています。

Cloud Runの無料枠内で動くので、月額0円で本番運用できているのもポイント。5分ごとに実行しても、無料枠をはるかに下回る使用量です。

使った技術をマインドマップで整理すると、こんな感じです:

```mermaid
mindmap
  root((Hyperliquid<br/>FR Bot))
    ランタイム
      Bun 1.0+
        TypeScript Native
        高速パッケージ管理
        ホットリロード
    Webフレームワーク
      Hono 4.10
        軽量高速
        型推論強力
        マルチランタイム
    コード品質
      Biome 2.3
        Lint + Format
        超高速 Rust製
        ゼロコンフィグ
    インフラ
      Docker
        マルチステージビルド
        Alpine ベース
      GCP
        Cloud Run
        Artifact Registry
      Terraform
        IaC
        バージョン管理
    外部サービス
      Hyperliquid API
        FR取得
      Telegram Bot API
        通知送信
```

## 動かしてみたい方へ

リポジトリは公開しているので、試してみたい方はどうぞ:

```bash
git clone https://github.com/mashharuki/simple_bot
cd simple_bot
bun install

# .envファイルにTelegram credentialsを設定
cp .env.example .env

# 開発サーバー起動
bun run dev
```

閾値を変えたり、通知メッセージのフォーマットを変えたり、Discord/Slackに対応させたり、好きに改造してもらえればと思います。Cloud Runにデプロイすれば、24時間稼働も簡単です。

応用するなら、他のAPIを監視するBotに改造するのも面白いかもしれません。株価、天気、ニュースなど、定期監視したいAPIは色々あるので。データをFirestoreに溜めて分析したり、Next.jsでダッシュボードを作ったりするのも良さそうです

## 参考リンク

**ソースコード:**
https://github.com/mashharuki/simple_bot

**公式ドキュメント:**
- [Bun](https://bun.sh/)
- [Hono](https://hono.dev/)
- [Biome](https://biomejs.dev/)
- [Terraform](https://www.terraform.io/)
- [Google Cloud Run](https://cloud.google.com/run)
- [Hyperliquid](https://hyperliquid.xyz/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

質問や改善案があれば、GitHubのIssueやZennのコメント欄でお気軽にどうぞ。
