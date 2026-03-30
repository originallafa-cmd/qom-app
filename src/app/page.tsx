import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          ملكة المحشي
        </h1>
        <p className="text-xl text-admin-text2">Queen of Mahshi — Shop Management</p>
        <div className="flex gap-6 justify-center">
          <Link
            href="/staff"
            className="px-8 py-4 bg-teal text-white rounded-xl text-lg font-semibold hover:bg-teal-dark transition-colors"
          >
            Staff Portal
          </Link>
          <Link
            href="/admin"
            className="px-8 py-4 bg-gold text-white rounded-xl text-lg font-semibold hover:bg-gold-dark transition-colors"
          >
            Admin Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
