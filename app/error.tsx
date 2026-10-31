"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="standalone-message" role="alert"><h1>Chưa tải được trang</h1><p>Bạn có thể thử lại. Chưa có thay đổi nghiệp vụ nào được xác nhận từ trang này.</p><button className="button button-primary" onClick={reset}>Thử lại</button></main>; }
