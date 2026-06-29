# 他プロジェクト流用プレイブック集（portable playbooks）

このプロジェクトで得た、**solosto 固有の業務要件に依存しない汎用ノウハウ**を、他プロジェクトへコピーして使える形でまとめた索引兼要約。
各節は「課題 / 汎用解 / 他PJへの適用 / 出典（この repo の最新）」。詳細・最新は **出典リンク先**が正。

> **メンテナンス方針**（陳腐化させない）
> - 流用可能な原則/手順を `docs/notes/` `docs/decisions/` に書いたら、その frontmatter `tags` に **`portable`** を付け、本ファイルに対応する節を**追加/更新**する（[CLAUDE.md](../CLAUDE.md) docs運用ルール8）。
> - 出典 note が大きく変わったら、本ファイルの要約も見直す（各節は要約＋出典リンクなので、詳細の二重管理は最小）。
> - **棚卸し監査**: `grep -rl "portable" docs/notes docs/decisions` で出た**原則ノート/ADR は、本ファイルに対応する節を必ず持つ**こと（orphan を作らない）。抜けがあれば節を追加。
>   - 運用手順系の節（§1 デプロイ・§5〜§7・§9）は `notes/deploy.md` `notes/local-setup.md` やコード/設定が出典で、タグ管理ではなく直接リンクで追従する。

---

## 1. Vercel ＋ Supabase Cloud への素直なデプロイ骨子
- **課題**: マネージド構成（Next.js on Vercel ＋ Supabase）の本番化で、env・マイグレーション・Auth 設定の手順が散らばりがち。
- **汎用解**: ①Supabase Cloud プロジェクト作成→②`supabase link --project-ref <id>`＋`db push` でスキーマ/RLS/トリガー適用→③env を Vercel に登録（公開系 `NEXT_PUBLIC_*` と秘匿系を分離）→④Auth 設定はダッシュボードで別途（後述3）。
- **他PJへの適用**: env の「公開/秘匿」を最初に表で棚卸し。鍵生成（VAPID 等）は一度だけで固定。`db push` 前に migrations が冪等か確認。
- **出典**: [notes/deploy.md](notes/deploy.md)

## 2. 有料プラン不要の定期実行（cron）
- **課題**: Vercel Hobby は毎時 Cron 不可（日1回まで）。だが「時」粒度のバッチを無料で回したい。
- **汎用解**: バッチを **冪等で認証付きの HTTP エンドポイント**（例 `/api/cron`、`Authorization: Bearer <SECRET>`）にし、トリガは外部スケジューラ（GitHub Actions `schedule` / cron-job.org）から叩く。プラン変更や別ホスト移行はトリガ差し替えのみでコード不変。
- **他PJへの適用**: ジョブを HTTP 化＋秘密で保護→GitHub Actions の `schedule` で `curl`（secrets に URL/SECRET）。スケジュール粒度と判定ロジック粒度を合わせれば分単位の遅延は許容。
- **出典**: [[decouple-schedule-from-host]] / [[decisions/2026-06-28-cron-via-external-scheduler-on-hobby]] / [notes/deploy.md](notes/deploy.md) §5.5（`.github/workflows/notify-cron.yml`）

## 3. マネージド設定はマイグレーションに乗らない（config drift）
- **課題**: `db push` はスキーマを移すが、Auth ポリシー・メール確認・レート上限・SMTP・リダイレクト URL・環境変数は**移さない**。ローカルで自明に効く挙動が本番で抜ける。
- **汎用解**: 「コードに乗らないプラットフォーム設定」を**環境ごとのチェックリスト**にする。ローカルで自明な前提ほど本番で疑う。
- **他PJへの適用**: 例: Supabase は本番で「Email の Confirm」を OFF にしないと、確認メール送信でレート上限＋即セッションが張られず遷移しない（ローカルは autoconfirm）。
- **出典**: [[managed-config-outside-migrations]]

## 4. Web Push（web-push ＋ VAPID）の最小・堅牢構成
- **課題**: Web Push は「届かないことがある」。鍵管理・失効・バッジ更新を雑にやると壊れる。
- **汎用解**: ①VAPID 鍵は**一度生成して固定**（変えると全購読失効）／②**秘密鍵はサーバ専用**（`import "server-only"`）／③送信時 **410・404 は購読失効→その行を削除**、他は残す／④バッジは **Push受信時（SW `setAppBadge`）＋アプリ起動時（サーバ問い合わせ）の二重経路**／⑤届かない前提で**プル型**（開けば再計算）を最後の砦に。
- **他PJへの適用**: 購読は `endpoint` をキーに重複排除。送信ロジックを純粋判定（失効分類・ペイロード整形）と副作用（実送信）に分けてテスト可能に。
- **出典**: `lib/push/*`（`send.ts`/`delivery.ts`/`state.ts`）/ [[decisions/2026-06-22-pull-first-notification-reliability]] / [[resilient-by-recompute-on-open]]

