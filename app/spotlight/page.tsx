"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import SpotlightView from "../components/SpotlightView";
import { getCurrentUser } from "@/lib/supabase";

export default function SpotlightPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [conversations, setConversations] = useState([
    { id: "1", title: "New chat", timestamp: "Just now" },
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      const savedAuth = localStorage.getItem("userEmail");
      
      if (user) {
        setUserEmail(user.email || null);
        // Get avatar URL from metadata
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        setAvatarUrl(avatar);
      } else if (savedAuth) {
        setUserEmail(savedAuth);
      } else {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleNewChat = () => {
    router.push("/chat");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <TopNav 
        onMenuClick={() => setIsSidebarOpen(true)} 
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        selectedId="1"
        onSelectConversation={() => {}}
        onNewChat={handleNewChat}
        userEmail={userEmail || undefined}
      />

      <div className="pt-16 h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-zapfino mb-6 text-center">Spotlight</h1>
          <SpotlightView />
        </div>
      </div>
    </div>
  );
}

