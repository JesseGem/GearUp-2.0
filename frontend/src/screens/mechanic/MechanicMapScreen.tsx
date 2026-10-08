import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Linking, Alert, Modal, Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/locationService';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

export default function MechanicMapScreen({ route, navigation }: any) {
  const { job } = route.params;
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    const getMyLocation = async () => {
      try {
        const coords = await locationService.getCurrentLocation();
        if (coords) setMyLocation(coords);
      } catch (e) {
        // location unavailable — still show owner pin
      } finally {
        setLoadingLocation(false);
      }
    };
    getMyLocation();
  }, []);

  const fetchRoute = async () => {
    if (!myLocation) {
      Alert.alert('Location unavailable', "We couldn't get your current location to draw a route.");
      return;
    }
    setFetchingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.longitude},${myLocation.latitude};${job.longitude},${job.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coords = routeData.geometry.coordinates.map((c: [number, number]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoords(coords);
        const km = (routeData.distance / 1000).toFixed(1);
        const mins = Math.round(routeData.duration / 60);
        setRouteInfo({ distance: `${km} km`, duration: `${mins} min` });
      } else {
        Alert.alert('No route found', "Couldn't find a driving route between these points.");
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load the route. Check your internet connection.');
    } finally {
      setFetchingRoute(false);
    }
  };

  const ownerRegion = {
    latitude: job.latitude,
    longitude: job.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const openAppleMaps = () => {
    const dest = `${job.latitude},${job.longitude}`;
    const src = myLocation ? `${myLocation.latitude},${myLocation.longitude}` : null;
    const url = src ? `maps://app?saddr=${src}&daddr=${dest}` : `maps://app?daddr=${dest}`;
    setShowMapModal(false);
    Linking.openURL(url);
  };

  const openGoogleMaps = () => {
    const dest = `${job.latitude},${job.longitude}`;
    const src = myLocation ? `${myLocation.latitude},${myLocation.longitude}` : null;
    const url = src
      ? `https://www.google.com/maps/dir/?api=1&origin=${src}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    setShowMapModal(false);
    Linking.openURL(url);
  };

  const hasRoute = routeCoords.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#000814', '#001D3D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.headerSubtitle}>Owner's location</Text>
        </View>
      </LinearGradient>

      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={ownerRegion}>

        {hasRoute && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2563eb"
            strokeWidth={4}
          />
        )}

        <Marker
          coordinate={{ latitude: job.latitude, longitude: job.longitude }}
          title="Owner's Location"
          description={job.location || job.title}>
          <View style={styles.ownerPin}>
            <Ionicons name="car" size={20} color="#fff" />
          </View>
        </Marker>

        {myLocation && (
          <Marker
            coordinate={myLocation}
            title="Your Location">
            <View style={styles.mechanicPin}>
              <Ionicons name="construct" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1b4332' }]} />
            <Text style={styles.legendText}>Owner</Text>
          </View>
          {myLocation && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#000814' }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
          )}
          {loadingLocation && (
            <View style={styles.legendItem}>
              <ActivityIndicator size="small" color="#000814" />
              <Text style={styles.legendText}>Getting your location...</Text>
            </View>
          )}
        </View>

        {routeInfo && (
          <View style={styles.routeInfoRow}>
            <Ionicons name="time-outline" size={14} color="#000814" />
            <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
            <Ionicons name="speedometer-outline" size={14} color="#000814" style={{ marginLeft: 10 }} />
            <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
          </View>
        )}

        <View style={styles.jobInfoRow}>
          <Ionicons name="construct-outline" size={14} color="#6b7280" />
          <Text style={styles.jobInfoText}>{job.type}</Text>
          {job.location && <>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.jobInfoText}>{job.location}</Text>
          </>}
        </View>

        {job.finalCost && (
          <Text style={styles.costText}>Quoted: GHS {job.finalCost}</Text>
        )}

        <TouchableOpacity
          style={styles.directionsBtn}
          disabled={fetchingRoute}
          onPress={() => {
            if (hasRoute) {
              setShowMapModal(true);
            } else {
              fetchRoute();
            }
          }}>
          <LinearGradient colors={['#000814', '#001D3D']} style={styles.directionsGradient}>
            {fetchingRoute ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={hasRoute ? 'map-outline' : 'navigate'} size={18} color="#fff" />
            )}
            <Text style={styles.directionsBtnText}>
              {fetchingRoute ? 'Loading route...' : hasRoute ? 'Open in Maps' : 'Get Directions'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMapModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMapModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Open Directions In</Text>
            <Text style={styles.modalSubtitle}>Choose a maps app for turn-by-turn navigation</Text>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.modalOption} onPress={openAppleMaps}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#e5e7eb' }]}>
                  <Ionicons name="map" size={20} color="#1b1b1b" />
                </View>
                <Text style={styles.modalOptionText}>Apple Maps</Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalOption} onPress={openGoogleMaps}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="navigate" size={20} color="#000814" />
              </View>
              <Text style={styles.modalOptionText}>Google Maps</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMapModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: FONT_SIZES.xs, color: '#fde68a', marginTop: 2 },
  map: { flex: 1 },
  ownerPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  mechanicPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000814', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  infoCard: { backgroundColor: '#fff', padding: SPACING.lg, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  infoRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: FONT_SIZES.sm, color: '#6b7280', fontWeight: '500' },
  routeInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
  routeInfoText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#000814', marginLeft: 4 },
  jobInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 },
  jobInfoText: { fontSize: FONT_SIZES.xs, color: '#6b7280' },
  costText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#1b4332', marginTop: 6 },
  directionsBtn: { marginTop: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
  directionsGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  directionsBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', textAlign: 'center' },
  modalSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: SPACING.lg },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOptionText: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b' },
  modalCancel: { marginTop: SPACING.md, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: RADIUS.md },
  modalCancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#6b7280' },
});