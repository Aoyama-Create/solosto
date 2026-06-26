---
created: 2026-06-26
status: accepted   # proposed | accepted | superseded
tags: [decision, domain, product-state]
supersedes:
superseded_by:
---

# 新規登録した商品の初期 status は pending とする

## ステータス
accepted

## コンテキスト / 背景
Phase 2a の商品登録（API-011 / SCR-011）で、新規商品の初期 status を何にするか決める必要があった。
state_diagram は `[*] --> R_pending: 定期品を新規登録 / リストに追加` と明記し、DB の products.status 既定も `pending`。
一方「在庫があるものをカタログ的に登録したいだけ」のケースでは pending（買うものリスト入り）が過剰にも見える。

## 決定
**新規商品は status='pending'（買うものリストに乗る）** とする（state_diagram・DB既定に従う）。
- 「登録＝これから買う/リストに入れたい」を既定の意図と解釈。
- 在庫十分なら、登録後に商品一覧/編集から「引っ込める」(API-016, withdrawToIdle) で idle にできる。

## 却下した代替案
- **新規を idle で開始** → 却下。state_diagram と DB 既定に反する。買い忘れ防止アプリの主目的（買うものを上げる）に対し、登録直後にリストへ出ない方が初心者には分かりにくい。
- **登録フォームに「在庫あり(idle)で登録」トグル** → 保留。要望が出たら追加する余地として残す（2a では作らない）。

## トレードオフ / 結果
- 得たもの: 仕様・DB と一致し実装が単純。登録物がすぐ「買うもの」に出て主目的に沿う。
- 失ったもの: 純カタログ登録には一手間（登録→引っ込め）。将来トグルで吸収可能。
- 注: シードの既存在庫は service_role 直挿しで idle にしている（既存ストックの表現）。新規登録経路（pending）とは意図が異なるため不整合ではない。

## 関連
- COM-015 状態遷移（[[domain-rules]] スキル）。
