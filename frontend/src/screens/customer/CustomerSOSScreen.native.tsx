import React, { useEffect, useState, useRef } from 'react';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicleService';
import { userService } from '../../services/userService';
import { locationService } from '../../services/locationService';
import { jobService } from '../../services/jobService';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CustomerSOSScreen({ navigation }: any) {
  const [step, setStep] = useState<'loading' | 'vehicle' | 'map' | 'confirm'>('loading');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    init();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (step !== 'loading') {
      enterAnim.setValue(0);
      Animated.timing(enterAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [step]);

  const init = async () => {
    try {
      const [vehiclesData, coords] = await Promise.all([
        vehicleService.getMyVehicles(),
        locationService.getCurrentLocation(),
      ]);

      if (!vehiclesData || vehiclesData.length === 0) {
        Alert.alert(
          'No Vehicle Found',
          'Please add a vehicle in your Profile before requesting emergency assistance.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setVehicles(vehiclesData);
      setMyLocation(coords);

      if (vehiclesData.length === 1) {
        setSelectedVehicle(vehiclesData[0]);
        await loadMechanics(coords);
        setStep('map');
      } else {
        setStep('vehicle');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not create the emergency job. Please check your connection.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const loadMechanics = async (coords: { latitude: number; longitude: number } | null) => {
    try {
      const mechanicsData = await userService.getAllMechanics();
      const withLocation = mechanicsData.filter((m: any) => m.latitude && m.longitude);
      const withDistance = withLocation.map((m: any) => ({
        ...m,
        distance: coords
          ? calculateDistance(coords.latitude, coords.longitude, m.latitude, m.longitude)
          : null,
      }));
      const sorted = withDistance.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      setMechanics(sorted);
      if (sorted.length > 0) {
        setSelectedMechanic(sorted[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load nearby mechanics.');
    }
  };

  const handlePickVehicle = async (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setStep('loading');
    await loadMechanics(myLocation);
    setStep('map');
  };

  const handleConfirmSOS = async () => {
    setSubmitting(true);
    try {
      await jobService.createJob({
        title: 'SOS Emergency Assistance',
        description: 'Emergency roadside assistance requested via SOS.',
        vehicleId: selectedVehicle.id,
        type: 'GENERAL',
        location: myLocation ? `${myLocation.latitude.toFixed(5)}, ${myLocation.longitude.toFixed(5)}` : undefined,
        latitude: myLocation?.latitude,
        longitude: myLocation?.longitude,
        requestType: 'DIRECT',
        preferredMechanicId: selectedMechanic.id,
      });
      Alert.alert(
        'Help is on the way',
        `${selectedMechanic.name} has been notified of your emergency job.`,
        [{ text: 'OK', onPress: () => navigation.navigate('CustomerTabs', { screen: 'Jobs' }) }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create the emergency job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultRegion = myLocation
    ? { ...myLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 6.6745, longitude: -1.5716, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const fadeStyle = { opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  if (step === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="warning" size={32} color={COLORS.error} />
        </Animated.View>
        <ActivityIndicator size="small" color={COLORS.error} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Finding nearby mechanics...</Text>
      </View>
    );
  }

  if (step === 'vehicle') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>SOS Emergency</Text>
            <Text style={styles.headerSubtitle}>Which vehicle needs help?</Text>
          </View>
        </LinearGradient>
        <Animated.View style={[{ flex: 1 }, fadeStyle]}>
          <ScrollView style={styles.vehicleList} showsVerticalScrollIndicator={false}>
            {vehicles.map(v => (
              <TouchableOpacity
                key={v.id}
                style={styles.vehicleOption}
                activeOpacity={0.85}
                onPress={() => handlePickVehicle(v)}>
                <View style={styles.vehicleIconWrap}>
                  <Ionicons name="car-sport" size={22} color={COLORS.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>{v.make} {v.model} ({v.year})</Text>
                  <Text style={styles.vehiclePlate}>{v.licensePlate}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('map')}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Confirm Job</Text>
            <Text style={styles.headerSubtitle}>Review before sending</Text>
          </View>
        </LinearGradient>

        <Animated.View style={[styles.confirmBody, fadeStyle]}>
          <View style={styles.confirmBadgeWrap}>
            <View style={styles.confirmBadge}>
              <Ionicons name="warning" size={28} color={COLORS.error} />
            </View>
            <Text style={styles.confirmHeadline}>Emergency Assistance</Text>
            <Text style={styles.confirmSub}>This mechanic will be notified immediately</Text>
          </View>

          <View style={styles.confirmCard}>
            <View style={styles.confirmMechanicRow}>
              <View style={styles.confirmAvatar}>
                <Text style={styles.confirmAvatarText}>{selectedMechanic?.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmMechanicName}>{selectedMechanic?.name}</Text>
                {selectedMechanic?.location && (
                  <Text style={styles.confirmMechanicLocation}>{selectedMechanic.location}</Text>
                )}
              </View>
              {selectedMechanic?.distance !== null && (
                <View style={styles.distancePill}>
                  <Text style={styles.distancePillText}>
                    {selectedMechanic.distance < 1
                      ? `${Math.round(selectedMechanic.distance * 1000)}m`
                      : `${selectedMechanic.distance.toFixed(1)}km`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.confirmDivider} />

            <View style={styles.confirmDetailRow}>
              <Ionicons name="car-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.confirmDetailText}>{selectedVehicle?.make} {selectedVehicle?.model} — {selectedVehicle?.licensePlate}</Text>
            </View>
            <View style={styles.confirmDetailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.confirmDetailText}>Your current GPS location will be shared</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sendBtn} onPress={handleConfirmSOS} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.sendGradient}>
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="warning" size={18} color={COLORS.white} />
                  <Text style={styles.sendText}>Create Emergency Job</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('map')} disabled={submitting}>
            <Text style={styles.cancelText}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // step === 'map'
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>SOS Emergency</Text>
          <Text style={styles.headerSubtitle}>
            {mechanics.length > 0 ? `${mechanics.length} mechanic shops found nearby` : 'No mechanics found nearby'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={defaultRegion}>
          {myLocation && (
            <Marker coordinate={myLocation} title="You">
              <View style={styles.myPin}>
                <Ionicons name="person" size={16} color={COLORS.white} />
              </View>
            </Marker>
          )}
          {mechanics.map(m => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.name}
              onPress={() => setSelectedMechanic(m)}>
              <View style={[
                styles.mechanicPin,
                selectedMechanic?.id === m.id && styles.mechanicPinSelected,
              ]}>
                <Ionicons name="construct" size={16} color={COLORS.white} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {mechanics.length === 0 ? (
        <View style={styles.noMechanicsCard}>
          <Ionicons name="alert-circle-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.noMechanicsText}>No mechanics with a saved location were found nearby.</Text>
        </View>
      ) : (
        <Animated.View style={[styles.bottomCard, fadeStyle]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mechanicScroll}>
            {mechanics.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.mechanicChip, selectedMechanic?.id === m.id && styles.mechanicChipActive]}
                activeOpacity={0.85}
                onPress={() => setSelectedMechanic(m)}>
                <Text style={[styles.mechanicChipText, selectedMechanic?.id === m.id && styles.mechanicChipTextActive]}>
                  {m.name}
                </Text>
                {m.distance !== null && (
                  <Text style={[styles.mechanicChipDistance, selectedMechanic?.id === m.id && styles.mechanicChipTextActive]}>
                    {m.distance < 1 ? `${Math.round(m.distance * 1000)}m` : `${m.distance.toFixed(1)}km`}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedMechanic && (
            <View style={styles.selectedInfo}>
              <View style={styles.selectedAvatar}>
                <Text style={styles.selectedAvatarText}>{selectedMechanic.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{selectedMechanic.name}</Text>
                {selectedMechanic.location && <Text style={styles.selectedLocation}>{selectedMechanic.location}</Text>}
              </View>
              {selectedMechanic.distance !== null && (
                <View style={styles.selectedDistancePill}>
                  <Ionicons name="navigate" size={11} color={COLORS.error} />
                  <Text style={styles.selectedDistanceText}>
                    {selectedMechanic.distance < 1
                      ? `${Math.round(selectedMechanic.distance * 1000)}m`
                      : `${selectedMechanic.distance.toFixed(1)}km`}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.requestBtn}
            disabled={!selectedMechanic}
            activeOpacity={0.85}
            onPress={() => setStep('confirm')}>
            <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.requestGradient}>
              <Ionicons name="warning" size={18} color={COLORS.white} />
              <Text style={styles.requestBtnText}>Choose This Mechanic</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: '600', marginTop: 12 },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.errorTint, marginTop: 2 },
  vehicleList: { flex: 1, padding: SPACING.lg },
  vehicleOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vehicleIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  vehiclePlate: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  myPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.info, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white, elevation: 4 },
  mechanicPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white, elevation: 4 },
  mechanicPinSelected: { backgroundColor: COLORS.error, width: 42, height: 42, borderRadius: 21 },
  noMechanicsCard: { backgroundColor: COLORS.white, padding: SPACING.lg, alignItems: 'center', gap: 8 },
  noMechanicsText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  bottomCard: { backgroundColor: COLORS.white, padding: SPACING.lg, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: COLORS.black, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  mechanicScroll: { marginBottom: SPACING.md },
  mechanicChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.white, alignItems: 'center' },
  mechanicChipActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  mechanicChipText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text },
  mechanicChipDistance: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  mechanicChipTextActive: { color: COLORS.white },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  selectedAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  selectedName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  selectedLocation: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  selectedDistancePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.errorTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  selectedDistanceText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  requestBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  requestGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  requestBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  confirmBody: { flex: 1, padding: SPACING.lg },
  confirmBadgeWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  confirmBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmHeadline: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  confirmSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  confirmCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.background, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  confirmMechanicRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  confirmAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  confirmAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  confirmMechanicName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  confirmMechanicLocation: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  distancePill: { backgroundColor: COLORS.errorTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  distancePillText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  confirmDivider: { height: 1, backgroundColor: COLORS.background, marginVertical: SPACING.md },
  confirmDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  confirmDetailText: { fontSize: FONT_SIZES.sm, color: COLORS.text, flex: 1 },
  sendBtn: { marginTop: SPACING.xl, borderRadius: RADIUS.md, overflow: 'hidden' },
  sendGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  sendText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  cancelBtn: { marginTop: SPACING.md, padding: 14, alignItems: 'center' },
  cancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textSecondary },
});
