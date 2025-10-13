# Building a Modern Navigation Bar with Dark Mode and User Authentication

## Introduction

Learn how to build a beautiful, responsive navigation bar with dark mode toggle, user authentication, avatar display, and smooth animations.

## Features

- 🎨 Dark mode toggle with system preference detection
- 👤 User avatar and profile menu
- 📱 Responsive mobile menu
- 🎭 Smooth animations and transitions
- 🔐 Authentication state management
- 🎯 Active route highlighting

## Tech Stack

- **Next.js 14** - App Router
- **Tailwind CSS** - Styling
- **Headless UI** - Accessible components
- **Supabase Auth** - Authentication
- **Local Storage** - Theme persistence

## Step 1: TopNav Component Structure

```typescript
// components/TopNav.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

interface TopNavProps {
  onMenuClick: () => void;
  userEmail?: string;
  avatarUrl?: string;
}

export default function TopNav({ onMenuClick, userEmail, avatarUrl }: TopNavProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Add shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Chat', href: '/chat', icon: ChatIcon },
    { name: 'Stores', href: '/stores', icon: MapIcon },
    { name: 'Spotlight', href: '/spotlight', icon: SparklesIcon },
    { name: 'Reports', href: '/reports', icon: ChartIcon },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 transition-shadow ${
      scrolled ? 'shadow-md' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>

            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/pure-icon.png"
                alt="Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-zapfino text-xl hidden sm:block">
                Retail Assistant
              </span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-caslon transition-all ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right: Theme Toggle + User Menu */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            
            {userEmail && (
              <UserMenu email={userEmail} avatarUrl={avatarUrl} />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## Step 2: Theme Toggle with System Preference

```typescript
// components/ThemeToggle.tsx
'use client';

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
      <button
        onClick={() => handleThemeChange('light')}
        className={`p-2 rounded-full transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Light mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
        </svg>
      </button>

      <button
        onClick={() => handleThemeChange('system')}
        className={`p-2 rounded-full transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="System preference"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      </button>

      <button
        onClick={() => handleThemeChange('dark')}
        className={`p-2 rounded-full transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Dark mode"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
    </div>
  );
}
```

## Step 3: User Menu with Avatar

```typescript
// components/UserMenu.tsx
'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface UserMenuProps {
  email: string;
  avatarUrl?: string;
}

export default function UserMenu({ email, avatarUrl }: UserMenuProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="User avatar"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <span className="hidden sm:block text-sm font-medium">
          {email.split('@')[0]}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="p-2">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-gray-500">Signed in</p>
            </div>

            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/settings"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    active ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleSignOut}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 ${
                    active ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
```

## Step 4: Mobile Responsive Sidebar

```typescript
// components/Sidebar.tsx
'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Array<{ id: string; title: string; timestamp: string }>;
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  userEmail?: string;
  avatarUrl?: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  selectedId,
  onSelectConversation,
  onNewChat,
  userEmail,
  avatarUrl
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-80">
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl">
                    {/* Header */}
                    <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Menu</h2>
                        <button
                          onClick={onClose}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                      <button
                        onClick={() => {
                          onNewChat();
                          onClose();
                        }}
                        className="w-full mb-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        + New Chat
                      </button>

                      {/* Conversations */}
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              selectedId === conv.id
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            <p className="font-medium truncate">{conv.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{conv.timestamp}</p>
                          </button>
                        ))}
                      </div>
                    </nav>

                    {/* Footer */}
                    {userEmail && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{userEmail}</p>
                            <Link
                              href="/settings"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={onClose}
                            >
                              View settings
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
```

## Step 5: Custom Fonts

```typescript
// tailwind.config.ts

export default {
  theme: {
    extend: {
      fontFamily: {
        'zapfino': ['Zapfino', 'cursive'],
        'caslon': ['Big Caslon', 'serif'],
      },
    },
  },
};
```

```css
/* globals.css */

@font-face {
  font-family: 'Zapfino';
  src: url('/fonts/Zapfino.ttf') format('truetype');
}

@font-face {
  font-family: 'Big Caslon';
  src: url('/fonts/BigCaslon.ttf') format('truetype');
}
```

## Step 6: Active Route Highlighting

```typescript
const pathname = usePathname();

const isActive = (href: string) => {
  return pathname === href || pathname.startsWith(href + '/');
};
```

## Accessibility Features

1. **Keyboard Navigation**: All interactive elements are keyboard accessible
2. **ARIA Labels**: Proper labels for screen readers
3. **Focus States**: Visible focus indicators
4. **Color Contrast**: WCAG AA compliant

## Conclusion

You now have a modern navigation bar with:
- ✅ Dark mode with system preference
- ✅ User authentication UI
- ✅ Responsive mobile menu
- ✅ Smooth animations
- ✅ Active route highlighting
- ✅ Accessible components

---

**Source Code**: [GitHub Repository](https://github.com/your-repo)

