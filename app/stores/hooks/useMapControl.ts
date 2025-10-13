import { useState, useRef, useEffect } from 'react';
import type L from 'leaflet';

export const useMapControl = () => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]); // Center of US
  const [mapZoom, setMapZoom] = useState(4);
  const mapRef = useRef<L.Map | null>(null);

  const animateToStore = (lat: number, lng: number, zoom: number = 12) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoom, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([39.8283, -98.5795], 4, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const zoomToRegion = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 6, {
        animate: true,
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
    resetView,
    zoomToRegion
  };
};

