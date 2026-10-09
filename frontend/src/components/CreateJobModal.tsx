import React, { useState, useEffect } from 'react';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from './PlatformMap';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { jobService } from '../services/jobService';
import { userService } from '../services/userService';
import { locationService } from '../services/locationService';
import { messageService, JobCardMetadata } from '../services/messageService';
import { AppAlertCard } from './AppAlert';

const JOB_TYPES = ['TOWING', 'BATTERY', 'TIRE_CHANGE', 'FUEL', 'ENGINE', 'GENERAL'];
const JOB_TYPE_ICONS: Record<string, any> = {
  TOWING: 'car-outline',
  BATTERY: 'battery-charging-outline',
  TIRE_CHANGE: 'disc-outline',
  FUEL: 'flame-outline',
  ENGINE: 'construct-outline',
  GENERAL: 'apps-outline',
};
const VEHICLE_ICONS: Record<string, any> = {
  CAR: 'car-sport',
  TRUCK: 'bus',
  SUV: 'car-sport',
  MOTORCYCLE: 'bicycle',
  VAN: 'bus',
};

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
const formatTimeShort = (time: string | null | undefined) => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m}${suffix}`;
};
const isWithinAvailability = (date: Date, start: string, end: string): boolean => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutesOfDay = date.getHours() * 60 + date.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return minutesOfDay >= startMinutes && minutesOfDay <= endMinutes;
};
const formatScheduled = (date: Date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

interface LockedMechanic {
  id: number;
  name: string;
  location?: string;
  acceptingBookings?: boolean;
  availabilityStart?: string | null;
  availabilityEnd?: string | null;
}

interface CreateJobModalProps {
  visible: boolean;
  onClose: () => void;
  vehicles: any[];
  userId: number;
  lockedMechanic?: LockedMechanic | null;
  onCreated: (createdJob: any) => void;
}

const emptyForm = {
  title: '', description: '', vehicleId: '', type: 'GENERAL', location: '',
  latitude: null as number | null,
  longitude: null as number | null,
  scheduledDate: null as Date | null,
};

export default function CreateJobModal({ visible, onClose, vehicles, userId, lockedMechanic, onCreated }: CreateJobModalProps) {
  const [requestType, setRequestType] = useState<'GENERAL' | 'DIRECT'>(lockedMechanic ? 'DIRECT' : 'GENERAL');
  const [showMechanicPickerView, setShowMechanicPickerView] = useState(false);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [mechanicSearch, setMechanicSearch] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState<any>(lockedMechanic || null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [showMapPickerView, setShowMapPickerView] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [loadingMapLocation, setLoadingMapLocation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'warning' | 'success' | 'info'; title: string; message: string } | null>(null);
  const [jobCreatedSuccess, setJobCreatedSuccess] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Fresh state every time the modal opens
  useEffect(() => {
    if (visible) {
      setForm(emptyForm);
      setRequestType(lockedMechanic ? 'DIRECT' : 'GENERAL');
      setSelectedMechanic(lockedMechanic || null);
      setShowMechanicPickerView(false);
      setShowMapPickerView(false);
      setJobCreatedSuccess(false);
      setFormAlert(null);
    }
  }, [visible, lockedMechanic]);

  const showFormAlert = (type: 'error' | 'warning' | 'success' | 'info', title: string, message: string) => {
    setFormAlert({ type, title, message });
  };

  const loadMechanics = async () => {
    setLoadingMechanics(true);
    try {
      const [mechanicsData, coords, favIds] = await Promise.all([
        userService.getAllMechanics(),
        locationService.getCurrentLocation(),
        userService.getFavoriteIds().catch(() => []),
      ]);
      setFavoriteIds(favIds || []);
      const withDistance = mechanicsData.map((m: any) => ({
        ...m,
        distance: coords && m.latitude && m.longitude
          ? calculateDistance(coords.latitude, coords.longitude, m.latitude, m.longitude)
          : null,
      }));
      const sorted = withDistance.sort((a: any, b: any) => {
        const aFav = (favIds || []).includes(a.id);
        const bFav = (favIds || []).includes(b.id);
        if (aFav !== bFav) return aFav ? -1 : 1;
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return a.name.localeCompare(b.name);
      });
      setMechanics(sorted);
    } catch (e: any) {
      showFormAlert('error', 'Error', 'Could not load mechanics list');
    } finally {
      setLoadingMechanics(false);
    }
  };

  const toggleFavorite = async (mechanicId: number) => {
    const isFav = favoriteIds.includes(mechanicId);
    setFavoriteIds(prev => isFav ? prev.filter(id => id !== mechanicId) : [...prev, mechanicId]);
    try {
      if (isFav) await userService.removeFavorite(mechanicId);
      else await userService.addFavorite(mechanicId);
    } catch (e: any) {
      setFavoriteIds(prev => isFav ? [...prev, mechanicId] : prev.filter(id => id !== mechanicId));
      showFormAlert('error', 'Error', 'Could not update favorite. Please try again.');
    }
  };

  const openMechanicPicker = () => {
    setShowMechanicPickerView(true);
    if (mechanics.length === 0) loadMechanics();
  };

  const openMapPicker = async () => {
    setShowMapPickerView(true);
    setLoadingMapLocation(true);
    try {
      const startCoords = form.latitude && form.longitude
        ? { latitude: form.latitude, longitude: form.longitude }
        : await locationService.getCurrentLocation();
      setPinCoords(startCoords || { latitude: 6.6745, longitude: -1.5716 });
    } catch (e) {
      setPinCoords({ latitude: 6.6745, longitude: -1.5716 });
    } finally {
      setLoadingMapLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`,
        { headers: { 'User-Agent': 'GearUpApp/1.0' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        return parts.slice(0, 3).join(', ');
      }
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (e) {
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  };

  const confirmMapPin = async () => {
    if (!pinCoords) return;
    setGeocoding(true);
    try {
      const address = await reverseGeocode(pinCoords.latitude, pinCoords.longitude);
      setForm(prev => ({ ...prev, latitude: pinCoords.latitude, longitude: pinCoords.longitude, location: address }));
      setShowMapPickerView(false);
    } catch (e) {
      setForm(prev => ({ ...prev, latitude: pinCoords.latitude, longitude: pinCoords.longitude }));
      setShowMapPickerView(false);
      showFormAlert('warning', 'Address Lookup Failed', 'Could not determine the address for this location, but the pin was still saved.');
    } finally {
      setGeocoding(false);
    }
  };

  const filteredMechanics = mechanics.filter(m =>
    !mechanicSearch.trim() ||
    m.name?.toLowerCase().includes(mechanicSearch.toLowerCase()) ||
    m.location?.toLowerCase().includes(mechanicSearch.toLowerCase())
  );

  const mechanicHasAvailability = requestType === 'DIRECT'
    && selectedMechanic?.acceptingBookings
    && selectedMechanic?.availabilityStart
    && selectedMechanic?.availabilityEnd;

  const validateAndSetSchedule = (candidate: Date): boolean => {
    if (mechanicHasAvailability) {
      if (!isWithinAvailability(candidate, selectedMechanic.availabilityStart, selectedMechanic.availabilityEnd)) {
        showFormAlert(
          'warning', 'Outside Available Hours',
          `${selectedMechanic.name} is only available from ${formatTimeShort(selectedMechanic.availabilityStart)} to ${formatTimeShort(selectedMechanic.availabilityEnd)}. Please pick a time in that range.`
        );
        return false;
      }
    }
    return true;
  };

  const onDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed' || !selected) return;
      const merged = new Date(selected);
      if (form.scheduledDate) merged.setHours(form.scheduledDate.getHours(), form.scheduledDate.getMinutes());
      setForm(prev => ({ ...prev, scheduledDate: merged }));
      setShowTimePicker(true);
    } else if (selected) {
      setForm(prev => ({ ...prev, scheduledDate: selected }));
    }
  };

  const onTimeChange = (event: any, selected?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    const base = form.scheduledDate ? new Date(form.scheduledDate) : new Date();
    base.setHours(selected.getHours(), selected.getMinutes());
    if (!validateAndSetSchedule(base)) return;
    setForm(prev => ({ ...prev, scheduledDate: base }));
  };

  const handleCreateJob = async () => {
    if (!form.title || !form.description || !form.vehicleId) {
      showFormAlert('error', 'Missing Information', 'Please fill in all required fields');
      return;
    }
    if (requestType === 'DIRECT' && !selectedMechanic) {
      showFormAlert('error', 'No Mechanic Selected', 'Please choose a mechanic, or switch to "Any Mechanic"');
      return;
    }
    if (form.scheduledDate && mechanicHasAvailability && !isWithinAvailability(form.scheduledDate, selectedMechanic.availabilityStart, selectedMechanic.availabilityEnd)) {
      showFormAlert(
        'warning', 'Outside Available Hours',
        `${selectedMechanic.name} is only available from ${formatTimeShort(selectedMechanic.availabilityStart)} to ${formatTimeShort(selectedMechanic.availabilityEnd)}. Please pick a different time.`
      );
      return;
    }
    try {
      const createdJob = await jobService.createJob({
        title: form.title,
        description: form.description,
        vehicleId: parseInt(form.vehicleId),
        type: form.type,
        location: form.location,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        scheduledDate: form.scheduledDate ? form.scheduledDate.toISOString() : undefined,
        requestType,
        preferredMechanicId: requestType === 'DIRECT' ? selectedMechanic.id : undefined,
      });
      if (requestType === 'DIRECT' && selectedMechanic) {
        try {
          const existing = await messageService.getConversationWithUser(userId, selectedMechanic.id).catch(() => null);
          const chatJobId = existing ? existing.job_id : createdJob.id;
          const meta: JobCardMetadata = {
            jobId: createdJob.id,
            title: createdJob.title,
            description: createdJob.description,
            jobType: createdJob.type,
            location: createdJob.location,
            scheduledDate: createdJob.scheduledDate,
            estimatedCost: createdJob.estimatedCost,
            finalCost: null,
            status: createdJob.status,
          };
          await messageService.sendJobCard(chatJobId, userId, selectedMechanic.id, meta);
        } catch (cardError) {
          // Job was created successfully even if the chat card failed to send
        }
      }
      setJobCreatedSuccess(true);
      setTimeout(() => {
        onClose();
        onCreated(createdJob);
      }, 1500);
    } catch (error: any) {
      showFormAlert('error', 'Could Not Create Job', error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modal}>
        {showMapPickerView ? (
          <>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMapPickerView(false)} style={styles.backRow}>
                <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                <Text style={styles.modalTitle}>Drop a Pin</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {loadingMapLocation || !pinCoords ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <>
                <View style={styles.mapPickerContainer}>
                  <MapView
                    style={styles.mapPicker}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{ latitude: pinCoords.latitude, longitude: pinCoords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
                    <Marker coordinate={pinCoords} draggable onDragEnd={(e) => setPinCoords(e.nativeEvent.coordinate)}>
                      <View style={styles.dropPinCircle}>
                        <Ionicons name="location" size={18} color={COLORS.white} />
                      </View>
                    </Marker>
                  </MapView>
                  <View style={styles.mapPickerHint}>
                    <Ionicons name="hand-left-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.mapPickerHintText}>Drag the pin to your exact location</Text>
                  </View>
                </View>
                <View style={styles.mapPickerFooter}>
                  <TouchableOpacity style={styles.confirmPinBtn} onPress={confirmMapPin} disabled={geocoding} activeOpacity={0.85}>
                    <LinearGradient colors={[COLORS.accent, COLORS.accent]} style={styles.confirmPinGradient}>
                      {geocoding ? <ActivityIndicator color={COLORS.accentInk} /> : (
                        <>
                          <Ionicons name="checkmark" size={18} color={COLORS.accentInk} />
                          <Text style={styles.confirmPinText}>Confirm This Location</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        ) : showMechanicPickerView ? (
          <>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMechanicPickerView(false)} style={styles.backRow}>
                <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                <Text style={styles.modalTitle}>Choose a Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.mechanicSearchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.mechanicSearchInput}
                placeholder="Search by name or location..."
                value={mechanicSearch}
                onChangeText={setMechanicSearch}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            {loadingMechanics ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <ScrollView style={styles.modalBody}>
                {filteredMechanics.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="construct-outline" size={48} color={COLORS.border} />
                    <Text style={styles.emptyText}>No mechanics found</Text>
                  </View>
                ) : (
                  filteredMechanics.map(m => (
                    <View key={m.id} style={styles.mechanicPickCard}>
                      <TouchableOpacity
                        style={styles.mechanicPickTouchable}
                        onPress={() => { setSelectedMechanic(m); setForm(prev => ({ ...prev, scheduledDate: null })); setShowMechanicPickerView(false); }}>
                        <View style={styles.cardAvatar}>
                          <Text style={styles.cardAvatarText}>{m.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName}>{m.name}</Text>
                          {m.location && (
                            <View style={styles.cardLocationRow}>
                              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                              <Text style={styles.cardLocation}>{m.location}</Text>
                            </View>
                          )}
                          {m.distance !== null && (
                            <Text style={styles.cardDistance}>
                              {m.distance < 1 ? `${Math.round(m.distance * 1000)}m away` : `${m.distance.toFixed(1)}km away`}
                            </Text>
                          )}
                          {m.acceptingBookings && m.availabilityStart && m.availabilityEnd && (
                            <View style={styles.availabilityBadge}>
                              <Ionicons name="time-outline" size={10} color={COLORS.info} />
                              <Text style={styles.availabilityBadgeText}>
                                {formatTimeShort(m.availabilityStart)}–{formatTimeShort(m.availabilityEnd)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleFavorite(m.id)} style={styles.starBtn}>
                        <Ionicons name={favoriteIds.includes(m.id) ? 'star' : 'star-outline'} size={20} color={favoriteIds.includes(m.id) ? COLORS.warning : COLORS.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setSelectedMechanic(m); setForm(prev => ({ ...prev, scheduledDate: null })); setShowMechanicPickerView(false); }}>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </>
        ) : (
          <>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{lockedMechanic ? `New Job for ${lockedMechanic.name}` : 'New Job'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              contentContainerStyle={{ paddingBottom: 300 }}>
              {lockedMechanic ? (
                <View style={styles.lockedMechanicRow}>
                  <View style={styles.selectedMechanicAvatar}>
                    <Text style={styles.selectedMechanicAvatarText}>{lockedMechanic.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedMechanicLabel}>Sending directly to</Text>
                    <Text style={styles.selectedMechanicName}>{lockedMechanic.name}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Who should get this job? *</Text>
                  <View style={styles.requestTypeRow}>
                    <TouchableOpacity
                      style={[styles.requestTypeOption, requestType === 'GENERAL' && styles.requestTypeOptionActive]}
                      onPress={() => { setRequestType('GENERAL'); setSelectedMechanic(null); }}>
                      <Ionicons name="people-outline" size={18} color={requestType === 'GENERAL' ? COLORS.white : COLORS.primary} />
                      <Text style={[styles.requestTypeText, requestType === 'GENERAL' && styles.requestTypeTextActive]}>Any Mechanic</Text>
                      <Text style={[styles.requestTypeSubtext, requestType === 'GENERAL' && styles.requestTypeTextActive]}>Sent to all nearby mechanics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestTypeOption, requestType === 'DIRECT' && styles.requestTypeOptionActive]}
                      onPress={() => { setRequestType('DIRECT'); openMechanicPicker(); }}>
                      <Ionicons name="person-outline" size={18} color={requestType === 'DIRECT' ? COLORS.white : COLORS.primary} />
                      <Text style={[styles.requestTypeText, requestType === 'DIRECT' && styles.requestTypeTextActive]}>Choose a Mechanic</Text>
                      <Text style={[styles.requestTypeSubtext, requestType === 'DIRECT' && styles.requestTypeTextActive]}>Choose the mechanic for this job</Text>
                    </TouchableOpacity>
                  </View>
                  {requestType === 'DIRECT' && (
                    <TouchableOpacity style={styles.selectedMechanicRow} onPress={openMechanicPicker}>
                      {selectedMechanic ? (
                        <>
                          <View style={styles.selectedMechanicAvatar}>
                            <Text style={styles.selectedMechanicAvatarText}>{selectedMechanic.name?.[0]?.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.selectedMechanicName}>{selectedMechanic.name}</Text>
                            {selectedMechanic.location && <Text style={styles.selectedMechanicLocation}>{selectedMechanic.location}</Text>}
                          </View>
                          <Text style={styles.changeMechanicText}>Change</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="search-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.selectedMechanicPlaceholder}>Tap to choose a mechanic</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Car won't start" value={form.title} onChangeText={t => setForm({ ...form, title: t })} />
              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the problem..." value={form.description} onChangeText={t => setForm({ ...form, description: t })} multiline numberOfLines={3} />
              <Text style={styles.label}>Vehicle *</Text>
              {vehicles.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md, paddingVertical: 4 }}>
                  {vehicles.map(v => {
                    const selected = form.vehicleId === String(v.id);
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
                        activeOpacity={0.85}
                        onPress={() => setForm({ ...form, vehicleId: String(v.id) })}>
                        <LinearGradient colors={[COLORS.successTint, COLORS.successTint]} style={styles.vehicleCardImage}>
                          <Ionicons name={VEHICLE_ICONS[v.type] || 'car-sport'} size={32} color={COLORS.primary} />
                        </LinearGradient>
                        {selected && (
                          <View style={styles.vehicleCardCheck}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          </View>
                        )}
                        <Text style={styles.vehicleCardName} numberOfLines={1}>{v.make} {v.model}</Text>
                        <Text style={styles.vehicleCardSub}>{v.year} · {v.licensePlate}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.noVehicle}>No vehicles added yet. Add a vehicle in Profile first.</Text>
              )}
              <Text style={styles.label}>Job Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {JOB_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, form.type === type && styles.typeOptionActive]}
                    onPress={() => setForm({ ...form, type })}>
                    <Ionicons name={JOB_TYPE_ICONS[type]} size={15} color={form.type === type ? COLORS.white : COLORS.primary} />
                    <Text style={[styles.typeText, form.type === type && styles.typeTextActive]}>{type.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} placeholder="e.g. KNUST Campus" value={form.location} onChangeText={t => setForm({ ...form, location: t })} />
              <View style={styles.locationBtnRow}>
                <TouchableOpacity
                  style={[styles.locationBtn, { flex: 1 }]}
                  onPress={async () => {
                    const coords = await locationService.getCurrentLocation();
                    if (coords) {
                      setForm({ ...form, latitude: coords.latitude, longitude: coords.longitude });
                      showFormAlert('success', 'Location Attached', 'Your GPS location has been added to this job.');
                    }
                  }}>
                  <Ionicons name={form.latitude ? 'navigate' : 'navigate-outline'} size={16} color={form.latitude ? COLORS.success : COLORS.primary} />
                  <Text style={[styles.locationBtnText, form.latitude ? { color: COLORS.success } : {}]}>
                    {form.latitude ? '✓ GPS attached' : 'Use my GPS'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapPickBtn, { flex: 1 }]} onPress={openMapPicker}>
                  <Ionicons name="map-outline" size={16} color={COLORS.info} />
                  <Text style={styles.mapPickBtnText}>Pick on map</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Schedule (optional)</Text>
              {mechanicHasAvailability && (
                <View style={styles.availabilityHint}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.info} />
                  <Text style={styles.availabilityHintText}>
                    {selectedMechanic.name} is available {formatTimeShort(selectedMechanic.availabilityStart)}–{formatTimeShort(selectedMechanic.availabilityEnd)}, every day
                  </Text>
                </View>
              )}
              {requestType === 'DIRECT' && selectedMechanic && !selectedMechanic.acceptingBookings && (
                <View style={styles.availabilityHintWarn}>
                  <Ionicons name="alert-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.availabilityHintWarnText}>
                    {selectedMechanic.name} hasn't set up job scheduling — this job will be handled as soon as possible.
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name={form.scheduledDate ? 'calendar' : 'calendar-outline'} size={16} color={form.scheduledDate ? COLORS.info : COLORS.primary} />
                <Text style={[styles.scheduleBtnText, form.scheduledDate ? { color: COLORS.info } : {}]}>
                  {form.scheduledDate ? formatScheduled(form.scheduledDate) : 'Pick a date & time (or leave for ASAP)'}
                </Text>
                {form.scheduledDate && (
                  <TouchableOpacity onPress={() => setForm({ ...form, scheduledDate: null })}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={form.scheduledDate || new Date()}
                    mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                    minimumDate={new Date()}
                    onChange={onDateChange}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant="light"
                    textColor={COLORS.text}
                    style={styles.picker}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.pickerDoneBtn}
                      onPress={() => {
                        const candidate = form.scheduledDate || new Date();
                        if (!validateAndSetSchedule(candidate)) return;
                        setForm(prev => ({ ...prev, scheduledDate: candidate }));
                        setShowDatePicker(false);
                      }}>
                      <Text style={styles.pickerDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker value={form.scheduledDate || new Date()} mode="time" onChange={onTimeChange} display="default" themeVariant="light" />
              )}
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateJob} activeOpacity={0.85}>
                <LinearGradient colors={[COLORS.accent, COLORS.accent]} style={styles.submitGradient}>
                  <Text style={styles.submitText}>Create Job</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </>
        )}
        {formAlert && (
          <View style={styles.inModalOverlay}>
            <AppAlertCard type={formAlert.type} title={formAlert.title} message={formAlert.message} onClose={() => setFormAlert(null)} />
          </View>
        )}
        {jobCreatedSuccess && (
          <View style={styles.inModalOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.successTitle}>Job Created!</Text>
              <Text style={styles.successSubtitle}>Your job has been created successfully.</Text>
            </View>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 60, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, fontSize: FONT_SIZES.md, color: COLORS.text },
  textArea: { height: 80, textAlignVertical: 'top' },
  vehicleCard: { width: 150, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.successTint },
  vehicleCardImage: { width: '100%', height: 64, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  vehicleCardCheck: { position: 'absolute', top: 6, right: 6, backgroundColor: COLORS.white, borderRadius: 10 },
  vehicleCardName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  vehicleCardSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  noVehicle: { fontSize: FONT_SIZES.sm, color: COLORS.error, fontStyle: 'italic' },
  typeScroll: { marginBottom: 4 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.white },
  typeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
  typeTextActive: { color: COLORS.white },
  locationBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: COLORS.successTint, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent },
  locationBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary },
  mapPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: COLORS.infoTint, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.infoTint },
  mapPickBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.info },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: COLORS.infoTint, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  scheduleBtnText: { flex: 1, fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary },
  availabilityHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  availabilityHintText: { fontSize: FONT_SIZES.xs, color: COLORS.info, flex: 1 },
  availabilityHintWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  availabilityHintWarnText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, flex: 1 },
  pickerContainer: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginTop: 8, overflow: 'hidden' },
  picker: { height: 200, backgroundColor: COLORS.white },
  pickerDoneBtn: { padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.background },
  pickerDoneBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  submitBtn: { marginTop: 24, borderRadius: RADIUS.md, overflow: 'hidden' },
  submitGradient: { padding: 16, alignItems: 'center' },
  submitText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.accentInk },
  requestTypeRow: { flexDirection: 'row', gap: 10 },
  requestTypeOption: { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, gap: 4 },
  requestTypeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  requestTypeText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  requestTypeSubtext: { fontSize: 11, color: COLORS.textSecondary },
  requestTypeTextActive: { color: COLORS.white },
  selectedMechanicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 10, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  lockedMechanicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, padding: 12, backgroundColor: COLORS.successTint, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent },
  lockedMechanicLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  selectedMechanicAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  selectedMechanicAvatarText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  selectedMechanicName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  selectedMechanicLocation: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  selectedMechanicPlaceholder: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  changeMechanicText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.info },
  mechanicSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 44, gap: 8, margin: SPACING.lg, marginBottom: 0, borderWidth: 1, borderColor: COLORS.border },
  mechanicSearchInput: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text },
  mechanicPickCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.background },
  mechanicPickTouchable: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  cardAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  cardName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardLocation: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  cardDistance: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  availabilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.infoTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginTop: 3 },
  availabilityBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.info },
  starBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.white, borderRadius: RADIUS.md },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  mapPickerContainer: { flex: 1 },
  mapPicker: { flex: 1 },
  mapPickerHint: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, alignSelf: 'center', shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapPickerHintText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  dropPinCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white, elevation: 4 },
  mapPickerFooter: { padding: SPACING.lg, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.background },
  confirmPinBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmPinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  confirmPinText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.accentInk },
  inModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, zIndex: 20 },
  successCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', alignItems: 'center' },
  successIconWrap: { marginBottom: SPACING.md },
  successTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  successSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
