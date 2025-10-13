'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { StoreLocation, MapMode } from '../types';
import type { FeatureCollection } from 'geojson';

// Lazy load Leaflet components only on client side
let MapContainer: any;
let TileLayer: any;
let GeoJSON: any;
let MapCenter: any;
let StoreMarker: any;

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  mapRef: React.MutableRefObject<any>;
  stores: StoreLocation[];
  selectedStore: any;
  onStoreClick: (storeId: number) => void;
  onPopupClose: () => void;
  showRegionMap: boolean;
  mapMode: MapMode;
  stateProfitData: Map<string, number>;
  usStatesData: FeatureCollection | null;
  storesByState: Map<string, string>;
  getRegionColor: (region: string) => string;
  getProfitColor: (stateName: string, profitData: Map<string, number>) => string;
  toAbbr: (stateName: string) => string | undefined;
}

export const LeafletMap: React.FC<LeafletMapProps> = (props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const {
    center,
    zoom,
    mapRef,
    stores,
    selectedStore,
    onStoreClick,
    onPopupClose,
    showRegionMap,
    mapMode,
    stateProfitData,
    usStatesData,
    storesByState,
    getRegionColor,
    getProfitColor,
    toAbbr,
  } = props;

  useEffect(() => {
    // Only load on client side
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet').then(mod => {
          MapContainer = mod.MapContainer;
          TileLayer = mod.TileLayer;
          GeoJSON = mod.GeoJSON;
        }),
        import('./MapCenter').then(mod => {
          MapCenter = mod.MapCenter;
        }),
        import('./StoreMarker').then(mod => {
          StoreMarker = mod.StoreMarker;
        })
      ]).then(() => {
        setIsLoaded(true);
      }).catch(err => {
        console.error('Error loading map components:', err);
      });
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={false}
      ref={(map: any) => {
        if (map) mapRef.current = map;
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenter center={center} />
      
      {/* PAINT REAL STATE SHAPES BASED ON MAP MODE */}
      {showRegionMap && usStatesData && (
        <GeoJSON
          data={usStatesData}
          interactive={false}
          style={(feature) => {
            if (!feature) {
              return { fillColor: 'transparent', fillOpacity: 0, color: 'transparent', weight: 0, opacity: 0 };
            }
            
            const featureProps = (feature.properties ?? {}) as Record<string, any>;
            const stateName = featureProps.STUSPS || featureProps.STATE_ABBR || featureProps.NAME || featureProps.name || featureProps.state || featureProps.abbr || featureProps.code;
            const abbr: string | undefined = toAbbr(stateName);
            
            if (mapMode === 'region') {
              const region = abbr ? storesByState.get(abbr) : undefined;
              if (!region) {
                return { 
                  fillColor: 'transparent', 
                  fillOpacity: 0, 
                  color: 'transparent', 
                  weight: 0, 
                  opacity: 0 
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
              const stateAbbr = toAbbr(stateName);
              if (!stateAbbr || !storesByState.has(stateAbbr)) {
                return { 
                  fillColor: 'transparent', 
                  fillOpacity: 0, 
                  color: 'transparent', 
                  weight: 0, 
                  opacity: 0 
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
      )}
      
      {stores.map((store) => (
        <StoreMarker
          key={store.id}
          store={store}
          isSelected={selectedStore?.store_id === store.id}
          onMarkerClick={onStoreClick}
          onPopupClose={onPopupClose}
          showRegionMap={showRegionMap}
          mapMode={mapMode}
          stateProfitData={stateProfitData}
        />
      ))}
    </MapContainer>
  );
};

LeafletMap.displayName = 'LeafletMap';

