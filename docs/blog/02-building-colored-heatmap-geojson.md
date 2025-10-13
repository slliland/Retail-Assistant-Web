# Building Regional and Profit Heatmaps with GeoJSON and Leaflet

## Introduction

Learn how to create stunning data visualizations on maps using GeoJSON state boundaries, dynamic coloring based on business metrics, and interactive legends.

## What We'll Build

- **Regional Heatmap**: Color states by business regions (West, East, Central, South)
- **Profit Heatmap**: Color states by profit levels (blue = high, red = low)
- **Interactive Legends**: Click to zoom into specific regions
- **Real US State Boundaries**: Using actual GeoJSON data

## Tech Stack

- **GeoJSON** - Geographic data format
- **Leaflet GeoJSON Layer** - Render geographic features
- **React State Management** - Toggle between map modes
- **Supabase** - Store profit data by state

## Step 1: Loading US States GeoJSON Data

### Creating the Hook

```typescript
// hooks/useUSStatesData.ts
import { useState, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

export const useUSStatesData = () => {
  const [usStatesData, setUsStatesData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    const loadUSStatesData = async () => {
      try {
        // Load from reliable GeoJSON source
        const response = await fetch(
          'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        );
        
        if (response.ok) {
          const data = await response.json();
          setUsStatesData(data);
          return;
        }
      } catch (err) {
        console.error('Failed to load US states GeoJSON:', err);
      }
      
      // Fallback source
      try {
        const response = await fetch(
          'https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_5m.json'
        );
        if (response.ok) {
          const data = await response.json();
          setUsStatesData(data);
        }
      } catch (err) {
        console.error('Failed to load from fallback source:', err);
      }
    };

    loadUSStatesData();
  }, []);

  return usStatesData;
};
```

## Step 2: State Name Normalization

Different GeoJSON sources use different property names for states. We need to normalize them:

```typescript
// utils/mapUtils.ts

// Map full state names to abbreviations
export const NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  // ... all 50 states
};

export const toAbbr = (stateName: string): string | undefined => {
  if (!stateName) return undefined;
  
  // Already an abbreviation
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }
  
  // Convert full name to abbreviation
  const normalized = stateName.trim();
  return NAME_TO_ABBR[normalized];
};
```

## Step 3: Pre-computing Store-to-State Mapping

For O(1) lookup performance, pre-compute which states have stores:

```typescript
// In your main component
const storesByState = useMemo<Map<string, string>>(() => {
  const map = new Map<string, string>(); // abbr -> region
  
  for (const store of stores) {
    const abbr = toAbbr(store.state);
    if (!abbr) continue;
    
    // Map state to its region
    if (!map.has(abbr)) {
      map.set(abbr, store.region);
    }
  }
  
  return map;
}, [stores]);
```

## Step 4: Regional Heatmap Colors

Define colors for each business region:

```typescript
// utils/mapUtils.ts

export const getRegionColor = (region: string): string => {
  const colors: Record<string, string> = {
    'West': '#10B981',    // Green
    'East': '#3B82F6',    // Blue
    'Central': '#F59E0B', // Orange
    'South': '#EF4444',   // Red
  };
  
  return colors[region] || '#6B7280'; // Gray fallback
};
```

## Step 5: Profit Heatmap with Gradient Colors

Create a color gradient from red (low profit) to blue (high profit):

```typescript
// utils/mapUtils.ts

export const getProfitColor = (
  stateName: string,
  profitData: Map<string, number>
): string => {
  const stateAbbr = toAbbr(stateName);
  if (!stateAbbr) return 'transparent';
  
  const profit = profitData.get(stateAbbr);
  if (profit === undefined) return 'transparent';
  
  // Get all profits to calculate percentiles
  const allProfits = Array.from(profitData.values()).sort((a, b) => b - a);
  const totalStates = allProfits.length;
  
  // Use percentiles for better distribution
  const highThreshold = allProfits[Math.floor(totalStates * 0.33)]; // Top 33%
  const lowThreshold = allProfits[Math.floor(totalStates * 0.67)];  // Bottom 33%
  
  if (profit >= highThreshold) {
    // High profit: Blue
    return 'rgb(0, 51, 255)';
  } else if (profit <= lowThreshold) {
    // Low profit: Red
    return 'rgb(255, 51, 0)';
  } else {
    // Mid profit: Purple (blend of red and blue)
    const ratio = (profit - lowThreshold) / (highThreshold - lowThreshold);
    const red = Math.round(255 * (1 - ratio));
    const blue = Math.round(255 * ratio);
    return `rgb(${red}, 51, ${blue})`;
  }
};
```

## Step 6: Fetching Profit Data from Backend

```typescript
// hooks/useStores.ts

export const useStores = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [stateProfitData, setStateProfitData] = useState<Map<string, number>>(new Map());
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch stores
      const storesResponse = await fetch('http://localhost:8000/v1/stores/');
      const storesData = await storesResponse.json();
      setStores(storesData);
      
      // Fetch profit by state
      const profitResponse = await fetch('http://localhost:8000/v1/stores/profit-by-state');
      const profitData = await profitResponse.json();
      
      // Convert to Map for O(1) lookup
      const profitMap = new Map<string, number>();
      Object.entries(profitData).forEach(([state, profit]) => {
        profitMap.set(state, profit as number);
      });
      
      setStateProfitData(profitMap);
    };
    
    fetchData();
  }, []);
  
  return { stores, stateProfitData };
};
```

