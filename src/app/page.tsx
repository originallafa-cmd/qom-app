import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export default function Home() {
  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center">
      <div className="text-center space-y-8">
        <img src="/logo.png" alt="Queen of Mahshi" className="h-28 mx-auto" />
        <p className="text-lg text-admin-text2">Shop Management</p>
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
        <p className="text-xs text-admin-text3">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
 
