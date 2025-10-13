import { useState } from 'react';
import type { StoreStatistics, StorePost } from '../types';

export const useStoreDetails = () => {
  const [selectedStore, setSelectedStore] = useState<StoreStatistics | null>(null);
  const [storePosts, setStorePosts] = useState<StorePost[]>([]);

  const fetchStoreDetails = async (storeId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/v1/stores/${storeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch store details');
      }
      const storeData = await response.json();
      setSelectedStore(storeData);
      
      // Fetch posts for this store
      const postsResponse = await fetch(`http://localhost:8000/v1/stores/${storeId}/posts`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setStorePosts(postsData);
      }
      
      return storeData;
    } catch (error) {
      console.error('Error fetching store details:', error);
      return null;
    }
  };

  const clearStoreDetails = () => {
    setSelectedStore(null);
    setStorePosts([]);
  };

  const addPost = (post: StorePost) => {
    setStorePosts(prev => [post, ...prev]);
  };

  return {
    selectedStore,
    storePosts,
    fetchStoreDetails,
    clearStoreDetails,
    addPost
  };
};

