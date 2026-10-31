import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { WorkspaceRegion } from "@/components/workspace-region";

it("keeps an unavailable source distinct from empty, forbidden and loading neighbours", () => {
  const html = renderToStaticMarkup(createElement("main", null,
    createElement(WorkspaceRegion, { title: "Lịch", state: "unavailable" }),
    createElement(WorkspaceRegion, { title: "Yêu cầu", state: "ready" }, "Nội dung nguồn còn khả dụng"),
    createElement(WorkspaceRegion, { title: "Tự học", state: "empty" }),
    createElement(WorkspaceRegion, { title: "Công", state: "forbidden" }),
    createElement(WorkspaceRegion, { title: "Thông báo", state: "loading" }),
  ));
  expect(html).toContain("Nội dung nguồn còn khả dụng");
  expect(html).toContain("Không thể xác định kết quả hiện tại");
  expect(html).toContain("Không có dữ liệu trong phạm vi đang xem");
  expect(html).toContain("Bạn chưa có quyền");
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain("Thử lại");
});
