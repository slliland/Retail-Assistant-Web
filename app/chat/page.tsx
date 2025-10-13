"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import ChatInterface from "../components/ChatInterface";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { getUserSessions, deleteSession, type ChatSession } from "@/lib/supabase-chat";

export default function ChatPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Array<{id: string, title: string, timestamp: string}>>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{id: string, title: string} | null>(null);

         // Load conversations from Supabase on mount
         useEffect(() => {
           const loadConversations = async () => {
             try {
               console.log('🔍 ChatPage: Loading conversations...');
               const user = await getCurrentUser();
               if (user) {
                 console.log('👤 ChatPage: User found:', user.id);
                 const dbSessions = await getUserSessions(user.id);
                 console.log('📋 ChatPage: Retrieved sessions:', dbSessions.length);
                 if (dbSessions.length > 0) {
                   const formattedConversations = dbSessions.map((session: ChatSession) => {
                     // Smart title logic: use AI title if available, otherwise use timestamp
                     let title = session.title;
                     console.log('🏷️ ChatPage: Processing session title:', { 
                       sessionId: session.id, 
                       originalTitle: session.title,
                       hasTitle: !!(title && title.trim() !== '' && title !== 'New Chat')
                     });
                     
                    if (!title || title.trim() === '' || title === 'New Chat') {
                      const date = new Date(session.created_at);
                      // Use user's locale for timezone-aware formatting
                      const timeStr = date.toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      });
                      const dateStr = date.toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      });
                      title = `Chat ${dateStr} ${timeStr}`;
                      console.log('🔄 ChatPage: Using timestamp fallback title:', title);
                    } else {
                      console.log('✅ ChatPage: Using AI-generated title:', title);
                    }
                     
                     return {
                       id: session.id,
                       title: title,
                       timestamp: new Date(session.created_at).toLocaleString(),
                     };
                   });
                   console.log('✅ ChatPage: Setting conversations:', formattedConversations.length);
                   setConversations(formattedConversations);
                   // Set the most recent conversation as selected
                   setSelectedConversationId(formattedConversations[0].id);
                 } else {
                   console.log('ℹ️ ChatPage: No sessions found for user');
                 }
               } else {
                 console.log('❌ ChatPage: No user found');
               }
             } catch (error) {
               console.error("❌ ChatPage: Error loading conversations:", error);
             }
           };

           loadConversations();
         }, []);

  // Note: Conversations are now managed by Supabase, no localStorage needed

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

  const handleNewChat = async () => {
    console.log('🆕 ChatPage: Creating new chat (temporary, not saved to DB yet)...');
    
    // Create a temporary session ID that will be created in DB only when user sends first message
    const tempSessionId = `temp_${Date.now()}`;
    
    const newConv = {
      id: tempSessionId,
      title: 'New Chat',
      timestamp: new Date().toLocaleString(),
    };
    
    setConversations([newConv, ...conversations]);
    setSelectedConversationId(tempSessionId);
    console.log('✅ ChatPage: Temporary new chat created (not in DB):', tempSessionId);
  };

  const handleSessionCreated = (tempId: string, realId: string) => {
    console.log('🔄 ChatPage: Replacing temporary session:', tempId, 'with real session:', realId);
    
    // Update the conversations list to replace temp ID with real ID
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === tempId
          ? { ...conv, id: realId }
          : conv
      )
    );
    
    // Update selected conversation ID
    setSelectedConversationId(realId);
    console.log('✅ ChatPage: Session replacement complete');
  };

  const handleTitleGenerated = async (title: string) => {
    console.log('🏷️ ChatPage: Title generated:', title);
    console.log('🏷️ ChatPage: For session:', selectedConversationId);
    
    // Update the session title in the database
    if (selectedConversationId) {
      try {
        const { updateSessionTitle } = await import('@/lib/supabase-chat');
        const success = await updateSessionTitle(selectedConversationId, title);
        if (success) {
          console.log('✅ ChatPage: Title updated in database successfully');
        } else {
          console.error('❌ ChatPage: Failed to update title in database');
        }
      } catch (error) {
        console.error('❌ ChatPage: Error updating session title in database:', error);
      }
    }

    // Update the local conversations list
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId
          ? { ...conv, title, timestamp: new Date().toLocaleString() }
          : conv
      )
    );
    console.log('✅ ChatPage: Local conversations list updated with new title');
  };


  const handleDeleteConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setConversationToDelete({ id, title: conversation.title });
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    const { id } = conversationToDelete;
    
    try {
      // Delete from Supabase
      const success = await deleteSession(id);
      if (success) {
        // Remove from conversations list
        setConversations((prev) => prev.filter((conv) => conv.id !== id));
        
        // If the deleted conversation was selected, select the first remaining conversation or create a new one
        if (selectedConversationId === id) {
          const remainingConversations = conversations.filter((conv) => conv.id !== id);
          if (remainingConversations.length > 0) {
            setSelectedConversationId(remainingConversations[0].id);
          } else {
            // Create a new conversation if no conversations remain
            const newConv = {
              id: Date.now().toString(),
              title: "New chat",
              timestamp: "Just now",
            };
            setConversations([newConv]);
            setSelectedConversationId(newConv.id);
          }
        }
      } else {
        console.error('Failed to delete conversation from database');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
    
    // Reset modal state
    setDeleteModalOpen(false);
    setConversationToDelete(null);
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
        onDeleteConversation={handleDeleteConversation}
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />

      <div className="pt-16 h-full">
        <ChatInterface 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onTitleGenerated={handleTitleGenerated}
          onSessionCreated={handleSessionCreated}
          conversationId={(() => {
            console.log('🔍 ChatPage: Passing conversationId to ChatInterface:', selectedConversationId);
            return selectedConversationId || undefined;
          })()}
          conversationTitle={conversations.find(c => c.id === selectedConversationId)?.title}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConversationToDelete(null);
        }}
        onConfirm={confirmDeleteConversation}
        conversationTitle={conversationToDelete?.title || ""}
      />
    </div>
  );
}

