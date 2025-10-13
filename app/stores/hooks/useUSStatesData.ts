import { useState, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

export const useUSStatesData = () => {
  const [usStatesData, setUsStatesData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    const loadUSStatesData = async () => {
      try {
        // Load from reliable GeoJSON source
        const response = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
        if (response.ok) {
          const data = await response.json();
          setUsStatesData(data);
          return;
        }
      } catch (err) {
        console.error('Failed to load US states GeoJSON:', err);
      }
      
      // If fetch fails, try alternative source
      try {
        const response = await fetch('https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_5m.json');
        if (response.ok) {
          const data = await response.json();
          setUsStatesData(data);
          return;
        }
      } catch (err) {
        console.error('Failed to load US states from alternative source:', err);
      }
    };

    loadUSStatesData();
  }, []);

  return usStatesData;
};

