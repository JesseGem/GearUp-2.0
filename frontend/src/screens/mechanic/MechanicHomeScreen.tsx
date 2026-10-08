import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, TextInput, Modal,
  Animated, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { jobService } from '../../services/jobService';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';
import { useFocusEffect } from '@react-navigation/native';
import { AppAlertCard } from '../../components/AppAlert';
import { Image } from 'react-native';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

const ACCENT = '#000814';
const ACCENT_DEEP = '#001D3D';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#f59e0b';
    case 'ACCEPTED': return '#3b82f6';
    case 'IN_PROGRESS': return '#8b5cf6';
    case 'COMPLETED': return '#10b981';
    default: return '#6b7280';
  }
};

// ─── JobRow: its own component so entrance-animation hooks are safe/stable ───
function JobRow({ job, index, children }: { job: any; index: number; children: React.ReactNode }) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 50, 300),
      useNativeDriver: true,
    }).start();
  }, []);
  const animatedStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>{job.status.replace('_', ' ')}</Text>
          </View>
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

export default function MechanicHomeScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [paidJobs, setPaidJobs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingBookings, setAcceptingBookings] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [availabilityStart, setAvailabilityStart] = useState<string | null>(null);
  const [availabilityEnd, setAvailabilityEnd] = useState<string | null>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [priceModal, setPriceModal] = useState<{ job: any; mode: 'complete' | 'edit' } | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;

  const fetchJobs = async () => {
    try {
      const [available, mine, profile] = await Promise.all([
        jobService.getAvailableJobs(),
        jobService.getMyJobsAsMechanic(),
        userService.getMyProfile(),
      ]);
      setAcceptingBookings(!!profile.acceptingBookings);
      setAvailabilityStart(profile.availabilityStart || null);
      setAvailabilityEnd(profile.availabilityEnd || null);
      setProfileImage(profile.profileImage || null);
      const sortByDate = (arr: any[]) => [...arr].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sortedAvailable = sortByDate(available);
      const sortedMine = sortByDate(mine);
      setAvailableJobs(sortedAvailable);
      setMyJobs(sortedMine);
      const completedJobs = sortedMine.filter((j: any) => j.status === 'COMPLETED');
      const paidIds: number[] = [];
      await Promise.all(
        completedJobs.map(async (job: any) => {
          try {
            const payment = await paymentService.getPaymentByJob(job.id);
            if (payment && payment.status === 'COMPLETED') {
              paidIds.push(job.id);
            }
          } catch {
            // no payment exists yet for this job — leave it unpaid
          }
        })
      );
      setPaidJobs(paidIds);
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  // Refetches every time this tab regains focus, so changes made elsewhere
  // (like toggling availability on the Profile screen) show up here automatically.
  useFocusEffect(
    React.useCallback(() => {
      fetchJobs();
    }, [])
  );
  const onRefresh = () => { setRefreshing(true); fetchJobs(); };

  const handleAcceptJob = async (jobId: number) => {
    try {
      await jobService.acceptJob(jobId);
      fetchJobs();
      setAlert({ type: 'success', title: 'Success', message: 'Job accepted! Head to the location.' });
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const openCompleteModal = (job: any) => {
    setPriceModal({ job, mode: 'complete' });
    setPriceInput('');
  };
  const openEditPriceModal = (job: any) => {
    setPriceModal({ job, mode: 'edit' });
    setPriceInput(job.finalCost ? String(job.finalCost) : '');
  };
  const handleSubmitPrice = async () => {
    if (!priceModal) return;
    const parsed = parseFloat(priceInput);
    if (!priceInput || isNaN(parsed) || parsed <= 0) {
      setAlert({ type: 'warning', title: 'Invalid Amount', message: 'Please enter a valid positive number.' });
      return;
    }
    setProcessing(true);
    try {
      const { job, mode } = priceModal;
      if (mode === 'complete') {
        await jobService.completeJob(job.id, parsed);
      } else {
        await jobService.updateFinalCost(job.id, parsed);
      }
      setPriceModal(null);
      setPriceInput('');
      fetchJobs();
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAvailability = async (value: boolean) => {
    setAcceptingBookings(value);
    setSavingAvailability(true);
    try {
      if (value && (!availabilityStart || !availabilityEnd)) {
        // Default to 8am–5pm if never set before — mirrors MechanicProfileScreen's
        // exact behavior, since both toggles now represent the same backend field.
        const start = availabilityStart || '08:00:00';
        const end = availabilityEnd || '17:00:00';
        setAvailabilityStart(start);
        setAvailabilityEnd(end);
        await userService.updateProfile({ acceptingBookings: value, availabilityStart: start, availabilityEnd: end } as any);
      } else {
        await userService.updateProfile({ acceptingBookings: value } as any);
      }
    } catch (e: any) {
      setAcceptingBookings(!value);
      setAlert({ type: 'error', title: 'Error', message: 'Could not update availability. Please try again.' });
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleStartJob = async (job: any) => {
    try {
      await jobService.startJob(job.id);
      fetchJobs();
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message });
    }
  };

  const activeJobs = myJobs.filter(j => j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS');
  const awaitingPaymentJobs = myJobs.filter(j => j.status === 'COMPLETED' && !paidJobs.includes(j.id));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>Ready to help car owners?</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityText}>
            {acceptingBookings ? '🟢 Available for jobs' : '🔴 Not available'}
          </Text>
          <Switch
            value={acceptingBookings}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: '#6b7280', true: '#fbbf24' }}
            thumbColor={acceptingBookings ? '#fff' : '#f4f3f4'}
            disabled={savingAvailability}
          />
        </View>
      </LinearGradient>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        contentContainerStyle={{ paddingBottom: 110 }}>
        <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{myJobs.filter(j => j.status === 'COMPLETED').length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeJobs.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{availableJobs.length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Jobs</Text>
              {activeJobs.map((job, index) => (
                <JobRow key={job.id} job={job} index={index}>
                  <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                  {job.location && (
                    <View style={styles.jobMeta}>
                      <Ionicons name="location-outline" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{job.location}</Text>
                    </View>
                  )}
                  {job.latitude && (
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => navigation.getParent()?.navigate('MechanicMap', { job })}>
                      <Ionicons name="map-outline" size={14} color="#2563eb" />
                      <Text style={styles.mapBtnText}>View Owner Location</Text>
                    </TouchableOpacity>
                  )}
                  {job.status === 'ACCEPTED' && (
                    <TouchableOpacity style={styles.startBtn} onPress={() => handleStartJob(job)}>
                      <Text style={styles.startBtnText}>Start Job</Text>
                    </TouchableOpacity>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => openCompleteModal(job)}>
                      <Text style={styles.completeBtnText}>Complete Job</Text>
                    </TouchableOpacity>
                  )}
                </JobRow>
              ))}
            </View>
          )}

          {/* Awaiting Payment */}
          {awaitingPaymentJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Awaiting Payment</Text>
              {awaitingPaymentJobs.map((job, index) => (
                <JobRow key={job.id} job={job} index={index}>
                  <Text style={styles.costText}>Final: GHS {job.finalCost || 0}</Text>
                  <TouchableOpacity style={styles.editPriceBtn} onPress={() => openEditPriceModal(job)}>
                    <Ionicons name="pencil-outline" size={14} color={ACCENT} />
                    <Text style={styles.editPriceBtnText}>Edit Price</Text>
                  </TouchableOpacity>
                </JobRow>
              ))}
            </View>
          )}

          {/* Available Jobs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Jobs Nearby</Text>
            {loading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
            ) : availableJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="search-outline" size={40} color="#9ca3af" />
                </View>
                <Text style={styles.emptyText}>No available jobs</Text>
                <Text style={styles.emptySubText}>Pull down to refresh</Text>
              </View>
            ) : (
              availableJobs.map((job, index) => (
                <JobRow key={job.id} job={job} index={index}>
                  <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                  {job.location && (
                    <View style={styles.jobMeta}>
                      <Ionicons name="location-outline" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{job.location}</Text>
                    </View>
                  )}
                  {job.estimatedCost && (
                    <Text style={styles.costText}>Est. GHS {job.estimatedCost}</Text>
                  )}
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptJob(job.id)}>
                    <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.acceptGradient}>
                      <Text style={styles.acceptText}>Accept Job</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </JobRow>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Complete / Edit price modal */}
      <Modal
        visible={!!priceModal}
        transparent
        animationType="fade"
        onRequestClose={() => !processing && setPriceModal(null)}>
        <View style={styles.priceOverlay}>
          <View style={styles.priceCard}>
            <View style={styles.priceIconWrap}>
              <Ionicons name={priceModal?.mode === 'edit' ? 'pencil' : 'checkmark-done'} size={26} color={ACCENT} />
            </View>
            <Text style={styles.priceTitle}>{priceModal?.mode === 'edit' ? 'Edit Final Price' : 'Complete Job'}</Text>
            <Text style={styles.priceSubtitle}>
              {priceModal?.mode === 'edit'
                ? `Current: GHS ${priceModal?.job?.finalCost || 0}`
                : `"${priceModal?.job?.title}"`}
            </Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Enter price (GHS)"
              keyboardType="numeric"
              value={priceInput}
              onChangeText={t => setPriceInput(t.replace(/[^0-9.]/g, ''))}
              autoFocus
            />
            <View style={styles.priceActionsRow}>
              <TouchableOpacity style={styles.priceCancelBtn} onPress={() => setPriceModal(null)} disabled={processing}>
                <Text style={styles.priceCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.priceSubmitBtn} onPress={handleSubmitPrice} disabled={processing} activeOpacity={0.85}>
                <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.priceSubmitGradient}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={styles.priceSubmitText}>{priceModal?.mode === 'edit' ? 'Save' : 'Complete'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  subGreeting: { fontSize: FONT_SIZES.sm, color: '#fde68a', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#001D3D' },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, padding: SPACING.md },
  availabilityText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#fff' },
  statsRow: { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: ACCENT },
  statLabel: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginTop: 2 },
  section: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', marginBottom: SPACING.md },
  jobCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  jobTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  jobDesc: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: 8 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: FONT_SIZES.xs, color: '#6b7280' },
  costText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT, marginBottom: 8 },
  acceptBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: 8 },
  acceptGradient: { padding: 12, alignItems: 'center' },
  acceptText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  startBtn: { marginTop: 8, padding: 10, backgroundColor: '#eff6ff', borderRadius: RADIUS.md, alignItems: 'center' },
  startBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#2563eb' },
  completeBtn: { marginTop: 8, padding: 10, backgroundColor: '#f0fdf4', borderRadius: RADIUS.md, alignItems: 'center' },
  completeBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#10b981' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: '#eff6ff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#bfdbfe' },
  mapBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#2563eb' },
  editPriceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, padding: 10, backgroundColor: '#fffbeb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a' },
  editPriceBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: FONT_SIZES.sm, color: '#9ca3af', marginTop: 4 },
  priceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  priceCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', alignItems: 'center' },
  priceIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  priceTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', marginBottom: 4, textAlign: 'center' },
  priceSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', textAlign: 'center', marginBottom: SPACING.lg },
  priceInput: { alignSelf: 'stretch', backgroundColor: '#f9fafb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: FONT_SIZES.md, color: '#1b1b1b', marginBottom: SPACING.lg, textAlign: 'center' },
  priceActionsRow: { flexDirection: 'row', gap: SPACING.md, alignSelf: 'stretch' },
  priceCancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', alignItems: 'center' },
  priceCancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#6b7280' },
  priceSubmitBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  priceSubmitGradient: { padding: 14, alignItems: 'center' },
  priceSubmitText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});