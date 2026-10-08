import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Modal, Switch, Platform, Animated, Image
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { reviewService } from '../../services/reviewService';
import { authService } from '../../services/authService';
import { partsService } from '../../services/partsService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AppAlertCard } from '../../components/AppAlert';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { locationService } from '../../services/locationService';
import { useFocusEffect } from '@react-navigation/native';

const ACCENT = '#000814';
const ACCENT_DEEP = '#001D3D';

const formatTime = (time: string | null) => {
  if (!time) return '--:--';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${suffix}`;
};
const timeStringToDate = (time: string | null): Date => {
  const d = new Date();
  if (time) {
    const [h, m] = time.split(':');
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
};
const dateToTimeString = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}:00`;
};

// ─── ReviewCard: its own component so entrance-animation hooks are safe/stable ───
function ReviewCard({ review, index }: { review: any; index: number }) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 60, 300),
      useNativeDriver: true,
    }).start();
  }, []);
  const animatedStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= review.rating ? 'star' : 'star-outline'}
                size={13}
                color="#f59e0b"
              />
            ))}
          </View>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </Text>
        </View>
        {review.comment ? (
          <Text style={styles.reviewComment} numberOfLines={4}>{review.comment}</Text>
        ) : (
          <Text style={styles.reviewNoComment}>No comment left</Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function MechanicProfileScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<any>(null);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', location: '', latitude: null as number | null, longitude: null as number | null, profileImage: null as string | null });
  const [showMapPickerView, setShowMapPickerView] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [loadingMapLocation, setLoadingMapLocation] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const pendingAvatarActionRef = useRef<(() => void) | null>(null);
  const [acceptingBookings, setAcceptingBookings] = useState(false);
  const [availabilityStart, setAvailabilityStart] = useState<string | null>(null);
  const [availabilityEnd, setAvailabilityEnd] = useState<string | null>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [cancelDeletionConfirm, setCancelDeletionConfirm] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);
  const [sendingDeletionCode, setSendingDeletionCode] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const [profileData, ratingData, reviewsData] = await Promise.all([
        userService.getMyProfile(),
        reviewService.getAverageRating(user?.userId),
        reviewService.getReviewsForUser(user?.userId),
      ]);
      setProfile(profileData);
      setAvgRating(ratingData?.averageRating || 0);
      setReviews(reviewsData);
      setEditForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        latitude: profileData.latitude || null,
        longitude: profileData.longitude || null,
        profileImage: profileData.profileImage || null,
      });
      setAcceptingBookings(!!profileData.acceptingBookings);
      setAvailabilityStart(profileData.availabilityStart || null);
      setAvailabilityEnd(profileData.availabilityEnd || null);
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      authService.getDeletionRequestStatus()
        .then(r => setPendingDeletion(!!r))
        .catch(() => setPendingDeletion(false));
    }, [])
  );
  const handleUpdateProfile = async () => {
    try {
      await userService.updateProfile({
        name: editForm.name,
        phone: editForm.phone,
        bio: editForm.bio,
        location: editForm.location,
        latitude: editForm.latitude ?? undefined,
        longitude: editForm.longitude ?? undefined,
        profileImage: editForm.profileImage ?? undefined,
      } as any);
      setEditModal(false);
      fetchData();
      setAlert({ type: 'success', title: 'Success', message: 'Profile updated!' });
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const uploadAvatarUri = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      // Reuses parts-service's generic image-upload endpoint — a deliberate pragmatic
      // choice rather than building a dedicated user-service upload endpoint, since
      // it's already proven working and just returns a plain, content-agnostic URL.
      const imageUrl = await partsService.uploadImage(uri);
      setEditForm(prev => ({ ...prev, profileImage: imageUrl }));
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Upload Failed', message: e.message || 'Could not upload image. Please try again.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickAvatarFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAlert({ type: 'warning', title: 'Permission needed', message: 'Please allow photo access to set a profile picture.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    uploadAvatarUri(result.assets[0].uri);
  };

  const takeAvatarPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setAlert({ type: 'warning', title: 'Permission needed', message: 'Please allow camera access to take a photo.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    uploadAvatarUri(result.assets[0].uri);
  };

  // Same iOS-modal-dismiss-then-launch-picker pattern used for chat attachments —
  // launching a native picker directly from inside a Modal can silently fail on
  // iOS/Expo Go otherwise.
  const triggerAvatarAction = (action: () => void) => {
    pendingAvatarActionRef.current = action;
    setAvatarMenuVisible(false);
    if (Platform.OS === 'android') {
      setTimeout(() => {
        const pending = pendingAvatarActionRef.current;
        pendingAvatarActionRef.current = null;
        if (pending) pending();
      }, 300);
    }
  };

  const openMapPicker = async () => {
    setShowMapPickerView(true);
    setLoadingMapLocation(true);
    try {
      const startCoords = editForm.latitude && editForm.longitude
        ? { latitude: editForm.latitude, longitude: editForm.longitude }
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
      setEditForm(prev => ({ ...prev, latitude: pinCoords.latitude, longitude: pinCoords.longitude, location: address }));
      setShowMapPickerView(false);
    } catch (e) {
      setEditForm(prev => ({ ...prev, latitude: pinCoords.latitude, longitude: pinCoords.longitude }));
      setShowMapPickerView(false);
      setAlert({ type: 'warning', title: 'Address Lookup Failed', message: 'Could not determine the address for this location, but the pin was still saved.' });
    } finally {
      setGeocoding(false);
    }
  };
  const saveAvailability = async (updates: { acceptingBookings?: boolean; availabilityStart?: string | null; availabilityEnd?: string | null }) => {
    setSavingAvailability(true);
    try {
      await userService.updateProfile({
        acceptingBookings: updates.acceptingBookings !== undefined ? updates.acceptingBookings : acceptingBookings,
        availabilityStart: updates.availabilityStart !== undefined ? (updates.availabilityStart ?? undefined) : (availabilityStart ?? undefined),
        availabilityEnd: updates.availabilityEnd !== undefined ? (updates.availabilityEnd ?? undefined) : (availabilityEnd ?? undefined),
      } as any);
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: 'Could not update availability. Please try again.' });
    } finally {
      setSavingAvailability(false);
    }
  };
  const handleToggleBookings = async (value: boolean) => {
    setAcceptingBookings(value);
    if (value && (!availabilityStart || !availabilityEnd)) {
      const start = availabilityStart || '08:00:00';
      const end = availabilityEnd || '17:00:00';
      setAvailabilityStart(start);
      setAvailabilityEnd(end);
      await saveAvailability({ acceptingBookings: value, availabilityStart: start, availabilityEnd: end });
    } else {
      await saveAvailability({ acceptingBookings: value });
    }
  };
  const handleStartTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    const timeStr = dateToTimeString(selected);
    setAvailabilityStart(timeStr);
    if (Platform.OS === 'android') saveAvailability({ availabilityStart: timeStr });
  };
  const handleEndTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    const timeStr = dateToTimeString(selected);
    setAvailabilityEnd(timeStr);
    if (Platform.OS === 'android') saveAvailability({ availabilityEnd: timeStr });
  };
  const handleLogout = () => {
    setLogoutConfirm(false);
    dispatch(logout());
  };
  const handleDeleteAccountRequest = async () => {
    setDeleteAccountConfirm(false);
    setSendingDeletionCode(true);
    try {
      await authService.sendAccountDeletionCode();
      navigation.navigate('Otp', { mode: 'delete', email: profile?.email });
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message || 'Could not send verification code.' });
    } finally {
      setSendingDeletionCode(false);
    }
  };
  const handleCancelDeletionRequest = async () => {
    setCancelDeletionConfirm(false);
    try {
      await authService.cancelAccountDeletion();
      setPendingDeletion(false);
      setAlert({ type: 'success', title: 'Cancelled', message: 'Your deletion request has been cancelled.' });
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message || 'Could not cancel the request.' });
    }
  };
  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={ACCENT} />;
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.header}>
          {profile?.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {profile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#fde68a" />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={ACCENT} />
            <Text style={styles.verifiedText}>Verified Mechanic</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="pencil-outline" size={16} color={ACCENT} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{reviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.phone}</Text>
              <Text style={styles.statLabel}>Phone</Text>
            </View>
          </View>

          {/* Booking Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Availability</Text>
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availabilityLabel}>Available for bookings</Text>
                  <Text style={styles.availabilitySubtext}>
                    {acceptingBookings ? "Owners can book you within your hours" : "You won't appear as bookable"}
                  </Text>
                </View>
                <Switch
                  value={acceptingBookings}
                  onValueChange={handleToggleBookings}
                  trackColor={{ false: '#e5e7eb', true: '#fbbf24' }}
                  thumbColor={acceptingBookings ? ACCENT : '#f4f3f4'}
                  disabled={savingAvailability}
                />
              </View>
              {acceptingBookings && (
                <View style={styles.hoursRow}>
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                    <Ionicons name="time-outline" size={16} color={ACCENT} />
                    <View>
                      <Text style={styles.timeBtnLabel}>From</Text>
                      <Text style={styles.timeBtnValue}>{formatTime(availabilityStart)}</Text>
                    </View>
                  </TouchableOpacity>
                  <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                    <Ionicons name="time-outline" size={16} color={ACCENT} />
                    <View>
                      <Text style={styles.timeBtnLabel}>To</Text>
                      <Text style={styles.timeBtnValue}>{formatTime(availabilityEnd)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              {showStartPicker && (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={timeStringToDate(availabilityStart)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleStartTimeChange}
                    themeVariant="light"
                    textColor="#1b1b1b"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.pickerDoneBtn}
                      onPress={() => {
                        setShowStartPicker(false);
                        saveAvailability({ availabilityStart });
                      }}>
                      <Text style={styles.pickerDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {showEndPicker && (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={timeStringToDate(availabilityEnd)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEndTimeChange}
                    themeVariant="light"
                    textColor="#1b1b1b"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.pickerDoneBtn}
                      onPress={() => {
                        setShowEndPicker(false);
                        saveAvailability({ availabilityEnd });
                      }}>
                      <Text style={styles.pickerDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {reviews.length > 0 && <Text style={styles.reviewCountText}>{reviews.length} total</Text>}
            </View>
            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="star-outline" size={32} color="#9ca3af" />
                </View>
                <Text style={styles.emptyText}>No reviews yet</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: SPACING.md, paddingRight: SPACING.lg }}>
                {reviews.slice(0, 8).map((review, index) => (
                  <ReviewCard key={review.id} review={review} index={index} />
                ))}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate('Wallet')}>
          <View style={styles.walletBtnLeft}>
            <Ionicons name="wallet-outline" size={20} color={ACCENT} />
            <Text style={styles.walletBtnText}>Wallet</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutConfirm(true)}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        {pendingDeletion ? (
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setCancelDeletionConfirm(true)}>
            <Ionicons name="time-outline" size={18} color={ACCENT} />
            <Text style={styles.deleteAccountPendingText}>Deletion Request Pending — Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={() => setDeleteAccountConfirm(true)}
            disabled={sendingDeletionCode}>
            {sendingDeletionCode ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.devBtn}
          onPress={() => navigation.navigate('DevSettings')}>
          <Text style={styles.devBtnText}>⚙️ Dev Settings</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      <ConfirmDialog
        visible={logoutConfirm}
        icon="log-out-outline"
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        destructive
        accentColor={ACCENT}
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirm(false)}
      />
      <ConfirmDialog
        visible={deleteAccountConfirm}
        icon="warning-outline"
        title="Delete Account"
        message="We'll send a verification code to your email to confirm this request. Your account stays fully active until the request is reviewed and approved."
        confirmText="Send Code"
        destructive
        accentColor={ACCENT}
        onConfirm={handleDeleteAccountRequest}
        onCancel={() => setDeleteAccountConfirm(false)}
      />
      <ConfirmDialog
        visible={cancelDeletionConfirm}
        icon="close-circle-outline"
        title="Cancel Deletion Request"
        message="Are you sure you want to cancel your pending account deletion request?"
        confirmText="Yes, Cancel It"
        accentColor={ACCENT}
        onConfirm={handleCancelDeletionRequest}
        onCancel={() => setCancelDeletionConfirm(false)}
      />
      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={() => setAlert(null)}>
        <View style={styles.alertOverlay}>
          {alert && (
            <AppAlertCard
              type={alert.type}
              title={alert.title}
              message={alert.message}
              accentColor={ACCENT}
              onClose={() => setAlert(null)}
            />
          )}
        </View>
      </Modal>
      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          {showMapPickerView ? (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowMapPickerView(false)} style={styles.backRow}>
                  <Ionicons name="arrow-back" size={22} color="#1b1b1b" />
                  <Text style={styles.modalTitle}>Drop a Pin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditModal(false)}>
                  <Ionicons name="close" size={24} color="#1b1b1b" />
                </TouchableOpacity>
              </View>
              {loadingMapLocation || !pinCoords ? (
                <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
              ) : (
                <>
                  <View style={styles.mapPickerContainer}>
                    <MapView
                      style={styles.mapPicker}
                      provider={PROVIDER_DEFAULT}
                      initialRegion={{ latitude: pinCoords.latitude, longitude: pinCoords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
                      <Marker coordinate={pinCoords} draggable onDragEnd={(e) => setPinCoords(e.nativeEvent.coordinate)}>
                        <View style={styles.dropPinCircle}>
                          <Ionicons name="location" size={18} color="#fff" />
                        </View>
                      </Marker>
                    </MapView>
                    <View style={styles.mapPickerHint}>
                      <Ionicons name="hand-left-outline" size={14} color="#6b7280" />
                      <Text style={styles.mapPickerHintText}>Drag the pin to your exact location</Text>
                    </View>
                  </View>
                  <View style={styles.mapPickerFooter}>
                    <TouchableOpacity style={styles.confirmPinBtn} onPress={confirmMapPin} disabled={geocoding} activeOpacity={0.85}>
                      <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.confirmPinGradient}>
                        {geocoding ? <ActivityIndicator color="#fff" /> : (
                          <>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={styles.confirmPinText}>Confirm This Location</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          ) : (
          <>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={24} color="#1b1b1b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <TouchableOpacity style={styles.avatarPickerBtn} onPress={() => setAvatarMenuVisible(true)} disabled={uploadingAvatar}>
              {editForm.profileImage ? (
                <Image source={{ uri: editForm.profileImage }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera-outline" size={26} color={ACCENT} />
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="pencil" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Modal
              visible={avatarMenuVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setAvatarMenuVisible(false)}
              onDismiss={() => {
                const action = pendingAvatarActionRef.current;
                pendingAvatarActionRef.current = null;
                if (action) action();
              }}>
              <TouchableOpacity style={styles.attachMenuOverlay} activeOpacity={1} onPress={() => setAvatarMenuVisible(false)}>
                <View style={styles.attachMenu}>
                  <TouchableOpacity style={styles.attachMenuOption} onPress={() => triggerAvatarAction(takeAvatarPhoto)}>
                    <View style={[styles.attachMenuIconWrap, { backgroundColor: '#f0fdf4' }]}>
                      <Ionicons name="camera" size={20} color="#10b981" />
                    </View>
                    <Text style={styles.attachMenuText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachMenuOption} onPress={() => triggerAvatarAction(pickAvatarFromLibrary)}>
                    <View style={[styles.attachMenuIconWrap, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="image" size={20} color="#2563eb" />
                    </View>
                    <Text style={styles.attachMenuText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({ ...editForm, name: t })} />
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({ ...editForm, name: t })} />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={editForm.phone} onChangeText={t => setEditForm({ ...editForm, phone: t })} keyboardType="phone-pad" />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={editForm.bio} onChangeText={t => setEditForm({ ...editForm, bio: t })} multiline numberOfLines={3} placeholder="Tell car owners about your experience..." />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={editForm.location} onChangeText={t => setEditForm({ ...editForm, location: t })} placeholder="e.g. Kumasi, Ghana" />
            <View style={styles.locationBtnRow}>
              <TouchableOpacity
                style={[styles.gpsBtn, { flex: 1 }]}
                onPress={async () => {
                  const coords = await locationService.getCurrentLocation();
                  if (coords) {
                    setEditForm({ ...editForm, latitude: coords.latitude, longitude: coords.longitude });
                    setAlert({ type: 'success', title: 'Location Set', message: `GPS coordinates saved: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` });
                  }
                }}>
                <Ionicons
                  name={editForm.latitude ? 'navigate' : 'navigate-outline'}
                  size={16}
                  color={editForm.latitude ? '#10b981' : ACCENT}
                />
                <Text style={[styles.gpsBtnText, editForm.latitude ? { color: '#10b981' } : {}]}>
                  {editForm.latitude ? '✓ GPS set' : 'Use my GPS'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mapPickBtn, { flex: 1 }]} onPress={openMapPicker}>
                <Ionicons name="map-outline" size={16} color="#2563eb" />
                <Text style={styles.mapPickBtnText}>Pick on map</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateProfile}>
              <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.submitGradient}>
                <Text style={styles.submitText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
          </>
          )}
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#001D3D' },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#fff' },
  email: { fontSize: FONT_SIZES.sm, color: '#fde68a' },
  bio: { fontSize: FONT_SIZES.sm, color: '#fef3c7', textAlign: 'center', paddingHorizontal: SPACING.xl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: FONT_SIZES.sm, color: '#fde68a' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  verifiedText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full },
  editBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  statsRow: { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: ACCENT },
  statLabel: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginTop: 2 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  reviewCountText: { fontSize: FONT_SIZES.xs, color: '#9ca3af', fontWeight: '600' },
  availabilityCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  availabilityToggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  availabilityLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b' },
  availabilitySubtext: { fontSize: FONT_SIZES.xs, color: '#9ca3af', marginTop: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a', flex: 1 },
  timeBtnLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  timeBtnValue: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: ACCENT },
  pickerWrap: { backgroundColor: '#fff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', marginTop: SPACING.md, overflow: 'hidden' },
  pickerDoneBtn: { padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  pickerDoneBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: ACCENT },
  reviewCard: { width: 220, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: FONT_SIZES.xs, color: '#9ca3af' },
  reviewComment: { fontSize: FONT_SIZES.sm, color: '#6b7280', lineHeight: 18 },
  reviewNoComment: { fontSize: FONT_SIZES.sm, color: '#d1d5db', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 4, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: FONT_SIZES.md, color: '#9ca3af' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md, backgroundColor: '#fff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#f3f4f6' },
  walletBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletBtnText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: '#fef2f2', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#dc2626' },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, margin: SPACING.lg, marginTop: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#f3f4f6' },
  deleteAccountText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#dc2626' },
  deleteAccountPendingText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modal: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b' },
  modalBody: { padding: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: FONT_SIZES.md, color: '#1b1b1b' },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitBtn: { marginTop: 24, borderRadius: RADIUS.md, overflow: 'hidden' },
  submitGradient: { padding: 16, alignItems: 'center' },
  submitText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  devBtn: { alignItems: 'center', padding: SPACING.md },
  devBtnText: { fontSize: FONT_SIZES.xs, color: '#9ca3af' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: '#fffbeb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a' },
  gpsBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  locationBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  mapPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: '#eff6ff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#bfdbfe' },
  mapPickBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#2563eb' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPickerBtn: { alignSelf: 'center', width: 84, height: 84, marginBottom: SPACING.md },
  avatarPickerImage: { width: 84, height: 84, borderRadius: 42 },
  avatarPickerPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fffbeb', borderWidth: 1.5, borderColor: '#fde68a', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  avatarUploadingOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 42, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapPickerContainer: { flex: 1 },
  mapPicker: { flex: 1 },
  mapPickerHint: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapPickerHintText: { fontSize: FONT_SIZES.xs, color: '#6b7280', fontWeight: '600' },
  dropPinCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 4 },
  mapPickerFooter: { padding: SPACING.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  confirmPinBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmPinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  confirmPinText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  attachMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  attachMenu: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: SPACING.md, paddingBottom: 40 },
  attachMenuOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  attachMenuIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  attachMenuText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b' },
});