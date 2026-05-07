import { useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix for default marker icon in leaflet
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapLocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
  className?: string;
}

function LocationMarker({ value, onChange }: MapLocationPickerProps) {
  useMapEvents({
    click(e) {
      onChange(e.latlng);
    },
  });

  return value ? <Marker position={value} /> : null;
}

export function MapLocationPicker({ value, onChange, className = "h-[300px] w-full rounded-md" }: MapLocationPickerProps) {
  const initialPosition = value || { lat: 36.7538, lng: 3.0588 }; // Default to Algiers

  return (
    <div className={className}>
      <MapContainer
        center={[initialPosition.lat, initialPosition.lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full rounded-md border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker value={value} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
