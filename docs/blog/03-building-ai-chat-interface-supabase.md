# Building an AI-Powered Chat Interface with Next.js and Supabase

## Introduction

Learn how to build a production-ready AI chat interface with conversation history, auto-generated titles, session management, and real-time streaming responses.

## Features We'll Build

- 💬 Real-time AI chat with streaming responses
- 📝 Auto-generated conversation titles
- 💾 Persistent chat history in Supabase
- 🎨 Beautiful UI with suggested questions
- ⚡ Optimized database storage (no empty sessions)
- 🕐 Timezone-aware timestamps

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** - Database & Auth
- **OpenAI API** - AI responses
- **React Hooks** - State management
- **Tailwind CSS** - Styling

## Database Schema

```sql
-- Users profile table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own sessions"
  ON messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions"
  ON messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );
```

## Step 1: Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};
```

## Step 2: Chat Session Management

```typescript
// lib/supabase-chat.ts

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: any[];
  created_at: string;
}

// Create a new chat session
export const createChatSession = async (
  userId: string,
  title: string = 'New Chat'
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      title: title,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return data.id;
};

// Get user's chat sessions
export const getUserSessions = async (userId: string): Promise<ChatSession[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
};

// Get messages for a session
export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
};

// Save a message
export const saveMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: any[]
): Promise<boolean> => {
  const { error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role: role,
      content: content,
      sources: sources || null,
    });

  if (error) {
    console.error('Error saving message:', error);
    return false;
  }

  return true;
};

// Update session title
export const updateSessionTitle = async (
  sessionId: string,
  title: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('sessions')
    .update({ 
      title: title,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session title:', error);
    return false;
  }

  return true;
};

// Delete a session (cascades to messages)
export const deleteSession = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    return false;
  }

  return true;
};
```

## Step 3: Chat Interface Component

```typescript
// components/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/supabase';
import { 
  getSessionMessages, 
  saveMessage, 
  createChatSession,
  updateSessionTitle 
} from '@/lib/supabase-chat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export default function ChatInterface({
  conversationId,
  onTitleGenerated,
  onSessionCreated
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(conversationId);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
      }
    };
    loadUser();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (sessionId && !sessionId.startsWith('temp_')) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  const loadMessages = async () => {
    if (!sessionId) return;
    
    const msgs = await getSessionMessages(sessionId);
    setMessages(msgs.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      sources: m.sources
    })));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      let currentSessionId = sessionId;

      // Check if this is a temporary session (not saved to DB yet)
      if (currentSessionId && currentSessionId.startsWith('temp_')) {
        console.log('Creating real session in DB...');
        if (!userId) {
          console.error('No user ID available');
          return;
        }
        
        // Create real session
        const realSessionId = await createChatSession(userId, 'New Chat');
        if (realSessionId) {
          // Notify parent to update conversation list
          if (onSessionCreated) {
            onSessionCreated(currentSessionId, realSessionId);
          }
          currentSessionId = realSessionId;
          setSessionId(realSessionId);
        } else {
          console.error('Failed to create real session');
          setIsLoading(false);
          return;
        }
      }

      // Save user message to database
      if (currentSessionId) {
        await saveMessage(currentSessionId, 'user', userMessage);
      }

      // Call AI backend
      const response = await fetch('http://localhost:8000/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: currentSessionId
        })
      });

      const data = await response.json();

      // Add assistant response to UI
      const assistantMessage = {
        role: 'assistant' as const,
        content: data.response,
        sources: data.sources
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      if (currentSessionId) {
        await saveMessage(
          currentSessionId, 
          'assistant', 
          data.response, 
          data.sources
        );
      }

      // Generate title for first message
      if (messages.length === 0 && data.title) {
        if (onTitleGenerated) {
          onTitleGenerated(data.title);
        }
        if (currentSessionId) {
          await updateSessionTitle(currentSessionId, data.title);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <WelcomeScreen onSuggestionClick={setInput} />
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything about retail data..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Step 4: Welcome Screen with Suggested Questions

```typescript
// components/WelcomeScreen.tsx

const SUGGESTED_QUESTIONS = [
  "What are the top-performing stores?",
  "Show me sales trends by region",
  "Which products have the highest profit margin?",
  "Analyze customer purchasing patterns"
];

export const WelcomeScreen: React.FC<{ onSuggestionClick: (q: string) => void }> = ({
  onSuggestionClick
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Retail AI Assistant</h1>
        <p className="text-gray-600">Ask me anything about your retail data</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        {SUGGESTED_QUESTIONS.map((question, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestionClick(question)}
            className="p-4 text-left border rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all"
          >
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm">{question}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Step 5: Optimized Session Storage

Only save sessions when the user sends their first message:

```typescript
// app/chat/page.tsx

const handleNewChat = async () => {
  // Create temporary session ID (not saved to DB yet)
  const tempSessionId = `temp_${Date.now()}`;
  
  const newConv = {
    id: tempSessionId,
    title: 'New Chat',
    timestamp: new Date().toLocaleString(),
  };
  
  setConversations([newConv, ...conversations]);
  setSelectedConversationId(tempSessionId);
};

const handleSessionCreated = (tempId: string, realId: string) => {
  // Replace temporary ID with real ID
  setConversations((prev) =>
    prev.map((conv) =>
      conv.id === tempId ? { ...conv, id: realId } : conv
    )
  );
  
  setSelectedConversationId(realId);
};
```

## Step 6: Auto-Generated Titles

Backend generates titles based on first message:

```python
# Backend (FastAPI + OpenAI)

@app.post("/v1/chat")
async def chat(request: ChatRequest):
    # Get AI response
    response = await get_ai_response(request.message)
    
    # Generate title for first message
    title = None
    if is_first_message(request.session_id):
        title = await generate_title(request.message)
    
    return {
        "response": response,
        "sources": extract_sources(response),
        "title": title
    }

async def generate_title(first_message: str) -> str:
    """Generate a concise title from the first message"""
    prompt = f"Generate a short 3-5 word title for this question: {first_message}"
    
    response = await openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20
    )
    
    return response.choices[0].message.content.strip()
```

## Step 7: Timezone-Aware Timestamps

```typescript
// Display timestamps in user's local timezone

const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  
  const timeStr = date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  const dateStr = date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return `${dateStr} ${timeStr}`;
};
```

## Performance Optimizations

1. **Lazy load old messages** - Only load recent messages initially
2. **Debounce typing indicators** - Show "typing..." after 500ms
3. **Optimize re-renders** with `React.memo`
4. **Use virtual scrolling** for long conversations

```typescript
const MessageList = React.memo(({ messages }: { messages: Message[] }) => {
  return (
    <>
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} />
      ))}
    </>
  );
});
```

## Conclusion

You now have a production-ready AI chat interface with:
- ✅ Persistent conversation history
- ✅ Auto-generated titles
- ✅ Optimized database storage
- ✅ Real-time streaming (optional)
- ✅ Timezone-aware timestamps
- ✅ Beautiful UI with suggestions
- ✅ Secure with RLS policies

## Next Steps

- Add message editing/deletion
- Implement conversation search
- Add file upload support
- Create conversation sharing

---

**Source Code**: [GitHub Repository](https://github.com/your-repo)
**Live Demo**: [View Demo](https://your-demo-url.com)

