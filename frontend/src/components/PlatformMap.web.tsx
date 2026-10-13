import React, { ReactNode } from 'react';
import { COLORS } from '../constants';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Coordinate = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type MapViewProps = {
  children?: ReactNode;
  initialRegion?: Coordinate;
  provider?: unknown;
  style?: StyleProp<ViewStyle>;
};

type MarkerProps = {
  children?: ReactNode;
  coordinate: Coordinate;
  description?: string;
  draggable?: boolean;
  onDragEnd?: (event: { nativeEvent: { coordinate: Coordinate } }) => void;
  onPress?: () => void;
  title?: string;
};

type PolylineProps = {
  coordinates: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
};

export default function MapView({ initialRegion, style }: MapViewProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Interactive map is available in the iOS and Android apps.</Text>
      {initialRegion ? (
        <Text style={styles.coordinates}>
          Map center: {initialRegion.latitude.toFixed(5)}, {initialRegion.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

export function Marker(_props: MarkerProps) {
  return null;
}

export function Polyline(_props: PolylineProps) {
  return null;
}

export const PROVIDER_DEFAULT = undefined;

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  coordinates: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
