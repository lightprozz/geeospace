"use client";

import { useSpace } from "./desktop/space-context";
import { Component, type ReactNode } from "react";

export type RegionState = "ready" | "loading" | "empty" | "forbidden" | "unavailable";
type Props = { title: string; state: RegionState; children?: ReactNode; onRetry?: () => void };
const messages: Record<Exclude<RegionState, "ready">, string> = {
  loading: "Đang tải dữ liệu…",
  empty: "Không có dữ liệu trong phạm vi đang xem.",
  forbidden: "Bạn chưa có quyền xem nội dung này.",
  unavailable: "Chưa tải được dữ liệu. Không thể xác định kết quả hiện tại.",
};

/** The owning adapter supplies state: a failed read must never look like an empty result. */
export function WorkspaceRegion({ title, state, children, onRetry }: Props) {
  const { t } = useSpace();
  const english = { loading: "Loading data…", empty: "No data in this view.", forbidden: "You do not have permission to view this content.", unavailable: "Data could not be loaded. The current result is unknown." };
  return <section className="workspace-region" aria-label={title} aria-busy={state === "loading"}>
    {state === "ready" ? children : <div className="workspace-region-state" role={state === "unavailable" ? "alert" : "status"}>
      <h2>{title}</h2><p>{t(messages[state], english[state])}</p>
      {state === "loading" && <span className="workspace-region-skeleton" aria-hidden="true" />}
      {state === "unavailable" && onRetry && <button className="os-button os-button-secondary" onClick={onRetry}>{t("Thử lại", "Retry")}</button>}
    </div>}
  </section>;
}

/** A broken client widget leaves neighbouring sources and navigation available. */
export class WorkspaceRegionBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <WorkspaceRegion title={this.props.title} state="unavailable" onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}
