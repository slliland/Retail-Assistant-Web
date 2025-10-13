"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import { supabase, getCurrentUser, signOut } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("Loading location...");
  const [conversations, setConversations] = useState([
    { id: "1", title: "New chat", timestamp: "Just now" },
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        const savedAuth = localStorage.getItem("userEmail");
        
        if (user) {
          setUserEmail(user.email || null);
          
          // Try to get user name from metadata or email
          const name = user.user_metadata?.user_name || 
                       user.user_metadata?.full_name || 
                       user.user_metadata?.name ||
                       user.email?.split('@')[0] || 
                       "User";
          setUserName(name);
          
          // Try to get avatar URL from metadata
          const avatar = user.user_metadata?.avatar_url || 
                        user.user_metadata?.picture || 
                        null;
          setAvatarUrl(avatar);
        } else if (savedAuth) {
          setUserEmail(savedAuth);
          setUserName(savedAuth.split('@')[0] || "User");
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // Don't redirect on error, just use defaults
      }
    };

    checkAuth();
  }, [router]);

  // Get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Try to get readable location name using reverse geocoding
          try {
            // Using OpenStreetMap's Nominatim API (free, no API key required)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            
            // Extract city and state/country
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const state = data.address?.state || "";
            const country = data.address?.country || "";
            
            let locationString = "";
            if (city && state) {
              locationString = `${city}, ${state}`;
            } else if (city && country) {
              locationString = `${city}, ${country}`;
            } else if (state && country) {
              locationString = `${state}, ${country}`;
            } else {
              locationString = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
            }
            
            setLocation(locationString);
          } catch (error) {
            console.error("Error getting location name:", error);
            // Fallback to coordinates
            setLocation(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocation("Location access denied");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocation("Location unavailable");
              break;
            case error.TIMEOUT:
              setLocation("Location timeout");
              break;
            default:
              setLocation("Location unknown");
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocation("Location not supported");
    }
  }, []);

  const handleNewChat = () => {
    router.push("/chat");
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await signOut();
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      localStorage.removeItem("userEmail");
      router.push("/login");
    }
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-slate-900">
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
        onDeleteConversation={() => {}}
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />

      {/* Main Content */}
      <div className="pt-16 h-full flex flex-col">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header with Sky-to-Ocean Background */}
          <div className="relative">
            {/* Combined Background Layer: White Sky + Wave Ocean */}
            <div className="relative overflow-hidden" style={{ height: "450px" }}>
              {/* Background Layer */}
              <div className="absolute inset-0">
                {/* Top: White/Frosted Sky Area */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white via-white/95 to-transparent"></div>
                
                {/* Bottom: Animated Wave Ocean */}
                <div className="curved-wave-container">
                  {/* Animated Wave 1 - Cyan */}
                  <div className="curved-wave curved-wave-cyan"></div>
                  
                  {/* Animated Wave 2 - Blue */}
                  <div className="curved-wave curved-wave-blue"></div>
                  
                  {/* Frosted glass overlay with gradient */}
                  <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-b from-white/60 via-yellow-50/10 to-black/25"></div>
                </div>
              </div>

              {/* Profile Content on top of combined background */}
              <div className="relative z-10 flex flex-col items-center pt-20">
                {/* Avatar */}
                <div className="relative mb-8">
                  <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center p-2 shadow-xl">
                    <div className="w-full h-full rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <Image 
                          src={avatarUrl} 
                          alt="User avatar" 
                          width={104} 
                          height={104}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Name */}
                <h2 className="text-2xl font-zapfino text-gray-900 mb-3 drop-shadow-sm">
                  {userName}
                </h2>

                {/* User Email */}
                {userEmail && (
                  <p className="text-base font-caslon text-gray-700 drop-shadow-sm mb-5">
                    {userEmail}
                  </p>
                )}

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-600 text-sm font-caslon">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer to push sign out button down */}
          <div className="h-32"></div>
        </div>

        {/* Fixed Sign Out Button at Bottom */}
        <div className="p-6 pb-8 bg-gray-100 dark:bg-slate-900 flex justify-center">
          <button
            onClick={handleLogout}
            className="py-3 px-12 bg-red-500 hover:bg-red-600 text-white font-caslon text-sm rounded-2xl shadow-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