## Step 7: Rendering the GeoJSON Layer

```typescript
// components/LeafletMap.tsx

<GeoJSON
  data={usStatesData}
  interactive={false}
  style={(feature) => {
    if (!feature) {
      return { 
        fillColor: 'transparent', 
        fillOpacity: 0, 
        color: 'transparent', 
        weight: 0 
      };
    }
    
    // Extract state name from various possible property names
    const props = feature.properties ?? {};
    const stateName = props.STUSPS || props.STATE_ABBR || props.NAME || 
                     props.name || props.state || props.abbr;
    const abbr = toAbbr(stateName);
    
    if (mapMode === 'region') {
      // Regional coloring
      const region = abbr ? storesByState.get(abbr) : undefined;
      
      if (!region) {
        // State has no stores - keep transparent
        return { 
          fillColor: 'transparent', 
          fillOpacity: 0, 
          color: 'transparent', 
          weight: 0 
        };
      }
      
      const color = getRegionColor(region);
      return { 
        fillColor: color, 
        fillOpacity: 0.6, 
        color, 
        weight: 1, 
        opacity: 0.8 
      };
    } else {
      // Profit coloring
      if (!abbr || !storesByState.has(abbr)) {
        return { 
          fillColor: 'transparent', 
          fillOpacity: 0, 
          color: 'transparent', 
          weight: 0 
        };
      }
      
      const color = getProfitColor(stateName, stateProfitData);
      return { 
        fillColor: color, 
        fillOpacity: 0.6, 
        color, 
        weight: 1, 
        opacity: 0.8 
      };
    }
  }}
/>
```

## Step 8: Interactive Legend Component

```typescript
// components/MapLegend.tsx

export const MapLegend: React.FC<MapLegendProps> = ({
  mapMode,
  onMapModeChange,
  onRegionSelect,
  stores,
  stateProfitData
}) => {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
      {/* Mode Toggle */}
      <div className="flex space-x-2 mb-3">
        <button
          onClick={() => onMapModeChange('region')}
          className={`px-3 py-1 text-xs rounded-full ${
            mapMode === 'region' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Regional Map
        </button>
        <button
          onClick={() => onMapModeChange('profit')}
          className={`px-3 py-1 text-xs rounded-full ${
            mapMode === 'profit' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Profit Map
        </button>
      </div>
      
      {/* Legend Content */}
      {mapMode === 'region' ? (
        <div className="space-y-1">
          {['West', 'East', 'Central', 'South'].map((region) => {
            const count = stores.filter(s => s.region === region).length;
            if (count === 0) return null;
            
            return (
              <button
                key={region}
                onClick={() => onRegionSelect(region)}
                className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getRegionColor(region) }}
                />
                <span className="text-xs">{region}</span>
                <span className="text-xs text-gray-500 ml-auto">({count})</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs">High Profit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs">Mid Profit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs">Low Profit</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Step 9: Zoom to Region Functionality

```typescript
const handleRegionSelect = (region: string) => {
  setSelectedRegion(region);
  
  // Get all stores in this region
  const regionStores = stores.filter(store => store.region === region);
  
  if (regionStores.length > 0) {
    // Calculate bounding box
    const lats = regionStores.map(store => store.latitude);
    const lngs = regionStores.map(store => store.longitude);
    
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    
    // Animate to region center
    if (mapRef.current) {
      mapRef.current.flyTo([centerLat, centerLng], 6, {
        duration: 1.5
      });
    }
  }
};
```

## Backend API for Profit Data

```python
# retail_api.py (FastAPI)

@app.get("/v1/stores/profit-by-state")
async def get_profit_by_state():
    """Get total profit aggregated by state"""
    query = """
        SELECT state, SUM(profit) as total_profit
        FROM retail_data
        GROUP BY state
        ORDER BY total_profit DESC
    """
    
    result = supabase.rpc('execute_sql', {'query': query}).execute()
    
    # Convert to dictionary
    profit_by_state = {
        row['state']: row['total_profit']
        for row in result.data
    }
    
    return profit_by_state
```

## Performance Considerations

1. **Use `useMemo` for expensive calculations**:
```typescript
const storesByState = useMemo(() => {
  // Expensive computation
}, [stores]);
```

2. **Set `interactive={false}` on GeoJSON layers** to improve performance

3. **Pre-compute color scales** instead of calculating on every render

4. **Use Map/Set for O(1) lookups** instead of array searches

## Styling Tips

```css
/* Smooth transitions for hover effects */
.leaflet-interactive {
  transition: fill-opacity 0.2s ease;
}

.leaflet-interactive:hover {
  fill-opacity: 0.8 !important;
}
```

## Conclusion

You now have:
- ✅ Real US state boundaries from GeoJSON
- ✅ Dynamic regional coloring
- ✅ Profit-based heatmap with gradients
- ✅ Interactive legend with zoom functionality
- ✅ Performance-optimized rendering
- ✅ Only states with stores are colored

## Next Steps

- Add state-level tooltips
- Implement county-level granularity
- Add time-based profit animations
- Create custom color schemes

---

**Full Code**: [GitHub Repository](https://github.com/your-repo)
**Live Demo**: [View Demo](https://your-demo-url.com)

