'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import { getCurrentUser } from "@/lib/supabase";
import { useStores } from './hooks/useStores';
import { useStoreDetails } from './hooks/useStoreDetails';
import { useMapControl } from './hooks/useMapControl';
import { useUSStatesData } from './hooks/useUSStatesData';
import { getRegionColor, getProfitColor, toAbbr, calculateOptimalItemCount } from './utils/mapUtils';
import type { StoreLocation, PostFormData, MapMode, SortOrder } from './types';

// Dynamically import the entire map component to avoid SSR issues
// This wrapper handles all Leaflet dependencies internally
const LeafletMap = dynamic(
  () => import('./components/LeafletMap').then(mod => ({ default: mod.LeafletMap })),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    )
  }
);

export default function StoreLocatorPage() {
  // Authentication state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Custom hooks
  const { stores, loading, error, stateProfitData } = useStores();
  const { selectedStore, storePosts, fetchStoreDetails, clearStoreDetails, addPost } = useStoreDetails();
  const { mapCenter, mapZoom, mapRef, setMapCenter, setMapZoom, animateToStore, resetView, zoomToRegion } = useMapControl();
  const usStatesData = useUSStatesData();
  
  // UI state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [visibleStoresCount, setVisibleStoresCount] = useState(6);
  const [isInfoCardOpen, setIsInfoCardOpen] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showRegionMap, setShowRegionMap] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('region');
  const [storeListRef, setStoreListRef] = useState<HTMLDivElement | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showMapOptions, setShowMapOptions] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PostFormData>({
    defaultValues: {
      user_name: 'Anonymous',
      post_type: 'comment'
    }
  });

  const postType = watch('post_type');

  // Load user authentication
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserEmail(user.email || null);
          setAvatarUrl(user.user_metadata?.avatar_url || null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadUser();
  }, []);

  // Initialize visible stores count and handle window resize
  useEffect(() => {
    const initialCount = calculateOptimalItemCount();
    setVisibleStoresCount(initialCount);

    const handleResize = () => {
      const newCount = calculateOptimalItemCount();
      setVisibleStoresCount(prev => Math.min(prev, newCount));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Set initial map center when stores load
  useEffect(() => {
    if (stores.length > 0) {
      const avgLat = stores.reduce((sum, s) => sum + s.latitude, 0) / stores.length;
      const avgLon = stores.reduce((sum, s) => sum + s.longitude, 0) / stores.length;
      setMapCenter([avgLat, avgLon]);
      setMapZoom(5);
    }
  }, [stores, setMapCenter, setMapZoom]);


  const handleStoreClick = async (storeId: number) => {
    const storeData = await fetchStoreDetails(storeId);
    
    if (storeData) {
      // Wait a bit for the marker to re-render, then animate
      setTimeout(() => {
        if (storeData.latitude && storeData.longitude) {
          animateToStore(storeData.latitude, storeData.longitude);
        }
      }, 100);
    }
  };

  const handleCloseStoreInfo = () => {
    clearStoreDetails();
    resetView();
  };


  const handleShowMore = () => {
    const increment = calculateOptimalItemCount();
    const newCount = Math.min(visibleStoresCount + increment, stores.length);
    setVisibleStoresCount(newCount);
    
    // Scroll to bottom animation
    setTimeout(() => {
      if (storeListRef) {
        storeListRef.scrollTo({
          top: storeListRef.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleRegionMapToggle = () => {
    if (showRegionMap) {
      if (selectedRegion) {
        // If in a specific region, go back to options
        setSelectedRegion(null);
        setShowMapOptions(true);
      } else {
        // If showing options or map, close completely
        setShowRegionMap(false);
        setShowMapOptions(false);
        setSelectedRegion(null);
      }
    } else {
      // First click: show map AND options immediately
      setShowRegionMap(true);
      setShowMapOptions(true);
      setSelectedRegion(null);
    }
  };

  const handleMapModeChange = (mode: 'region' | 'profit') => {
    setMapMode(mode);
    setSelectedRegion(null); // Reset selected region when switching modes
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    
    // Zoom to region
    const regionStores = stores.filter(store => store.region === region);
    if (regionStores.length > 0) {
      const lats = regionStores.map(store => store.latitude);
      const lngs = regionStores.map(store => store.longitude);
      
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      
      zoomToRegion(centerLat, centerLng);
    }
  };

  const handleBackToHeatmap = () => {
    setSelectedRegion(null);
    resetView();
  };

  const getSortedStores = (): StoreLocation[] => {
    const sortedStores = [...stores].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.store_name.localeCompare(b.store_name);
      } else {
        return b.store_name.localeCompare(a.store_name);
      }
    });
    return sortedStores;
  };


  // Pre-compute stores by state for O(1) lookup
  const storesByState = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>(); // abbr -> region
    for (const store of stores) {
      const abbr = toAbbr(store.state);
      if (!abbr) continue;
      if (!map.has(abbr)) map.set(abbr, store.region);
    }
    return map;
  }, [stores]);





  const onSubmitPost = async (data: PostFormData) => {
    if (!selectedStore) return;
    
    try {
      const response = await fetch(`http://localhost:8000/v1/stores/${selectedStore.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          store_id: selectedStore.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const newPost = await response.json();
      addPost(newPost);
      reset();
      setIsPostModalOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-caslon">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <TopNav 
        onMenuClick={() => setIsSidebarOpen(true)}
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={[]}
        selectedId={null}
        onSelectConversation={() => {}}
        onNewChat={() => {}}
        onDeleteConversation={() => {}}
        userEmail={userEmail || undefined}
        avatarUrl={avatarUrl || undefined}
      />

      <main className="flex-1 pt-16 overflow-hidden">
        <div className="h-full flex flex-col min-h-0">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-zapfino italic text-center">Find stores and share your experiences</h1>
            </div>
          </div>

          {/* Full-width map with floating info card */}
          <div className="relative flex-1" style={{ height: 'calc(100vh - 140px)' }}>
            {/* Full-width Map */}
            <div className="absolute inset-0 z-0">
              <LeafletMap
                center={mapCenter}
                zoom={mapZoom}
                mapRef={mapRef}
                stores={stores}
                selectedStore={selectedStore}
                onStoreClick={handleStoreClick}
                onPopupClose={handleCloseStoreInfo}
                showRegionMap={showRegionMap}
                mapMode={mapMode}
                stateProfitData={stateProfitData}
                usStatesData={usStatesData}
                storesByState={storesByState}
                getRegionColor={getRegionColor}
                getProfitColor={getProfitColor}
                toAbbr={toAbbr}
              />
            </div>

            {/* Map Options - Top Right */}
            {showRegionMap && showMapOptions && (
              <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white font-caslon mb-2">
                    Map View
                  </h4>
                  
                  {/* Map Mode Dropdown */}
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => handleMapModeChange('region')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors font-caslon ${
                        mapMode === 'region' 
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Regional Map
                    </button>
                    <button
                      onClick={() => handleMapModeChange('profit')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors font-caslon ${
                        mapMode === 'profit' 
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Profit Map
                    </button>
                  </div>
                </div>
                
                {mapMode === 'region' ? (
                  // Region mode options
                  <div>
                    <div className="mb-2">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 font-caslon">
                        {selectedRegion ? `${selectedRegion} Region` : 'Select Region'}
                      </h5>
                    </div>
                    
                    {!selectedRegion ? (
                      <div className="space-y-1">
                        {['West', 'East', 'Central', 'South'].map((region) => {
                          const regionStoreCount = stores.filter(store => store.region === region).length;
                          if (regionStoreCount === 0) return null;
                          
                          return (
                            <button
                              key={region}
                              onClick={() => handleRegionSelect(region)}
                              className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getRegionColor(region) }}
                              ></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400 font-caslon">{region}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                                ({regionStoreCount})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getRegionColor(selectedRegion) }}
                          ></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-caslon">
                            {selectedRegion} Region - {stores.filter(store => store.region === selectedRegion).length} stores
                          </span>
                        </div>
                        <button
                          onClick={handleBackToHeatmap}
                          className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-caslon text-center py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          ← Back to All Regions
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Profit mode legend
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 font-caslon mb-2">
                      Profit Legend
                    </h5>
                    {stateProfitData.size > 0 ? (
                      <div className="space-y-1">
                        {(() => {
                          const profits = Array.from(stateProfitData.values()).sort((a, b) => b - a);
                          const totalStates = profits.length;
                          
                          // Use percentiles for better distribution
                          const highThreshold = profits[Math.floor(totalStates * 0.33)]; // Top 33%
                          const lowThreshold = profits[Math.floor(totalStates * 0.67)]; // Bottom 33%
                          
                          return (
                            <>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(0, 51, 255)' }}></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-caslon">
                                  High: ${highThreshold.toLocaleString()}+
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(127, 51, 127)' }}></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-caslon">
                                  Mid: ${lowThreshold.toLocaleString()} - ${highThreshold.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(255, 51, 0)' }}></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-caslon">
                                  Low: ${lowThreshold.toLocaleString()}-
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-caslon">
                        Loading profit data...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom Zoom Controls - Bottom Right */}
            <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col">
                <button
                  onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
                  title="Zoom in"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <button
                  onClick={() => setMapZoom(prev => Math.max(prev - 1, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
                  title="Zoom out"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Floating Info Card - MUST be above map */}
            {isInfoCardOpen ? (
              <div className="absolute left-4 top-4 bottom-4 w-80 z-[9999] pointer-events-auto">
                <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[calc(100vh-200px)]">
                <div className="p-4 pb-4 flex flex-col h-full">
                  {selectedStore ? (
                    <div className="h-full flex flex-col">
                      {/* Header with close button */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-caslon">
                          {selectedStore.store_name}
                        </h2>
                         <button
                           onClick={handleCloseStoreInfo}
                           className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                           title="Close"
                         >
                           <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                      </div>
                      
                      <div className="space-y-6 flex-1 overflow-y-auto">
                        {/* Location Card */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Location</h3>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedStore.address}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStore.city}, {selectedStore.state} {selectedStore.postal_code}</p>
                          </div>
                        </div>

                        {/* Statistics Card */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Statistics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedStore.total_transactions}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Sales</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">${selectedStore.total_sales.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Profit</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${selectedStore.total_profit.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Discount</p>
                              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{(selectedStore.avg_discount * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Products Card */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Products</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Categories</p>
                              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{selectedStore.categories_available}</p>
                            </div>
                            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Subcategories</p>
                              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{selectedStore.subcategories_available}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Posts & Reviews</h3>
                           <button
                             onClick={() => setIsPostModalOpen(true)}
                             className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2 font-caslon"
                           >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Post</span>
                          </button>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {storePosts.length > 0 ? (
                            storePosts.map((post) => (
                              <div key={post.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-white">
                                        {post.user_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{post.user_name}</span>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                          {post.post_type}
                                        </span>
                                        {post.rating && (
                                          <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                              <svg
                                                key={i}
                                                className={`w-3 h-3 ${i < post.rating! ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(post.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No posts yet</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">Be the first to share your experience!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                       {/* Google Maps style header */}
                       <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                             </svg>
                           </div>
                           <div>
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-caslon">Stores</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400">{stores.length} locations</p>
                           </div>
                         </div>
                         <div className="flex items-center space-x-2">
                           <button 
                             onClick={handleSortToggle}
                             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                             title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                           >
                             <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                             </svg>
                           </button>
                           <button 
                             onClick={handleRegionMapToggle}
                             className={`p-2 rounded-full transition-colors ${
                               showRegionMap 
                                 ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                 : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                             }`}
                             title={showRegionMap ? "Map Options" : "Toggle Region Map"}
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                             </svg>
                           </button>
                           <button 
                             onClick={() => setIsInfoCardOpen(false)}
                             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                             title="Close"
                           >
                             <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                           </button>
                         </div>
                       </div>

                      {/* Search bar */}
                      <div className="mb-4 flex-shrink-0">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Search stores..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Store list - takes remaining space */}
                      <div className="flex-1 flex flex-col min-h-0 max-h-[calc(100vh-300px)]">
                        <div className="flex-1 overflow-y-auto" ref={setStoreListRef}>
                          <div className="space-y-1">
                            {getSortedStores().slice(0, visibleStoresCount).map((store, index) => {
                              if (!store || typeof store !== 'object') return null;
                              const storeItem = store as StoreLocation;
                              const isSelected = selectedStore ? (selectedStore as any).id === storeItem.id : false;
                              return (
                                <button
                                  key={storeItem.id}
                                  onClick={() => handleStoreClick(storeItem.id)}
                                  className={`w-full p-3 text-left rounded-lg transition-all duration-300 border transform hover:scale-[1.02] ${
                                    isSelected 
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-md' 
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'
                                  } group`}
                                  style={{
                                    animationDelay: `${index * 50}ms`,
                                    animation: 'fadeInUp 0.3s ease-out forwards'
                                  }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                                      style={{
                                        backgroundColor: isSelected 
                                          ? '#3B82F6' 
                                          : (showRegionMap && mapMode === 'region' 
                                              ? getRegionColor(storeItem.region) 
                                              : (showRegionMap && mapMode === 'profit' 
                                                  ? getProfitColor(storeItem.state, stateProfitData) 
                                                  : '#374151'))
                                      }}
                                    >
                                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`text-sm font-semibold truncate transition-colors font-caslon ${
                                        isSelected 
                                          ? 'text-blue-700 dark:text-blue-300' 
                                          : 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                      }`}>
                                        {storeItem.store_name}
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {storeItem.city}, {storeItem.state}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {storeItem.postal_code}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <svg className={`w-4 h-4 transition-colors ${
                                        isSelected 
                                          ? 'text-blue-500' 
                                          : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Bottom section - always at bottom */}
                        <div className="flex-shrink-0 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {stores.length > visibleStoresCount && (
                            <div className="animate-fadeInUp">
                              <button 
                                onClick={handleShowMore}
                                className="w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-caslon"
                                disabled={visibleStoresCount >= stores.length}
                              >
                                Show more
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : (
              /* Round button when info card is closed */
              <div className="absolute left-4 top-4 z-[9999] pointer-events-auto">
                <button
                  onClick={() => setIsInfoCardOpen(true)}
                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110 font-caslon"
                  title="Open Store List"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Post Modal */}
      <Transition appear show={isPostModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPostModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4 font-caslon">
                    Add a Post
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit(onSubmitPost)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Your Name
                      </label>
                      <input
                        {...register('user_name', { required: 'Name is required' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter your name"
                      />
                      {errors.user_name && (
                        <p className="text-red-500 text-xs mt-1">{errors.user_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Post Type
                      </label>
                      <select
                        {...register('post_type')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="comment">Comment</option>
                        <option value="review">Review</option>
                        <option value="question">Question</option>
                        <option value="tip">Tip</option>
                      </select>
                    </div>

                    {postType === 'review' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Rating (1-5)
                        </label>
                        <input
                          {...register('rating', { 
                            min: { value: 1, message: 'Rating must be at least 1' },
                            max: { value: 5, message: 'Rating must be at most 5' }
                          })}
                          type="number"
                          min="1"
                          max="5"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {errors.rating && (
                          <p className="text-red-500 text-xs mt-1">{errors.rating.message}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                      </label>
                      <textarea
                        {...register('content', { required: 'Content is required' })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Share your experience..."
                      />
                      {errors.content && (
                        <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsPostModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      </div>
    </>
  );
}