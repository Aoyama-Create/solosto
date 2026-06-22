---
created: 2026-06-22
tags: [principle/domain-logic]
source: "[[decisions/2026-06-22-per-unit-cycle-calculation]]"
confidence: medium   # low | medium | high（複数経験で裏付くほど上げる）
---

# 量がばらつく事象は、単位を正規化してから時系列を測る

## 主張
一般に、観測のたびに「量」が変わる事象（まとめ買い、バッチサイズ、ロット）から周期や速度を推定するときは、
**まず1単位あたりの量に正規化してから時間軸で測る**。生の「イベント間隔」をそのまま周期に使うと、
量の大小が周期推定を汚染する。`1単位あたりの基準量 = 間隔 ÷ そのとき消費した量`、
`次回 = 前回 + 基準量 × 今回の量` の形にすれば、量のばらつきに頑健になる。

## 根拠となった経験
- [[decisions/2026-06-22-per-unit-cycle-calculation]] で `per_unit_cycle_days = 購入間隔 ÷ 前回 total_units` を基準量とし、`next_order_date = 前回購入日 + per_unit_cycle_days × 今回 total_units` でロット差を吸収した。

## 反例 / 例外
- [要確認] 消費速度が量に対して非線形（買い置きが多いほど浪費が増える/減る等）な場合、線形スケールの仮定が崩れる。MVPでは線形近似で十分と判断。
- 正規化の分母に使う「そのときの量」は、後から変わらないよう記録時点で固定保存すること（[[single-source-of-truth]] と接続）。

## 関連
- [[single-source-of-truth]]