## 5. Supabase RLS の手前に GRANT が要る
- **課題**: 生 SQL マイグレーションで作ったテーブルは API ロール（authenticated/service_role）に DML 権限が**自動付与されない** → RLS 以前に `permission denied`。
- **汎用解**: 別マイグレーションで `grant select,insert,update,delete on all tables ... to authenticated, service_role` ＋ `alter default privileges`。RLS は行レベルの可視範囲を引き続き支配（GRANT＝テーブル到達可否、RLS＝行可否、の二段）。
- **他PJへの適用**: 「GRANT（到達）」と「RLS（行）」を別概念として両方用意。新規テーブルにも default privileges で自動付与。
- **出典**: [notes/local-setup.md](notes/local-setup.md) つまずきメモ / `supabase/migrations/*_grants.sql`

## 6. クライアント SDK は「生成型」と歩調を合わせてピン留め
- **課題**: 自動生成型に依存する SDK（例 supabase-js × CLI 型生成）は、片方だけ上げると型が壊れる（`.select()` が `never` 化）。
- **汎用解**: **SDK と型生成ツールのバージョンを意図的にピン**。上げるときは両方そろえて再生成し、型が通ることを確認してからコミット。
- **他PJへの適用**: lockfile＋明示ピン＋「上げ方手順」をメモに残す（なぜ固定かを書く）。
- **出典**: [notes/local-setup.md](notes/local-setup.md) つまずきメモ（supabase-js 2.45.4 固定）

## 7. E2E は本番ビルドに対して実行する
- **課題**: Playwright を `next dev` に当てると、ルート単位コンパイル/ハイドレーション遅延で「フォーム送信ボタンが効かない（送信前クリック）」等の不安定が出る。
- **汎用解**: webServer を **`build && start`（本番ビルド）** にする。per-route compile が消えて高速・安定（並列も効く）。
- **他PJへの適用**: signup 等「直後にリダイレクトが走る」操作の後は `goto` を避け UI 導線 or 沈静化待ち。SegmentedControl 等の隠し input は可視ラベルをクリック。
- **出典**: `playwright.config.ts`（webServer）/ [notes/local-setup.md](notes/local-setup.md)

## 8. 品質ゲートは二段（手元＝速い / CI＝最終権威）
- **課題**: チェックが CI だけだと遅く、手元だけだと信頼できない。
- **汎用解**: 手元の完了時フック（例 `prettier --check && eslint && tsc`）で速く弾き、**CI を最終権威**に同一判定を再実行。ゲートにテスト/ビルドは入れず（遅い）CI 側へ。
- **他PJへの適用**: `pnpm check` 相当を1コマンド化＋エディタ/Stop フックに接続。CI で check→test→build。
- **出典**: [[shift-checks-left-ci-authoritative]] / [[decisions/2026-06-22-quality-gate-two-tier]]

## 9. 「第二の脳」: コードと同居する知識層の運用
- **課題**: 設計判断・つまずきが人の頭/チャットに消えて再利用されない。
- **汎用解**: `docs/` に **decisions（ADR・凍結追記）→ notes（1概念に蒸留・wikilink）→ maps（MOC）** の三層。references（要件）は凍結し、判断は ADR で差分記録。AI/人間が読みつつ自分で更新し続ける。
- **他PJへの適用**: テンプレ（adr/note）＋ README に「歩き方」＋ CLAUDE.md/エディタルールに「更新義務」を明記。`portable` タグで横展開可能な学びを棚卸し（本ファイルがその索引）。
- **出典**: [README.md](README.md)（docs運用ルール）/ [docs/README.md](README.md)

## 10. 純粋ロジックは分離して単体テスト、副作用は薄ラッパ
- **課題**: DB/ブラウザ/送信などの副作用に絡むと、肝心のロジックがテストできない。
- **汎用解**: 判定・計算・整形を**純粋関数**（入力→出力）に切り出し Vitest で固める。副作用は薄いラッパに閉じ込め、結合は smoke/E2E で確認。
- **他PJへの適用**: 「状態判定」「集計」「整形」を `lib/domain` 的な層へ。ブラウザAPIは `isX()/doX()` の薄関数、純粋部は別ファイル。
- **出典**: `lib/domain/*`（cycle/pricing/notify 等）/ `lib/push/state.ts`（判定）＋`client.ts`（副作用）

## 11. 派生値は持たず「真実の源」から都度導く（derive-on-read）
- **課題**: 集計値（合計・最小・平均・派生フラグ）を専用カラムに持つと、元データ変更/削除で不整合が静かに生まれる。
- **汎用解**: **生イベント/原データを単一の真実の源**にし、派生値は**読み出し時に集計**（または明示的な再計算）。粒度は記録時点をコピー保存し、集計の粒度は読み出し時に選ぶ。
- **他PJへの適用**: 「このカラムは何の二重持ちか？」を疑い、消せる派生カラムは消す。パフォーマンス上必要ならキャッシュは“導出物”と明示し、再計算経路を必ず残す。
- **出典**: [[single-source-of-truth]] / [[choose-aggregation-grain-late]]

---

## 流用の仕方
1. 必要な節を選び、**出典リンク先の実コード/手順**を開く（最新はそちらが正）。
2. その節の「他PJへの適用」を満たすよう移植。app 固有の業務語（在庫・サイクル・銘柄横断 等）は外し、汎用部分だけ持っていく。
3. 移植先で得た新しい学びは、移植先の知識層に同じ作法（ADR→note→`portable` タグ→playbook）で還元する。
