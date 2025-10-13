# Building an Interactive Store Locator Map with Next.js and Leaflet

## Introduction

In this tutorial, we'll build a fully interactive store locator map using Next.js 14, React-Leaflet, and Supabase. This map features real-time store data, custom markers, and smooth animations.

## Tech Stack

- **Next.js 14** (App Router)
- **React-Leaflet** - React components for Leaflet maps
- **Leaflet** - Open-source JavaScript library for interactive maps
- **Supabase** - Backend database for store data
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## The Challenge: SSR vs Client-Side Rendering

One of the biggest challenges with Leaflet in Next.js is that Leaflet requires the `window` object, which doesn't exist during Server-Side Rendering (SSR).

### Problem
```typescript
// ❌ This will fail with "window is not defined"
import { MapContainer, TileLayer } from 'react-leaflet';

export default function Map() {
  return <MapContainer>...</MapContainer>
}
```

### Solution: Dynamic Imports with Client-Side Loading

We solve this by creating a wrapper component that dynamically loads Leaflet only on the client side:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

let MapContainer: any;
let TileLayer: any;
let Marker: any;

export const LeafletMap: React.FC<MapProps> = (props) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only load on client side
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet').then(mod => {
          MapContainer = mod.MapContainer;
          TileLayer = mod.TileLayer;
          Marker = mod.Marker;
        })
      ]).then(() => setIsLoaded(true));
    }
  }, []);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  return (
    <MapContainer
      center={props.center}
      zoom={props.zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {/* Your markers here */}
    </MapContainer>
  );
};
```

## Step 1: Setting Up the Project

First, install the required dependencies:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## Step 2: Creating Custom Hooks

### useStores Hook - Fetching Store Data

```typescript
// hooks/useStores.ts
import { useState, useEffect } from 'react';

export const useStores = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('http://localhost:8000/v1/stores/');
        const data = await response.json();
        setStores(data);
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return { stores, loading };
};
```

### useMapControl Hook - Managing Map State

```typescript
// hooks/useMapControl.ts
import { useState, useRef } from 'react';
import type { Map as LeafletMapType } from 'leaflet';

export const useMapControl = () => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.8, -96]);
  const [mapZoom, setMapZoom] = useState(4);
  const mapRef = useRef<LeafletMapType | null>(null);

  const animateToStore = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 12, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  };

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(mapCenter, 4, {
        duration: 1.5
      });
    }
  };

  return {
    mapCenter,
    mapZoom,
    mapRef,
    setMapCenter,
    setMapZoom,
    animateToStore,
    resetView
  };
};
```

## Step 3: Creating Custom Markers

```typescript
// components/StoreMarker.tsx
'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Custom marker icon
const createCustomIcon = (isSelected: boolean) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${isSelected ? '#EF4444' : '#000000'};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" fill="white" viewBox="0 0 20 20">
          <path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export const StoreMarker: React.FC<StoreMarkerProps> = ({
  store,
  isSelected,
  onMarkerClick
}) => {
  return (
    <Marker
      position={[store.latitude, store.longitude]}
      icon={createCustomIcon(isSelected)}
      eventHandlers={{
        click: () => onMarkerClick(store.id)
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold">{store.store_name}</h3>
          <p className="text-sm">{store.city}, {store.state}</p>
        </div>
      </Popup>
    </Marker>
  );
};
```

## Step 4: Adding Smooth Animations

### Zoom Animation on Store Selection

```typescript
const handleStoreClick = async (storeId: number) => {
  const storeData = await fetchStoreDetails(storeId);
  
  if (storeData) {
    // Animate to store location
    setTimeout(() => {
      if (storeData.latitude && storeData.longitude) {
        animateToStore(storeData.latitude, storeData.longitude);
      }
    }, 100);
  }
};
```

### Scroll Animation for Store List

```typescript
const handleShowMore = () => {
  const newCount = Math.min(visibleStoresCount + 6, stores.length);
  setVisibleStoresCount(newCount);
  
  // Smooth scroll to bottom
  setTimeout(() => {
    if (storeListRef) {
      storeListRef.scrollTo({
        top: storeListRef.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, 100);
};
```

## Step 5: Integrating with Supabase

### Database Schema

```sql
-- Store locations table
CREATE TABLE store_locations (
  id SERIAL PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  region VARCHAR(50)
);

-- Store statistics table
CREATE TABLE store_statistics (
  store_id INTEGER REFERENCES store_locations(id),
  total_sales DECIMAL(12, 2),
  total_transactions INTEGER,
  total_profit DECIMAL(12, 2),
  avg_discount DECIMAL(5, 4)
);
```

### Fetching Data from Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const fetchStores = async () => {
  const { data, error } = await supabase
    .from('store_locations')
    .select('*')
    .limit(100);

  if (error) throw error;
  return data;
};
```

## Step 6: Main Map Component

```typescript
// app/stores/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useStores } from './hooks/useStores';
import { useMapControl } from './hooks/useMapControl';

// Dynamic import to avoid SSR issues
const LeafletMap = dynamic(
  () => import('./components/LeafletMap').then(mod => ({ default: mod.LeafletMap })),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

export default function StoreLocatorPage() {
  const { stores, loading } = useStores();
  const { mapCenter, mapZoom, mapRef, animateToStore } = useMapControl();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="h-screen flex">
      {/* Store List Sidebar */}
      <div className="w-80 overflow-y-auto">
        {stores.map(store => (
          <StoreCard
            key={store.id}
            store={store}
            onClick={() => animateToStore(store.latitude, store.longitude)}
          />
        ))}
      </div>

      {/* Map */}
      <div className="flex-1">
        <LeafletMap
          center={mapCenter}
          zoom={mapZoom}
          mapRef={mapRef}
          stores={stores}
        />
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always use dynamic imports** for Leaflet components in Next.js
2. **Load Leaflet CSS** at the component level: `import 'leaflet/dist/leaflet.css'`
3. **Use refs** to access the map instance for programmatic control
4. **Memoize expensive calculations** with `useMemo`
5. **Clean up event listeners** in `useEffect` cleanup functions

## Performance Optimization

```typescript
// Memoize store markers to prevent unnecessary re-renders
const storeMarkers = useMemo(() => {
  return stores.map(store => (
    <StoreMarker
      key={store.id}
      store={store}
      isSelected={selectedStore?.id === store.id}
      onMarkerClick={handleStoreClick}
    />
  ));
}, [stores, selectedStore]);
```

## Conclusion

You now have a fully functional, interactive store locator map with:
- ✅ SSR-safe implementation
- ✅ Custom markers with dynamic styling
- ✅ Smooth animations
- ✅ Real-time data from Supabase
- ✅ Responsive design
- ✅ Performance optimizations

## Next Steps

In the next tutorial, we'll add:
- Regional heatmaps
- Profit visualization
- Advanced filtering
- User-generated content (reviews/posts)

---

**Source Code**: [GitHub Repository](https://github.com/your-repo)
**Live Demo**: [View Demo](https://your-demo-url.com)

