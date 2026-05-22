'use client';

import { Home, User, Video, Settings, LogOut, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();

  const navItems = [
    { icon: <Home size={24} />, href: '/dashboard' },
    { icon: <User size={24} />, href: '#' },
    { icon: <Video size={24} />, href: '/interview' },
    { icon: <FolderOpen size={24} />, href: '/storage' },
    { icon: <Settings size={24} />, href: '/settings' },
  ];

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/');
  }

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-20 flex-col items-center border-r border-blue-800 bg-blue-900 py-8 text-white shadow-xl">
      <div className="flex-1 flex flex-col gap-8">
        {navItems.map((item, index) => (
          <Link key={index} href={item.href} className="rounded-xl p-3 transition-all hover:bg-blue-800 hover:text-blue-200">
            {item.icon}
          </Link>
        ))}
      </div>
      <button onClick={handleLogout} className="mt-auto rounded-xl p-3 transition-all hover:bg-red-500/20 hover:text-red-300">
        <LogOut size={24} />
      </button>
    </aside>
  );
}