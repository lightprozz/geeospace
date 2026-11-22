import { lazy, Suspense, type ComponentType } from "react";
import { ArrowRight, CalendarDays, CircleHelp, Link2, ListTodo, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { desktopApps, type DesktopAppId } from "@/lib/desktop/apps";
import { WorkspaceRegionBoundary } from "@/components/workspace-region";
import { useSpace } from "./space-context";
import { AppGlyph } from "./app-glyph";
import { AccountPanel } from "./account-panel";
import { isGeeoConfigured } from "@/lib/env";
import { useAuthStore } from "@/stores/use-auth-store";

type PanelProps = { id: DesktopAppId; onOpen: (id: DesktopAppId) => void };

function UnconfiguredAccountPanel({ onOpen }: PanelProps) {
  const { t } = useSpace();
  return <div className="os-panel os-account-panel"><span className="os-panel-symbol"><ShieldCheck size={30} /></span><p className="os-eyebrow">GEE-O AUTH</p><h1>{t("Kết nối đăng nhập chưa được thiết lập.", "Sign-in is not configured yet.")}</h1><p>{t("Ứng dụng cần được đăng ký với Gee-O Auth trước khi bạn có thể đăng nhập. Hiện tại chưa có phiên đăng nhập hoặc dữ liệu cá nhân được tải.", "Geeospace must be registered with Gee-O Auth before sign-in is available. No session or personal data has been loaded.")}</p><div className="os-info"><LockKeyhole size={17} /><span>{t("Bạn không cần tạo tài khoản Geeospace riêng. Quản trị hệ thống cần hoàn tất client, callback và kiểm chứng xác thực tập trung.", "Your Gee-O account is all you need. System administrators must complete the client, callback and central authentication checks.")}</span></div><button className="os-button os-button-secondary" onClick={() => onOpen("today")}>{t("Về Hôm nay ", "Back to Today ")}<ArrowRight size={16} /></button></div>;
}
function AssistantPanel({ onOpen }: PanelProps) {
  const { t, label } = useSpace();
  return <div className="os-assistant"><div className="os-assistant-content"><span className="os-ai-symbol"><Sparkles size={30} /></span><p className="os-eyebrow">{t("TRỢ LÝ GEE-O", "GEE-O ASSISTANT")}</p><h1>{t("Bạn cần tìm điều gì?", "What are you looking for?")}</h1><p>{t("Một nơi để hỏi, tìm hướng dẫn và mở đúng chức năng.", "Ask questions, find guidance and open the right feature.")}</p><div className="os-suggestions">{(["calendar", "requests", "learning"] as const).map((app) => <button key={app} onClick={() => onOpen(app)}><AppGlyph id={app} /><span>{label(app)}</span><ArrowRight size={15} /></button>)}</div><div className="os-info"><Link2 size={17} /><span>{t("Dify Cloud chưa được kết nối. Các nút bên trên mở chức năng trong ứng dụng; chưa có câu trả lời AI.", "Dify Cloud is not connected. These buttons open app features; AI responses are not available yet.")}</span></div></div><div className="os-chat-composer"><input aria-label={t("Tin nhắn cho trợ lý", "Message the assistant")} placeholder={t("Kết nối Dify để bắt đầu trò chuyện", "Connect Dify to start chatting")} disabled /><button aria-label={t("Gửi tin nhắn, chưa kết nối Dify", "Send message, Dify is not connected")} disabled><ArrowRight size={19} /></button></div></div>;
}
function TodayPanel({ onOpen }: PanelProps) {
  const { t } = useSpace();
  return <div className="os-panel os-today-panel"><div className="os-profile"><span className="os-profile-mark" aria-hidden="true">g.</span><div><p className="os-eyebrow">{t("KHÔNG GIAN GIÁO VIÊN & NHÂN VIÊN", "A SPACE FOR TEACHERS & STAFF")}</p><span className="os-profile-name">Geeospace</span><span className="os-connection"><i />{t("Chưa kết nối Gee-O", "Gee-O is not connected")}</span></div></div><h1>{t("Bắt đầu một ngày rõ ràng.", "Start your day with clarity.")}</h1><p>{t("Lịch sắp tới, việc cần làm và cập nhật dành cho bạn.", "Your upcoming schedule, tasks and updates.")}</p><button className="os-button" onClick={() => onOpen("account")}>{t("Xem trạng thái kết nối ", "View connection status ")}<ArrowRight size={16} /></button><div className="os-section-title"><span>{t("NGÀY LÀM VIỆC CỦA BẠN", "YOUR WORK DAY")}</span><span>UTC+7</span></div><WorkspaceRegionBoundary title={t("Sắp tới", "Coming up")}><section className="os-source"><CalendarDays size={19} /><div><h2>{t("Sắp tới", "Coming up")}</h2><strong>{t("Chưa kết nối dữ liệu", "Data is not connected")}</strong><p>{t("Buổi dạy và lịch cá nhân cần phiên đăng nhập hợp lệ.", "Teaching sessions and personal schedules need a valid sign-in session.")}</p><button className="os-text-button" onClick={() => onOpen("calendar")}>{t("Mở lịch làm việc ", "Open schedule ")}<ArrowRight size={14} /></button></div></section></WorkspaceRegionBoundary><WorkspaceRegionBoundary title={t("Cần tôi xử lý", "Needs my attention")}><section className="os-source"><ListTodo size={19} /><div><h2>{t("Cần tôi xử lý", "Needs my attention")}</h2><strong>{t("Cần xác thực trước", "Sign-in required")}</strong><p>{t("Chưa thể xác định bạn có việc cần xử lý hay không.", "Pending tasks cannot be determined until your data is available.")}</p><small>{t("Đã đọc và đã xử lý là hai trạng thái khác nhau.", "Read and resolved are separate states.")}</small></div></section></WorkspaceRegionBoundary><div className="os-panel-links"><button onClick={() => onOpen("lms")}>{t("Lớp & giảng dạy ", "Classes & teaching ")}<ArrowRight size={14} /></button><button onClick={() => onOpen("work")}>{t("Công & lương ", "Work & pay ")}<ArrowRight size={14} /></button></div></div>;
}
function UnconnectedPanel({ id, onOpen }: PanelProps) {
  const { t, label, description } = useSpace();
  return <div className="os-panel"><div className="os-module-heading"><AppGlyph id={id} /><div><p className="os-eyebrow">{t("KHÔNG GIAN CỦA BẠN", "YOUR SPACE")}</p><h1>{label(id)}</h1></div></div><p>{description(id)}</p><section className="os-unavailable"><CircleHelp size={28} /><h2>{t("Chưa kết nối dữ liệu", "Data is not connected")}</h2><p>{id === "lms" ? t("Đích LMS và phiên Gee-O Auth chưa được thiết lập. Khi kết nối, ứng dụng sẽ mở đúng lớp hoặc buổi dạy bạn được phép truy cập.", "The LMS destination and Gee-O Auth session are not configured. Once connected, the app opens the class or session you can access.") : t("Nguồn nghiệp vụ cần phiên đăng nhập Gee-O hợp lệ trước khi hiển thị thông tin của bạn.", "A valid Gee-O session is required before your work information can be displayed.")}</p><button className="os-button os-button-secondary" onClick={() => onOpen("account")}>{t("Xem trạng thái kết nối ", "View connection status ")}<ArrowRight size={16} /></button></section><p className="os-footnote">{t("Chưa có dữ liệu để hiển thị. Không suy ra trạng thái công việc hoặc số tiền khi nguồn chưa sẵn sàng.", "No data is available yet. Work status and amounts remain unknown until their sources are connected.")}</p></div>;
}

const LmsHub = lazy(() => import("./lms-panels").then(module => ({ default: module.LmsHub })));
const StudentsPanel = lazy(() => import("@/features/students/students-panel").then(module => ({ default: module.StudentsPanel })));
const LmsPlaceholder = lazy(() => import("./lms-panels").then(module => ({ default: module.LmsPlaceholder })));
const ClassesPanel = lazy(() => import("@/features/lms/classes/classes-panel"));
const SchedulePanel = lazy(() => import("@/features/lms/apps/schedule/panel"));
const TimetablePanel = lazy(() => import("@/features/lms/apps/timetable/panel"));
const AttendancePanel = lazy(() => import("@/features/lms/apps/attendance/panel"));
const HolidaysPanel = lazy(() => import("@/features/lms/apps/holidays/panel"));
const UsersPanel = lazy(() => import("@/features/lms/panels/management-panel").then(module => ({ default: module.UsersPanel })));
const RolesPanel = lazy(() => import("@/features/lms/panels/management-panel").then(module => ({ default: module.RolesPanel })));
const BranchesPanel = lazy(() => import("@/features/lms/panels/management-panel").then(module => ({ default: module.BranchesPanel })));
const panels: Partial<Record<DesktopAppId, ComponentType<PanelProps>>> = {
  ...Object.fromEntries(desktopApps.filter(app => app.group !== "workspace" && app.id !== "requests" && app.id !== "work").map(app => [app.id, LmsPlaceholder])),
  "lms-students": StudentsPanel,
  "lms-classes": ClassesPanel,
  "lms-schedule": SchedulePanel, "lms-timetable": TimetablePanel, "lms-attendance": AttendancePanel, "lms-holidays": HolidaysPanel,
  "lms-curriculum": lazy(() => import("@/features/lms/curriculum/panel")),
  "lms-lets-learn": lazy(() => import("@/features/lets-learn/panel")),
  "lms-materials": lazy(() => import("@/features/lms/materials/panel")),
  account: props => isGeeoConfigured ? <AccountPanel /> : <UnconfiguredAccountPanel {...props} />, assistant: AssistantPanel, today: TodayPanel, lms: LmsHub, staff: LmsHub, admin: LmsHub,
  "lms-branches": BranchesPanel, "lms-roles": RolesPanel, "lms-users": UsersPanel,
  "lms-worklog": lazy(() => import("@/features/lms/worklog/worklog-panel").then(module => ({ default: module.WorklogPanel }))),
};
export function AppPanel(props: PanelProps) {
  const { t, label } = useSpace();
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const loading = useAuthStore(state => state.isLoading);
  if (desktopApps.find(app => app.id === props.id)?.group !== "workspace" && !authenticated) {
    return <div className="os-panel os-lms-gate"><h1>{label(props.id)}</h1>{loading ? <p role="status">{t("Đang tải phiên đăng nhập…", "Loading your session…")}</p> : <><h2>{t("Đăng nhập Gee-O để dùng LMS", "Sign in to Gee-O to use the LMS")}</h2><button className="os-button" onClick={() => props.onOpen("account")}>{t("Mở Tài khoản", "Open Account")}</button></>}</div>;
  }
  const Panel = panels[props.id] ?? UnconnectedPanel;
  return <Suspense fallback={<div className="os-panel" role="status">…</div>}><Panel {...props} /></Suspense>;
}
