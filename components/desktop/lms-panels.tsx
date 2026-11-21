import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { appsInGroup, type DesktopAppId } from "@/lib/desktop/apps";
import { AppGlyph } from "./app-glyph";
import { useSpace } from "./space-context";
import { useWindowNavigation } from "./window-navigation";

export function LmsHub({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  const { t, label } = useSpace();
  return <LmsUiScope><div className="os-panel"><h1>Gee-O LMS</h1><p>{t("Quản lý học tập và giảng dạy trong Geeospace.", "Teaching and learning management in Geeospace.")}</p><div className="os-app-group-grid">{appsInGroup("lms").filter(app => app.id !== "lms").map(app => <button key={app.id} onClick={() => onOpen(app.id)}><AppGlyph id={app.id} /><span>{label(app.id)}</span></button>)}</div></div></LmsUiScope>;
}
export function LmsPlaceholder({ id }: { id: DesktopAppId }) {
  const { t, label, description } = useSpace();
  const { path, navigate } = useWindowNavigation();
  return <LmsUiScope><div className="os-panel"><div className="os-module-heading"><AppGlyph id={id} /><h1>{label(id)}</h1></div><p>{description(id)}</p><section className="os-unavailable"><h2>{t("Đang chuyển sang Geeospace", "Being moved to Geeospace")}</h2><p>{t("Chức năng sẽ được kết nối trong giai đoạn tiếp theo.", "This feature will be connected in the next phase.")}</p></section><p>{t("Đường dẫn hiện tại", "Current path")}: <output data-window-path>{path || "/"}</output></p><div className="os-panel-links"><button onClick={() => navigate("123")}>{t("Chi tiết mẫu", "Sample detail")}</button><button onClick={() => navigate("123/overview")}>{t("Tổng quan mẫu", "Sample overview")}</button></div></div></LmsUiScope>;
}
