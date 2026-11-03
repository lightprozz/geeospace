import { connectSpaceOS } from "./bridge.mjs";
import { filterEvents, parseSnapshot, sourceState } from "./notification-model.mjs";

const copy = {
  vi: {
    identity: "Thông báo", subtitle: "Cập nhật trong không gian của bạn", sources: "Nguồn thông báo", sourceFilter: "Lọc theo nguồn", subjects: "Chủ đề", subjectFilter: "Lọc theo chủ đề",
    preferences: "Tùy chọn hiển thị", privacy: "Thông tin dành riêng cho tài khoản của bạn.", workspace: "KHÔNG GIAN CỦA BẠN", allUpdates: "Tất cả cập nhật", calendar: "Lịch & giảng dạy", all: "Tất cả", upcoming: "Sắp diễn ra", past: "Đã diễn ra", periods: "Thời gian sự kiện",
    search: "Tìm thông báo…", refresh: "Làm mới", retry: "Thử lại", clear: "Xóa bộ lọc", unknownSubject: "Chưa có chủ đề", items: "sự kiện", snapshot: "Cập nhật lúc",
    explanation: "Thời gian hiển thị là thời gian sự kiện. Nguồn hiện tại chưa cung cấp trạng thái đã đọc.",
    deviceOnly: "Áp dụng cho danh sách trên trình duyệt này.", group: "Nhóm theo chủ đề", groupDetail: "Gom các sự kiện cùng môn học hoặc chủ đề.", automatic: "Tự cập nhật danh sách", automaticDetail: "Kiểm tra mỗi phút khi danh sách đang hiển thị.", toolbarNote: "Thông tin ngắn trên thanh đầu được quản lý trong menu chuông của SpaceOS.",
    close: "Đóng chi tiết", event: "SỰ KIỆN LỊCH", subject: "Chủ đề", eventTime: "Thời gian sự kiện", reason: "Sự kiện được trả về từ lịch dành cho tài khoản GeeO của bạn.", readNote: "Mở chi tiết không đánh dấu đã đọc hoặc hoàn tất công việc.",
    preferenceError: "Không lưu được tùy chọn. Thay đổi vẫn áp dụng trong phiên này.",
    loading: ["Đang tải cập nhật", "Đang kiểm tra nguồn sự kiện dành cho bạn."],
    unconfigured: ["Kết nối để xem cập nhật", "Nguồn thông báo GeeO chưa được kết nối. Các sự kiện sẽ xuất hiện tại đây sau khi thiết lập đăng nhập và nguồn dữ liệu."],
    unauthorized: ["Cần đăng nhập GeeO", "Phiên đăng nhập chưa có hoặc đã hết hạn. Đăng nhập tại dịch vụ GeeO rồi thử lại."],
    forbidden: ["Bạn chưa có quyền xem nguồn này", "Liên hệ quản trị viên để kiểm tra quyền truy cập của tài khoản."],
    error: ["Chưa tải được cập nhật", "Không thể kiểm tra nguồn lúc này. Hãy thử lại sau ít phút."],
    empty: ["Chưa có sự kiện", "Nguồn đã kết nối nhưng chưa trả về sự kiện cho tài khoản của bạn."],
    noResults: ["Không tìm thấy sự kiện phù hợp", "Thử từ khóa khác hoặc xóa bộ lọc để xem lại danh sách."],
  },
  en: {
    identity: "Notifications", subtitle: "Updates in your workspace", sources: "Sources", sourceFilter: "Filter by source", subjects: "Subjects", subjectFilter: "Filter by subject",
    preferences: "Display preferences", privacy: "Information for your account only.", workspace: "YOUR WORKSPACE", allUpdates: "All updates", calendar: "Calendar & teaching", all: "All", upcoming: "Upcoming", past: "Past events", periods: "Event time",
    search: "Search notifications…", refresh: "Refresh", retry: "Try again", clear: "Clear filters", unknownSubject: "Unspecified subject", items: "events", snapshot: "Updated at",
    explanation: "Times refer to the events. The current source does not provide read status.",
    deviceOnly: "Applies to the list in this browser.", group: "Group by subject", groupDetail: "Keep events for the same subject together.", automatic: "Refresh the list automatically", automaticDetail: "Check every minute while the list is visible.", toolbarNote: "Manage compact toolbar information from the SpaceOS bell menu.",
    close: "Close details", event: "CALENDAR EVENT", subject: "Subject", eventTime: "Event time", reason: "This event was returned by the calendar for your GeeO account.", readNote: "Opening details does not mark an item as read or complete any work.",
    preferenceError: "Preferences could not be saved. Changes still apply in this session.",
    loading: ["Loading updates", "Checking your event source."],
    unconfigured: ["Connect to see updates", "The GeeO notification source is not connected. Events will appear here once sign-in and the data source are configured."],
    unauthorized: ["GeeO sign-in required", "Your session is missing or expired. Sign in to the GeeO service, then try again."],
    forbidden: ["Access to this source is restricted", "Contact your administrator to check your account permissions."],
    error: ["Updates could not be loaded", "The source cannot be checked right now. Please try again in a few minutes."],
    empty: ["No events yet", "The source is connected but returned no events for your account."],
    noResults: ["No matching events", "Try another search or clear your filters to see the list again."],
  },
};
const $ = selector => document.querySelector(selector);
const preferencesKey = "geeo.notifications.display.v1";
let locale = navigator.language.startsWith("en") ? "en" : "vi";
let events = [], status = "loading", observedAt = null, subject = null, source = "all", period = "all";
let preferences = false, group = true, automatic = true, preferenceError = false;
let pending, timer, visible = false, detailId;
try {
  const saved = JSON.parse(localStorage.getItem(preferencesKey) || "null");
  if (typeof saved?.group === "boolean") group = saved.group;
  if (typeof saved?.automatic === "boolean") automatic = saved.automatic;
} catch { /* Defaults remain usable without storage. */ }

