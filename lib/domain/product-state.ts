// COM-015 状態遷移（購入以外）。type×status の遷移を純粋関数で制御する。
// 不変条件: type/status/is_notify_enabled は独立。spot×tracking は存在しない。
// is_notify_enabled はここでは触らない（呼び出し側で変更しない＝独立を保つ）。

export type ProductType = "recurring" | "spot";
export type ProductStatus = "pending" | "tracking" | "idle";
export type ProductState = { type: ProductType; status: ProductStatus };

// spot×tracking はありえない状態。
export function isImpossible(state: ProductState): boolean {
  return state.type === "spot" && state.status === "tracking";
}

// 種別変更。recurring/tracking → spot は一旦 idle に着地（履歴は別途残る）。
// それ以外は status を保持。spot×tracking を絶対に作らない。
export function changeType(state: ProductState, newType: ProductType): ProductState {
  if (newType === state.type) return { ...state };
  let status = state.status;
  if (newType === "spot" && status === "tracking") {
    status = "idle"; // tracking 中の単発化は idle 着地
  }
  return { type: newType, status };
}

// 手動投入（買うものリストへ）: idle → pending。
export function addToList(state: ProductState): ProductState {
  return { ...state, status: "pending" };
}

// 引っ込め（買わずに眠らせる）: pending → idle。
export function withdrawToIdle(state: ProductState): ProductState {
  return { ...state, status: "idle" };
}
