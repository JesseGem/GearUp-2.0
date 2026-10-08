import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const locationService = {
  requestPermission: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Needed',
        'GearUp needs your location to connect you with nearby mechanics. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  },

  getCurrentLocation: async (): Promise<{ latitude: number; longitude: number } | null> => {
    const granted = await locationService.requestPermission();
    if (!granted) return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },
};