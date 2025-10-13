import { useState, useEffect } from 'react';
import type { StoreLocation } from '../types';

export const useStores = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateProfitData, setStateProfitData] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/v1/stores/');
        if (!response.ok) {
          throw new Error('Failed to fetch stores');
        }
        const data = await response.json();
        setStores(data);
        
        // Fetch profit data by state
        try {
          const profitResponse = await fetch('http://localhost:8000/v1/stores/profit-by-state');
          if (profitResponse.ok) {
            const profitData = await profitResponse.json();
            const profitMap = new Map<string, number>();
            
            for (const [state, profit] of Object.entries(profitData)) {
              profitMap.set(state, profit as number);
            }
            
            setStateProfitData(profitMap);
          }
        } catch (error) {
          console.error('Error fetching profit data:', error);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        setError('Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return { stores, loading, error, stateProfitData };
};

