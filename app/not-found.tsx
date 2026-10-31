import Link from "next/link";
export default function NotFound() { return <main className="standalone-message"><h1>Không tìm thấy trang</h1><p>Đường dẫn này không có trong không gian làm việc.</p><Link href="/today">Về Hôm nay</Link></main>; }