const bridge = connectSpaceOS(context => {
  const wasVisible = visible;
  visible = context.visible;
  locale = context.locale;
  render();
  if (visible && !wasVisible) void refresh();
  else if (!visible) stop();
});
visible = !bridge.embedded;
const canRefresh = () => visible && document.visibilityState === "visible";
function stop() { clearTimeout(timer); pending?.abort(); pending = undefined; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function icon(name) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.classList.add("icon"); node.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(node.namespaceURI, "use"); use.setAttribute("href", `#icon-${name}`); node.append(use);
  return node;
}
function date(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Asia/Ho_Chi_Minh", ...options }).format(new Date(value));
}
function navButton(title, selected, count, onClick, glyph) {
  const button = element("button"); button.type = "button"; button.setAttribute("aria-pressed", String(selected));
  if (glyph) button.append(icon(glyph));
  button.append(element("span", "", title));
  if (count !== null) button.append(element("span", "count", String(count)));
  button.addEventListener("click", onClick); return button;
}
function renderNavigation() {
  const text = copy[locale], count = status === "ready" ? events.length : null;
  const sources = $("#sources"); sources.replaceChildren();
  for (const [id, title, glyph] of [["all", text.allUpdates, "bell"], ["calendar", text.calendar, "calendar"]]) {
    sources.append(navButton(title, !preferences && subject === null && source === id, count, () => {
      source = id; subject = null; preferences = false; render();
      $("#sources").children[id === "all" ? 0 : 1]?.focus();
    }, glyph));
  }
  const subjects = $("#subjects"); subjects.replaceChildren();
  const groups = [...new Set(events.map(event => event.subject))];
  $("#subjects-section").hidden = status !== "ready" || !groups.length;
  for (const value of groups) subjects.append(navButton(value || text.unknownSubject, !preferences && subject === value,
    events.filter(event => event.subject === value).length, () => {
      subject = value; source = "calendar"; preferences = false; render();
      $("#subjects").children[groups.indexOf(value)]?.focus();
    }));
}
function renderDetail() {
  const event = events.find(event => event.id === detailId);
  if (!event) { $("#detail").close(); return; }
  $("#detail-title").textContent = event.title;
  $("#detail-subject").textContent = event.subject || copy[locale].unknownSubject;
  $("#detail-time").textContent = `${date(event.startTime)} · GMT+7`;
}
function renderFeed() {
  const text = copy[locale];
  const filtered = filterEvents(events, { subject, period, query: $("#search").value });
  const state = status === "ready" ? !events.length ? "empty" : !filtered.length ? "noResults" : null : status;
  $("#source-state").hidden = !state;
  if (state) {
    $("#state-title").textContent = text[state][0]; $("#state-detail").textContent = text[state][1];
    $("#retry").hidden = !["error", "unauthorized", "unconfigured", "forbidden"].includes(state);
    $("#clear").hidden = state !== "noResults";
  }
  $("#summary").textContent = status === "ready" ? `${filtered.length} ${text.items}` : "";
  $("#sync-state").textContent = observedAt ? `${text.snapshot} ${date(observedAt, { hour: "2-digit", minute: "2-digit" })}` : "";
  $("#refresh").disabled = status === "loading";
  $("#feed").replaceChildren();
  if (state) return;
  const groups = group ? [...new Set(filtered.map(event => event.subject))] : [null];
  for (const value of groups) {
    const section = element("section", "event-group"), list = element("ul", "event-list");
    const entries = value === null ? filtered : filtered.filter(event => event.subject === value);
    if (group) {
      const heading = element("h3", "", value || text.unknownSubject); heading.append(element("span", "count", String(entries.length))); section.append(heading);
    }
    for (const event of entries) {
      const item = element("li"), button = element("button", "event-card"), body = element("span");
      const time = element("time", "", `${date(event.startTime)} · GMT+7`); time.dateTime = event.startTime;
      body.append(element("strong", "", event.title), time); button.append(icon("calendar"), body, icon("arrow"));
      button.addEventListener("click", () => { detailId = event.id; renderDetail(); $("#detail").showModal(); });
      item.append(button); list.append(item);
    }
    section.append(list); $("#feed").append(section);
  }
}
function render() {
  const text = copy[locale]; document.documentElement.lang = locale; document.title = `${text.identity} · GeeO`;
  document.querySelectorAll("[data-copy]").forEach(node => { node.textContent = text[node.dataset.copy]; });
  document.querySelectorAll("[data-label]").forEach(node => { node.setAttribute("aria-label", text[node.dataset.label]); });
  $("#language").textContent = locale === "vi" ? "EN" : "VI";
  $("#language").setAttribute("aria-label", locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt");
  $("#search").placeholder = text.search; $("#search").setAttribute("aria-label", text.search);
  $("#refresh").setAttribute("aria-label", text.refresh); $("#refresh").title = text.refresh;
  $("#context-title").textContent = preferences ? text.preferences : subject !== null ? subject || text.unknownSubject : source === "all" ? text.allUpdates : text.calendar;
  $("#preferences").setAttribute("aria-pressed", String(preferences));
  $("#feed-view").hidden = preferences; $("#preferences-view").hidden = !preferences; $("#refresh").hidden = preferences;
  $("#group").checked = group; $("#automatic").checked = automatic;
  $("#preference-warning").textContent = preferenceError ? text.preferenceError : "";
  document.querySelectorAll("[data-period]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.period === period)));
  renderNavigation(); renderFeed();
  if ($("#detail").open) renderDetail();
}
async function refresh() {
  if (!canRefresh()) return;
  stop();
  const controller = new AbortController(); pending = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  // Clear private data on any revalidation failure, including expired access.
  if (status !== "ready") { status = "loading"; render(); }
  try {
    const response = await fetch("/api/notifications", { cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (pending !== controller) return;
    if (!response.ok) { status = sourceState(response.status, data.code); events = []; observedAt = null; }
    else { events = parseSnapshot(data); observedAt = data.observedAt; status = "ready"; }
  } catch { if (pending === controller) { status = "error"; events = []; observedAt = null; } }
  finally {
    clearTimeout(timeout);
    if (pending === controller) { pending = undefined; render(); if (canRefresh() && automatic) timer = setTimeout(refresh, 60_000); }
  }
}
$("#search").addEventListener("input", renderFeed);
$("#preferences").addEventListener("click", () => { preferences = !preferences; render(); });
$("#refresh").addEventListener("click", refresh); $("#retry").addEventListener("click", refresh);
$("#clear").addEventListener("click", () => { subject = null; period = "all"; $("#search").value = ""; render(); $("#search").focus(); });
$("#language").addEventListener("click", () => { locale = locale === "vi" ? "en" : "vi"; render(); });
document.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => { period = button.dataset.period; render(); }));
for (const id of ["group", "automatic"]) $("#" + id).addEventListener("change", () => {
  group = $("#group").checked; automatic = $("#automatic").checked;
  try { localStorage.setItem(preferencesKey, JSON.stringify({ group, automatic })); preferenceError = false; }
  catch { preferenceError = true; }
  clearTimeout(timer); if (automatic && canRefresh()) timer = setTimeout(refresh, 60_000);
  render();
});
document.addEventListener("visibilitychange", () => { if (canRefresh()) void refresh(); else stop(); });
window.addEventListener("pagehide", stop);
render(); if (visible) void refresh();
