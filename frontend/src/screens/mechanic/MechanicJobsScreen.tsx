import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
  Animated, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { jobService } from '../../services/jobService';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';
import { messageService, JobCardMetadata } from '../../services/messageService';
import { useFocusEffect } from '@react-navigation/native';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AppAlertCard } from '../../components/AppAlert';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#000814';
const ACCENT_DEEP = '#001D3D';

const getWeekGroup = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return 'This Week';
  if (diffDays < 14) return 'Last Week';
  if (diffDays < 30) return 'Earlier This Month';
  return 'Older';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#f59e0b';
    case 'ACCEPTED': return '#3b82f6';
    case 'IN_PROGRESS': return '#8b5cf6';
    case 'COMPLETED': return '#10b981';
    case 'CANCELLED': return '#ef4444';
    default: return '#6b7280';
  }
};

// ─── JobCard: its own component so entrance-animation hooks are safe/stable ───
function JobCard({
  job, index, owner, paidJobs, onStart, onComplete, onEditPrice, onMessage, onViewMap, messagingBusy,
}: {
  job: any;
  index: number;
  owner: any;
  paidJobs: number[];
  onStart: (job: any) => void;
  onComplete: (job: any) => void;
  onEditPrice: (job: any) => void;
  onMessage: (job: any, ownerName: string) => void;
  onViewMap: (job: any) => void;
  messagingBusy: boolean;
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 40, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(job.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>{job.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>
          {new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(job.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
        <View style={styles.jobMeta}>
          <Ionicons name="construct-outline" size={13} color="#9ca3af" />
          <Text style={styles.metaText}>{job.type}</Text>
          {job.location && <>
            <Ionicons name="location-outline" size={13} color="#9ca3af" />
            <Text style={styles.metaText} numberOfLines={1}>{job.location}</Text>
          </>}
          {job.latitude && (
            <View style={styles.gpsPill}>
              <Ionicons name="navigate" size={9} color="#10b981" />
              <Text style={styles.gpsText}>GPS</Text>
            </View>
          )}
        </View>
        {job.finalCost && (
          <Text style={styles.costText}>Final: GHS {job.finalCost}</Text>
        )}

        {owner && (
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{owner.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerLabel}>Car Owner</Text>
              <Text style={styles.ownerName} numberOfLines={1}>{owner.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.messageIconBtn}
              activeOpacity={0.85}
              disabled={messagingBusy}
              onPress={() => onMessage(job, owner.name)}>
              {messagingBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="chatbubble" size={15} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {job.status === 'ACCEPTED' && (
          <TouchableOpacity style={styles.startBtn} onPress={() => onStart(job)} activeOpacity={0.85}>
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={styles.startBtnText}>Start Job</Text>
          </TouchableOpacity>
        )}
        {job.status === 'IN_PROGRESS' && (
          <TouchableOpacity style={styles.completeBtn} onPress={() => onComplete(job)} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={14} color="#fff" />
            <Text style={styles.completeBtnText}>Complete Job</Text>
          </TouchableOpacity>
        )}
        {job.latitude && job.status !== 'CANCELLED' && job.status !== 'COMPLETED' && (
          <TouchableOpacity style={styles.mapBtn} onPress={() => onViewMap(job)} activeOpacity={0.85}>
            <Ionicons name="map-outline" size={14} color="#2563eb" />
            <Text style={styles.mapBtnText}>View Owner Location</Text>
          </TouchableOpacity>
        )}
        {job.status === 'COMPLETED' && !paidJobs.includes(job.id) && (
          <TouchableOpacity style={styles.editPriceBtn} onPress={() => onEditPrice(job)} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={14} color={ACCENT} />
            <Text style={styles.editPriceBtnText}>Edit Price</Text>
          </TouchableOpacity>
        )}
        {job.status === 'COMPLETED' && paidJobs.includes(job.id) && (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.paidText}>Paid</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function MechanicJobsScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [jobs, setJobs] = useState<any[]>([]);
  const [paidJobs, setPaidJobs] = useState<number[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [openingChatJobId, setOpeningChatJobId] = useState<number | null>(null);
  const [priceModal, setPriceModal] = useState<{ job: any; mode: 'complete' | 'edit' } | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [formAlert, setFormAlert] = useState<{ title: string; message: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'Last Week': true,
    'Earlier This Month': true,
    'Older': true,
  });
  const enterAnim = useRef(new Animated.Value(0)).current;

  const toggleSection = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const fetchJobs = async () => {
    try {
      const data = await jobService.getMyJobsAsMechanic();
      const sorted = [...data].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJobs(sorted);

      const completedJobs = sorted.filter((j: any) => j.status === 'COMPLETED');
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

      const ownerIds = Array.from(new Set(sorted.map((j: any) => j.ownerId)));
      const missingIds = ownerIds.filter(id => !ownerProfiles[id as number]);
      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const profile = await userService.getUserById(id as number);
              return [id, profile] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );
        setOwnerProfiles(prev => {
          const updated = { ...prev };
          fetched.forEach(([id, profile]) => { if (profile) updated[id as number] = profile; });
          return updated;
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  // Refetches every time this tab regains focus, so job-card updates made elsewhere
  // (like a payment completed inside a chat) show up here automatically.
  useFocusEffect(
    React.useCallback(() => {
      fetchJobs();
    }, [])
  );
  const onRefresh = () => { setRefreshing(true); fetchJobs(); };

  // Pushes the current job state into the shared chat thread's job card,
  // reusing an existing conversation with the owner if one exists.
  const syncJobCard = async (job: any, patch: Partial<JobCardMetadata>) => {
    try {
      const existing = await messageService.getConversationWithUser(user?.userId, job.ownerId).catch(() => null);
      const chatJobId = existing ? existing.job_id : job.id;
      const meta: JobCardMetadata = {
        jobId: job.id,
        title: job.title,
        description: job.description,
        jobType: job.type,
        location: job.location,
        scheduledDate: job.scheduledDate,
        estimatedCost: job.estimatedCost,
        finalCost: job.finalCost,
        status: job.status,
        mechanicId: user?.userId,
        ...patch,
      };
      await messageService.sendJobCard(chatJobId, user?.userId, job.ownerId, meta);
    } catch {
      // Chat sync is a nice-to-have — never block the actual job action on it
    }
  };

  const handleStart = async (job: any) => {
    setProcessing(true);
    try {
      await jobService.startJob(job.id);
      await syncJobCard(job, { status: 'IN_PROGRESS' });
      fetchJobs();
    } catch (e: any) {
      setFormAlert({ title: 'Could Not Start Job', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
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
      setFormAlert({ title: 'Invalid Amount', message: 'Please enter a valid positive number.' });
      return;
    }
    setProcessing(true);
    try {
      const { job, mode } = priceModal;
      if (mode === 'complete') {
        await jobService.completeJob(job.id, parsed);
        await syncJobCard(job, { status: 'COMPLETED', finalCost: parsed });
      } else {
        await jobService.updateFinalCost(job.id, parsed);
        await syncJobCard(job, { finalCost: parsed });
      }
      setPriceModal(null);
      setPriceInput('');
      fetchJobs();
    } catch (e: any) {
      setFormAlert({ title: 'Error', message: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleMessage = async (job: any, ownerName: string) => {
    setOpeningChatJobId(job.id);
    try {
      const existing = await messageService.getConversationWithUser(user?.userId, job.ownerId).catch(() => null);
      const chatJobId = existing ? existing.job_id : job.id;
      navigation.navigate('Chat', {
        job: { ...job, id: chatJobId },
        otherUserId: job.ownerId,
        otherUserName: ownerName,
      });
    } finally {
      setOpeningChatJobId(null);
    }
  };

  const handleViewMap = (job: any) => {
    navigation.getParent()?.navigate('MechanicMap', { job });
  };

  const filteredJobs = activeTab === 'ALL' ? jobs : jobs.filter(j => j.status === activeTab);

  const groupOrder = ['This Week', 'Last Week', 'Earlier This Month', 'Older'];
  const grouped: Record<string, any[]> = {};
  filteredJobs.forEach(job => {
    const group = getWeekGroup(job.createdAt);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(job);
  });
  const sections = groupOrder.filter(g => grouped[g]?.length).map(g => ({ title: g, data: grouped[g] }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {['ALL', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.85}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 110 }}>
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="construct-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            {sections.map(section => {
              const isCollapsed = collapsedSections[section.title];
              return (
                <View key={section.title}>
                  <TouchableOpacity
                    style={styles.sectionHeaderRow}
                    onPress={() => toggleSection(section.title)}
                    activeOpacity={0.7}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <View style={styles.sectionHeaderRight}>
                      <Text style={styles.sectionCount}>{section.data.length}</Text>
                      <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed && section.data.map((job, idx) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={idx}
                      owner={ownerProfiles[job.ownerId]}
                      paidJobs={paidJobs}
                      onStart={handleStart}
                      onComplete={openCompleteModal}
                      onEditPrice={openEditPriceModal}
                      onMessage={handleMessage}
                      onViewMap={handleViewMap}
                      messagingBusy={openingChatJobId === job.id}
                    />
                  ))}
                </View>
              );
            })}
          </Animated.View>
        )}
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

      {formAlert && (
        <View style={styles.fullOverlay}>
          <AppAlertCard
            type="error"
            title={formAlert.title}
            message={formAlert.message}
            accentColor={ACCENT}
            onClose={() => setFormAlert(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  tabs: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: '#fff', maxHeight: 52 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, marginRight: 8, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: ACCENT },
  tabText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  list: { flex: 1, padding: SPACING.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm },
  sectionHeader: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount: { fontSize: 11, fontWeight: '700', color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  jobCard: { backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#f3f4f6' },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  jobTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#111827', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  jobDesc: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginBottom: 6, lineHeight: 17 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: '#9ca3af', flexShrink: 1 },
  gpsPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  gpsText: { fontSize: 9, fontWeight: '600', color: '#10b981' },
  costText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: ACCENT, marginTop: 6 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, backgroundColor: '#f9fafb', borderRadius: RADIUS.sm },
  ownerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  ownerAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ownerLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  ownerName: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#1b1b1b' },
  messageIconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: '#8b5cf6', borderRadius: RADIUS.sm },
  startBtnText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#fff' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: '#10b981', borderRadius: RADIUS.sm },
  completeBtnText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#fff' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: '#eff6ff', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#bfdbfe' },
  mapBtnText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#2563eb' },
  editPriceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: '#fffbeb', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#fde68a' },
  editPriceBtnText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: ACCENT },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: RADIUS.sm, justifyContent: 'center' },
  paidText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#10b981' },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#374151' },
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
  fullOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
});