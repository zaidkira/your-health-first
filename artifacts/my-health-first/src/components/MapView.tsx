import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

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

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  details: string;
  onAction?: () => void;
  actionLabel?: string;
}

interface MapViewProps {
  points: MapPoint[];
  className?: string;
  center?: [number, number];
}

export function MapView({ points, className = "h-[400px] w-full rounded-md", center }: MapViewProps) {
  const filteredPoints = points.filter(p => p.lat && p.lng);
  
  // Calculate center if not provided
  const mapCenter: [number, number] = center || (filteredPoints.length > 0 
    ? [filteredPoints[0].lat, filteredPoints[0].lng] 
    : [36.7538, 3.0588]);

  const handleDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className={className}>
      <MapContainer
        center={mapCenter}
        zoom={filteredPoints.length > 1 ? 6 : 13}
        scrollWheelZoom={true}
        className="h-full w-full rounded-md border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredPoints.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng]}>
            <Popup>
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-lg">{point.title}</h3>
                <p className="text-sm font-medium text-primary">{point.subtitle}</p>
                <p className="text-xs text-muted-foreground mt-1">{point.details}</p>
                <div className="flex gap-2 mt-4">
                  {point.onAction && (
                    <Button size="sm" onClick={point.onAction} className="flex-1">
                      {point.actionLabel || "View"}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDirections(point.lat, point.lng)}
                    className="flex-1"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
