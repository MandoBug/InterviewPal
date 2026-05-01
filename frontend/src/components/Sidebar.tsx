'use client';

import { Home, User, Video, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();

  const navItems = [
    { icon: <Home size={24} />, href: '/dashboard' },
    { icon: <User size={24} />, href: '#' },
    { icon: <Video size={24} />, href: '/interview' },
    { icon: <Settings size={24} />, href: '#' },
  ];

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/');
  }

  return (
    <aside className="w-20 bg-blue-900 h-screen flex flex-col items-center py-8 text-white fixed left-0 top-0">
      <div className="flex-1 flex flex-col gap-8">
        {navItems.map((item, index) => (
          <Link key={index} href={item.href} className="hover:text-blue-300 transition-colors">
            {item.icon}
          </Link>
        ))}
      </div>
      <button onClick={handleLogout} className="mt-auto hover:text-red-400">
        <LogOut size={24} />
      </button>
    </aside>
  );
}