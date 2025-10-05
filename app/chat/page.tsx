"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import ChatInterface from "../components/ChatInterface";
import { supabase, getCurrentUser } from "@/lib/supabase";

export default function ChatPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState([
    {
      id: "1",
      title: "New chat",
      timestamp: "Just now",
    },
  ]);
  const [selectedConversationId, setSelectedConversationId] = useState("1");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserEmail(user.email || null);
          // Get avatar URL from metadata
          const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          setAvatarUrl(avatar);
        } else {
          const savedAuth = localStorage.getItem("userEmail");
          if (savedAuth) {
            setUserEmail(savedAuth);
          } else {
            router.push("/login");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        const savedAuth = localStorage.getItem("userEmail");
        if (savedAuth) {
          setUserEmail(savedAuth);
        } else {
          router.push("/login");
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUserEmail(session.user.email || null);
          } else if (event === "SIGNED_OUT") {
            router.push("/login");
          }
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [router]);

  const handleNewChat = () => {
    const newConv = {
      id: Date.now().toString(),
      title: "New chat",
      timestamp: "Just now",
    };
    setConversations([newConv, ...conversations]);
    setSelectedConversationId(newConv.id);
  };

  const handleTitleGenerated = (title: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId
          ? { ...conv, title }
          : conv
      )
    );
    
    // Save to localStorage for persistence
    const consent = localStorage.getItem("cookieConsent");
    if (consent === "accepted") {
      localStorage.setItem(`conversation_${selectedConversationId}`, title);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

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
        selectedId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onNewChat={handleNewChat}
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />

      <div className="pt-16 h-full">
        <ChatInterface 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onTitleGenerated={handleTitleGenerated}
          conversationId={selectedConversationId}
        />
      </div>
    </div>
  );
}

