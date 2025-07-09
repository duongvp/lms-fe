import Link from "next/link";

export default function Home() {
  return (
    <div>
      <Link href={'/dashboard'}>Nhấn vào đây để được điều hướng tới trang</Link>
    </div>
  );
}
