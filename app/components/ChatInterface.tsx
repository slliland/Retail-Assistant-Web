"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Send, Loader2, ChevronDown, ChevronUp, BookOpen, Paperclip, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  suggestedQuestions?: string[];
  attachments?: { name: string; type: string; url?: string }[];
}

interface ChatInterfaceProps {
  onMenuClick: () => void;
  onTitleGenerated?: (title: string) => void;
  conversationId?: string;
}

function CollapsibleSources({ sources }: { sources: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-600">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-caslon italic opacity-75 hover:opacity-100 transition-opacity w-full"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Sources ({sources.length})</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-1">
          {sources.map((source, i) => (
            <p key={i} className="text-xs font-caslon italic opacity-75 pl-1">• {source}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ onMenuClick, onTitleGenerated, conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createSession();
    loadWelcomeMessage();
  }, [conversationId]);

  useEffect(() => {
    setTitleGenerated(false);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createSession = async () => {
    const uuid = crypto.randomUUID();
    setSessionId(uuid);
  };

  const loadWelcomeMessage = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! Ask me about retail sales, trends, and drivers.",
      },
    ]);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend || "(file attached)",
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    const filesToSend = attachedFiles;
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(
        `${apiUrl}/v1/ask`,
        {
          message: textToSend,
          session_id: sessionId,
          k: 50,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.answer,
        sources: response.data.sources,
        suggestedQuestions: response.data.suggested_questions || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Generate title from first user message
      if (!titleGenerated && messages.length === 1 && onTitleGenerated) {
        generateTitle(textToSend);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTitle = async (firstMessage: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(
        `${apiUrl}/v1/generate-title`,
        { message: firstMessage },
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (response.data.title && onTitleGenerated) {
        onTitleGenerated(response.data.title);
        setTitleGenerated(true);
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
      // Fallback: use first 50 chars of the message
      if (onTitleGenerated) {
        const fallbackTitle = firstMessage.length > 50 
          ? firstMessage.substring(0, 50) + "..." 
          : firstMessage;
        onTitleGenerated(fallbackTitle);
        setTitleGenerated(true);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <h2 className="text-lg font-zapfino">New chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index}>
            <div
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 font-caslon ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white"
                }`}
              >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs opacity-75">
                            <Paperclip className="w-3 h-3" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {message.sources && message.sources.length > 0 && (
                      <CollapsibleSources sources={message.sources} />
                    )}
                  </div>
                </div>

            {message.role === "assistant" &&
              message.suggestedQuestions &&
              message.suggestedQuestions.length > 0 &&
              index === messages.length - 1 &&
              !isLoading && (
                <div className="mt-3 space-y-2">
                  {message.suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(question)}
                      className="block w-full text-left px-4 py-2 text-sm font-caslon bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-slate-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-sm"
              >
                <Paperclip className="w-4 h-4" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={handleFileUploadClick}
            className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          />
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              style={{ maxHeight: "120px" }}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            className="p-2.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

