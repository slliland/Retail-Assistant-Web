'use client';

import { Marker, Popup } from 'react-leaflet';
import type { StoreLocation } from '../types';

// Dynamically import Icon to avoid SSR issues
let Icon: any;
if (typeof window !== 'undefined') {
  Icon = require('leaflet').Icon;
}

interface StoreMarkerProps {
  store: StoreLocation;
  isSelected: boolean;
  onMarkerClick: (storeId: number) => void;
  onPopupClose: () => void;
  showRegionMap: boolean;
  mapMode: 'region' | 'profit';
  stateProfitData: Map<string, number>;
}

export function StoreMarker({
  store,
  isSelected,
  onMarkerClick,
  onPopupClose,
  showRegionMap,
  mapMode,
  stateProfitData
}: StoreMarkerProps) {
  // Marker color: black by default, red when selected
  const markerColor = isSelected ? '#DC2626' : '#000000';
  
  const markerIcon = new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M16 0C7.2 0 0 7.2 0 16c0 16 16 24 16 24s16-8 16-24C32 7.2 24.8 0 16 0z" 
              fill="${markerColor}" 
              stroke="white" 
              stroke-width="2"
              filter="url(#shadow)"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
        <circle cx="16" cy="16" r="5" fill="${markerColor}"/>
      </svg>
    `)}`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  });
  
  return (
    <Marker
      key={`${store.id}-${isSelected}`}
      position={[store.latitude, store.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: () => onMarkerClick(store.id),
      }}
    >
      <Popup>
        <div className="p-2 relative">
          <button 
            onClick={onPopupClose}
            className="absolute top-1 right-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Close and zoom out"
          >
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-semibold text-sm pr-6">{store.store_name}</h3>
          <p className="text-xs text-gray-600">{store.city}, {store.state}</p>
          <p className="text-xs text-gray-500">{store.postal_code}</p>
          {showRegionMap && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: markerColor }}></span>
              {mapMode === 'region' ? store.region : `State Profit: $${(stateProfitData.get(store.state) || 0).toLocaleString()}`}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

