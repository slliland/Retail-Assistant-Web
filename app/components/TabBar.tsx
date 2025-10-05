"use client";

import { MessageSquare, FileText, TrendingUp, Settings } from "lucide-react";

export type AppTab = "ask" | "reports" | "trends" | "settings";

interface TabBarProps {
  selectedTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function TabBar({ selectedTab, onTabChange }: TabBarProps) {
  const tabs: { id: AppTab; label: string; icon: any }[] = [
    { id: "ask", label: "Ask", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[70px] pb-safe z-50">
      <div className="relative h-full mx-4 mb-2">
        {/* Blurred Background */}
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full shadow-2xl" />
        
        {/* Gradient Indicator - Black */}
        <div 
          className="absolute top-0 h-full rounded-full bg-black opacity-25 transition-all duration-300"
          style={{
            width: `${100 / tabs.length}%`,
            left: `${(tabs.findIndex(t => t.id === selectedTab) * 100) / tabs.length}%`,
          }}
        />

        {/* Tab Buttons */}
        <div className="relative h-full flex items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all"
              >
                <Icon 
                  className={`w-5 h-5 transition-all ${
                    isSelected ? "text-black dark:text-white" : "text-gray-500"
                  }`}
                  fill={isSelected ? "currentColor" : "none"}
                />
                <span 
                  className={`text-xs font-caslon font-semibold transition-all ${
                    isSelected ? "text-black dark:text-white" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

