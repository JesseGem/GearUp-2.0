import React, { useEffect, useState } from 'react';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicleService';
import { userService } from '../../services/userService';
import { locationService } from '../../services/locationService';
import { jobService } from '../../services/jobService';

type Location = { latitude: number; longitude: number };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function CustomerSOSScreen({ navigation }: any) {
  const [step, setStep] = useState<'loading' | 'vehicle' | 'map' | 'confirm'>('loading');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void init();
  }, []);

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
    } catch {
      Alert.alert('Error', 'Could not create the emergency job. Please check your connection.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const loadMechanics = async (coords: Location | null) => {
    try {
      const mechanicsData = await userService.getAllMechanics();
      const withLocation = mechanicsData.filter((mechanic: any) => mechanic.latitude && mechanic.longitude);
      const sorted = withLocation
        .map((mechanic: any) => ({
          ...mechanic,
          distance: coords
            ? calculateDistance(coords.latitude, coords.longitude, mechanic.latitude, mechanic.longitude)
            : null,
        }))
        .sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      setMechanics(sorted);
      setSelectedMechanic(sorted[0] ?? null);
    } catch {
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
    if (!selectedVehicle || !selectedMechanic) return;

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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create the emergency job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingIcon}>
          <Ionicons name="warning" size={32} color={COLORS.error} />
        </View>
        <ActivityIndicator size="small" color={COLORS.error} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Finding nearby mechanics...</Text>
      </View>
    );
  }

  if (step === 'vehicle') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header
          title="SOS Emergency"
          subtitle="Which vehicle needs help?"
          onBack={() => navigation.goBack()}
        />
        <ScrollView contentContainerStyle={styles.list}>
          {vehicles.map(vehicle => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleOption}
              activeOpacity={0.85}
              onPress={() => void handlePickVehicle(vehicle)}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car-sport" size={22} color={COLORS.error} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model} ({vehicle.year})</Text>
                <Text style={styles.muted}>{vehicle.licensePlate}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header
          title="Confirm Job"
          subtitle="Review before sending"
          onBack={() => setStep('map')}
        />
        <ScrollView contentContainerStyle={styles.confirmBody}>
          <View style={styles.confirmBadge}>
            <Ionicons name="warning" size={28} color={COLORS.error} />
          </View>
          <Text style={styles.confirmHeadline}>Emergency Assistance</Text>
          <Text style={styles.confirmSub}>This mechanic will be notified immediately</Text>

          <View style={styles.confirmCard}>
            <Text style={styles.mechanicName}>{selectedMechanic?.name}</Text>
            {selectedMechanic?.location ? <Text style={styles.muted}>{selectedMechanic.location}</Text> : null}
            <View style={styles.divider} />
            <Text style={styles.confirmDetail}>
              {selectedVehicle?.make} {selectedVehicle?.model} — {selectedVehicle?.licensePlate}
            </Text>
            <Text style={styles.confirmDetail}>
              {myLocation
                ? `GPS location: ${myLocation.latitude.toFixed(5)}, ${myLocation.longitude.toFixed(5)}`
                : 'Your current GPS location will be shared if available'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => void handleConfirmSOS()}
            disabled={submitting}>
            <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.actionGradient}>
              {submitting ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="warning" size={18} color={COLORS.white} />
                  <Text style={styles.actionText}>Create Emergency Job</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backAction} onPress={() => setStep('map')} disabled={submitting}>
            <Text style={styles.backActionText}>Go Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="SOS Emergency"
        subtitle={mechanics.length > 0 ? `${mechanics.length} mechanic shops found nearby` : 'No mechanics found nearby'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.mapContent}>
        <View style={styles.mapFallback}>
          <Ionicons name="map-outline" size={34} color={COLORS.error} />
          <Text style={styles.fallbackTitle}>Map preview isn't available on web</Text>
          <Text style={styles.fallbackText}>
            {myLocation
              ? `Your location: ${myLocation.latitude.toFixed(5)}, ${myLocation.longitude.toFixed(5)}`
              : 'Your location is unavailable. Select a mechanic from the list below.'}
          </Text>
          <Text style={styles.fallbackText}>The interactive map is available in the iOS and Android apps.</Text>
        </View>

        {mechanics.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={30} color={COLORS.textSecondary} />
            <Text style={styles.fallbackText}>No mechanics with a saved location were found nearby.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Choose a mechanic</Text>
            {mechanics.map(mechanic => {
              const isSelected = selectedMechanic?.id === mechanic.id;
              return (
                <TouchableOpacity
                  key={mechanic.id}
                  style={[styles.mechanicOption, isSelected && styles.mechanicOptionSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMechanic(mechanic)}>
                  <View style={[styles.mechanicAvatar, isSelected && styles.mechanicAvatarSelected]}>
                    <Ionicons name="construct" size={18} color={COLORS.white} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.mechanicName}>{mechanic.name}</Text>
                    {mechanic.location ? <Text style={styles.muted}>{mechanic.location}</Text> : null}
                  </View>
                  {mechanic.distance !== null && (
                    <Text style={styles.distance}>
                      {mechanic.distance < 1
                        ? `${Math.round(mechanic.distance * 1000)}m`
                        : `${mechanic.distance.toFixed(1)}km`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.actionButton, !selectedMechanic && styles.disabledButton]}
              disabled={!selectedMechanic}
              activeOpacity={0.85}
              onPress={() => setStep('confirm')}>
              <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.actionGradient}>
                <Ionicons name="warning" size={18} color={COLORS.white} />
                <Text style={styles.actionText}>Choose This Mechanic</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <LinearGradient colors={[COLORS.error, COLORS.error]} style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={COLORS.white} />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  loadingIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: '600', marginTop: 12 },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.errorTint, marginTop: 2 },
  list: { padding: SPACING.lg },
  vehicleOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, elevation: 2 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  vehicleName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  mapContent: { padding: SPACING.lg, paddingBottom: 32 },
  mapFallback: { minHeight: 190, padding: SPACING.lg, marginBottom: SPACING.lg, backgroundColor: COLORS.errorTint, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center', gap: 10 },
  fallbackTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  fallbackText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.white, padding: SPACING.lg, alignItems: 'center', gap: 8, borderRadius: RADIUS.md },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  mechanicOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  mechanicOptionSelected: { borderColor: COLORS.error, backgroundColor: COLORS.errorTint },
  mechanicAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  mechanicAvatarSelected: { backgroundColor: COLORS.error },
  mechanicName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  distance: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.error },
  actionButton: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.md },
  disabledButton: { opacity: 0.5 },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  actionText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  confirmBody: { flexGrow: 1, padding: SPACING.lg, alignItems: 'stretch' },
  confirmBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.errorTint, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  confirmHeadline: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  confirmSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.xl, textAlign: 'center' },
  confirmCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.background, elevation: 2 },
  divider: { height: 1, backgroundColor: COLORS.background, marginVertical: SPACING.md },
  confirmDetail: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginBottom: 10 },
  backAction: { marginTop: SPACING.md, padding: 14, alignItems: 'center' },
  backActionText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textSecondary },
});
