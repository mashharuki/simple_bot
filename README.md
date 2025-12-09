# Hyperliquid FR Notification Bot

HyperliquidのFunding Rate (FR) を監視し、設定した閾値 (デフォルト: 1時間あたり ±0.01%) を超えた場合にTelegramで通知するPython製Botです。

## 特徴
- **リアルタイム監視**: 5分ごとにFRをチェックします (設定変更可能)。
- **異常値検知**: ロング過多 (正の乖離) とショート過多 (負の乖離) の両方を検知します。
- **Telegram通知**: 銘柄名、現在のFR、年率換算 (APR)、および傾向 (Long/Short Heavy) を詳細に通知します。
- **Docker対応**: 1コマンドで簡単にデプロイ・起動可能です。

## 前提条件
1. **Telegram Bot Token**:
    - Telegramで [@BotFather](https://t.me/BotFather) に話しかけます。
    - `/newbot` コマンドで新しいBotを作成し、HTTP API Tokenを取得してください。
2. **Chat ID**:
    - Telegramで [@userinfobot](https://t.me/userinfobot) (または類似のBot) に話しかけて、あなたのChat IDを取得してください。

## セットアップと起動

### 1. 設定 (Configure)
1. ルートディレクトリにある `.env.example` をコピーして、`.env` という名前のファイルを作成します:
   ```bash
   cp .env.example .env
   ```
2. 作成した `.env` ファイルをテキストエディタで開き、`=` の後ろに取得した値を貼り付けて保存してください。
   
   **設定例:**
   ```ini
   # BotFatherから取得したトークン
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqRSTuvwXYZ
   
   # userinfobotから取得した数字のID
   TELEGRAM_CHAT_ID=987654321
   
   # 閾値 (0.0001 = 0.01%)
   FR_THRESHOLD=0.0001
   
   # チェック間隔 (秒)
   CHECK_INTERVAL_SECONDS=300
   ```

### 2. Dockerで起動 (推奨)
```bash
docker compose up -d
```
ログを確認するには:
```bash
docker compose logs -f
```

### 3. ローカル (Python) で起動
```bash
pip install -r requirements.txt
python src/main.py
```

## トラブルシューティング
- 通知が届かない場合: 閾値 (0.01%) を超えている銘柄が現在ない可能性があります。一時的に `.env` の `FR_THRESHOLD` を下げてテストしてください。