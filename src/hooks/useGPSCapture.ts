import { useState, useCallback } from 'react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GPSError {
  code: number;
  message: string;
}

export const useGPSCapture = () => {
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [loading, setLoading] = useState(false);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by your browser' });
      return;
    }

    setLoading(true);
    setError(null);

    // Use watchPosition for faster initial fix, then stop watching
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
        navigator.geolocation.clearWatch(watchId);
      },
      (err) => {
        let message = 'Unable to retrieve location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Location information unavailable. Please ensure your device location is turned on.';
            break;
          case err.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        setError({ code: err.code, message });
        setLoading(false);
        navigator.geolocation.clearWatch(watchId);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const reset = useCallback(() => {
    setCoordinates(null);
    setError(null);
    setLoading(false);
  }, []);

  return { coordinates, error, loading, captureLocation, reset };
};
