# ルナネコ式 月牌バトル

ルナネットを舞台にした、オリジナルIPのスマホ向けカードバトル。

## 公開版

- ゲーム: https://lunaneco.github.io/luneko-card-battle/
- リポジトリ: https://github.com/Lunaneco/luneko-card-battle
- mainへpushするとGitHub Actionsがテスト・ビルドし、GitHub Pagesへデプロイする。
- 公開版ではストーリーとCPU対戦が遊べる。オンライン対戦には別のWebSocketサーバーが必要。

## ローカル起動

```bash
cd game
npm ci
npm test
npm run dev
```

オンライン用サーバーは別ターミナルで起動する。

```bash
cd game
npm run server
```

ルームコード4文字を共有して対戦する。

## 公開ビルド

```bash
cd game
npm run build -- --base=/luneko-card-battle/
npm run preview -- --base=/luneko-card-battle/
```

オンライン用サーバーをHTTPS対応ホストへ配置したら、ビルド時に
VITE_WS_URL=wss://サーバーのURL を設定する。検証時はゲームURLに
?ws=wss://サーバーのURL を付けても接続できる。ローカルHTTP版は8787番ポートを使う。

## 遊び方

1. パートナー3体から1体を選ぶ。
2. 街のコートマスターを倒して8つのバッジを集め、塔のゼロヒトに挑む。
3. ○・△・×を同時に出して読み合う。
4. 進化ポイントと月殻で相棒を成長させる。
5. 相手を先に3体倒すと勝利。

## 構成と検証

- game/src/engine/ — バトルエンジン
- game/src/ui/ — 画面と戦闘演出
- game/public/ — 実行用の画像・GIF・音声
- game/server/ — WebSocketルームサーバー
- game/tests/ — 自動テスト

全170体の専用攻撃GIFを○・△・×へ接続。威力0・無効化でも再生する。
動きを減らす設定では静止PNGを表示する。attack-gallery.htmlで各キャラを確認できる。

```bash
cd game
npm test
node --import tsx scripts/check-all-attack-routes.ts
E2E_URL=http://127.0.0.1:5173/ node scripts/check-real-attacks.mjs
E2E_URL=http://127.0.0.1:5173/ node scripts/check-attack-gallery.mjs
E2E_URL=http://127.0.0.1:5173/ node scripts/check-static-deployment.mjs
```

公開用ビルドで275テスト、全510組の攻撃経路、通常CPU・ストーリーの○△×、
再戦・スキップ、全340攻撃資産・16音声、図鑑の表示と3キャラの音声再生を確認した。
検証スクリプトの出力はローカルのstudio/へ保存する。

このリポジトリは実行・保守に必要なゲームのソースと資産のみを収録する。
監査資料・生成原本・参照原本・仮想環境・ビルド出力・認証情報は公開しない。
