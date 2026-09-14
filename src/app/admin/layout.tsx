'use client';

import { usePathname } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-ink-950">
      <AdminNav />
      <main className="flex-1 min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
