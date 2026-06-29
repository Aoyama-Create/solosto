---
created: 2026-06-22
status: accepted   # proposed | accepted | superseded
tags: [decision, notification, reliability, pwa, portable]
supersedes:
superseded_by:
---

# 通知はプル型を主・Web Pushを従とし、信頼性3層で買い忘れを防ぐ

<!-- ファイル名は YYYY-MM-DD-kebab-title.md。同日複数は末尾に -2 等 -->

## ステータス
accepted

## コンテキスト / 背景
メインターゲットは iPhone の Safari PWA。iOS の Web Push は配信が不安定で「届かないことがある」。
Push の到達を前提に設計すると、届かなかった日にユーザーが静かに買い忘れる。
それでも「買い忘れない」ことがアプリの核心価値。
参照: システム定義書_v2.md 1.3 / 2.9。

## 決定
**Push の到達を信頼の土台にしない**。「アプリを開けば必ず最新の買うべきリストが見える」をベースに置き、
Push は気づくきっかけと位置づける。信頼性を3層で担保する。
1. **バッジ**: 数字 = 現在の pending 件数。Push受信時（SWが `setAppBadge`）+ アプリ起動時（サーバー問い合わせで再設定）の二重経路。0件で `clearAppBadge()`。
2. **プル型（最後の砦）**: アプリ起動時に通知に依存せず最新リストを再計算表示。
3. **送信ログ + 失効検知**: notifications に `delivery_status`（sent/failed/expired）。push_subscriptions の全行に送信し、410/404 の行だけ削除。全行消滅で「通知が止まっています」をアプリ内告知。

## 却下した代替案
- **Web Push 単独で通知を成立させる** → 却下。iOS の配信不安定により買い忘れリスクが残る。
- **専用 KeepAlive バッチ（GAS等）で配信を補強** → 却下（別軸だが関連）。毎時/毎日のバッチが必ずDBを触るため Supabase 休眠は自然回避でき、追加バッチは不要。

## トレードオフ / 結果
- 得たもの: 配信チャネルが失敗しても、開けば真実が再計算される耐障害性。`sent`(201) が端末表示を保証しない問題もバッジ＋プル型で吸収。
- 失ったもの: 「Pushが来れば即わかる」体験の確実性は諦める（あくまできっかけ）。実装は3経路ぶん増える。

## 蒸留した原則
- [[resilient-by-recompute-on-open]]
