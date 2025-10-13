'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapCenterProps {
  center: [number, number];
}

export function MapCenter({ center }: MapCenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
}

