import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, Animated, LayoutAnimation, UIManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { jobService } from '../../services/jobService';
import { vehicleService } from '../../services/vehicleService';
import { paymentService } from '../../services/paymentService';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';
import { messageService, JobCardMetadata } from '../../services/messageService';
import ConfirmDialog from '../../components/ConfirmDialog';
import WalletPaymentSheet from '../../components/WalletPaymentSheet';
import CreateJobModal from '../../components/CreateJobModal';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const getWeekGroup = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return 'This Week';
  if (diffDays < 14) return 'Last Week';
  if (diffDays < 30) return 'Earlier This Month';
  return 'Older';
};
const formatScheduled = (date: Date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
const isDeletable = (job: any, paidJobs: number[]) =>
  job.status === 'CANCELLED' || (job.status === 'COMPLETED' && paidJobs.includes(job.id));
// ─── JobCard: its own component so hooks (entrance animation) are safe/stable ───
function JobCard({
  job, index, mechanic, paidJobs, onCancel, onPay, onMessage, onDelete, messagingBusy,
}: {
  job: any;
  index: number;
  mechanic: any;
  paidJobs: number[];
  onCancel: (job: any) => void;
  onPay: (job: any) => void;
  onMessage: (job: any, mechanicName: string) => void;
  onDelete: (job: any) => void;
  messagingBusy: boolean;
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const swipeableRef = useRef<Swipeable | null>(null);
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
  const renderDeleteAction = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        activeOpacity={0.85}
        onPress={() => { swipeableRef.current?.close(); onDelete(job); }}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 4 }}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };
  const card = (
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
        {job.scheduledDate && (
          <View style={styles.scheduledPill}>
            <Ionicons name="calendar-outline" size={11} color="#7c3aed" />
            <Text style={styles.scheduledPillText}>
              Scheduled: {formatScheduled(new Date(job.scheduledDate))}
            </Text>
          </View>
        )}
        {job.requestType === 'DIRECT' && (
          <View style={styles.directPill}>
            <Ionicons name="person-outline" size={11} color="#2563eb" />
            <Text style={styles.directPillText}>Requested a specific mechanic</Text>
          </View>
        )}
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
        {mechanic && (
          <View style={styles.mechanicRow}>
            <View style={styles.mechanicAvatar}>
              <Text style={styles.mechanicAvatarText}>{mechanic.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mechanicLabel}>Mechanic</Text>
              <Text style={styles.mechanicName} numberOfLines={1}>{mechanic.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.messageIconBtn}
              activeOpacity={0.85}
              disabled={messagingBusy}
              onPress={() => onMessage(job, mechanic.name)}>
              {messagingBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="chatbubble" size={15} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
        {job.status === 'PENDING' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(job)} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Cancel Job</Text>
          </TouchableOpacity>
        )}
        {job.status === 'COMPLETED' && !paidJobs.includes(job.id) && (
          <TouchableOpacity style={styles.payBtn} onPress={() => onPay(job)} activeOpacity={0.85}>
            <Text style={styles.payBtnText}>💳 Pay GHS {job.finalCost || 0}</Text>
          </TouchableOpacity>
        )}
        {job.status === 'COMPLETED' && paidJobs.includes(job.id) && (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.paidText}>Paid</Text>
          </View>
        )}
        {isDeletable(job, paidJobs) && (
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-back" size={11} color="#d1d5db" />
            <Text style={styles.swipeHintText}>Swipe to delete</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
  if (isDeletable(job, paidJobs)) {
    return (
      <Swipeable
        ref={(ref) => { swipeableRef.current = ref; }}
        renderRightActions={renderDeleteAction}
        overshootRight={false}>
        {card}
      </Swipeable>
    );
  }
  return card;
}

export default function OwnerJobsScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [jobs, setJobs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [paidJobs, setPaidJobs] = useState<number[]>([]);
  const [mechanicProfiles, setMechanicProfiles] = useState<Record<number, any>>({});
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const [deleteJobTarget, setDeleteJobTarget] = useState<any>(null);
  const [openingChatJobId, setOpeningChatJobId] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'Last Week': true,
    'Earlier This Month': true,
    'Older': true,
  });
  const enterAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  const toggleSection = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };
  const fetchData = async () => {
    try {
      const [jobsData, vehiclesData] = await Promise.all([
        jobService.getMyJobsAsOwner(),
        vehicleService.getMyVehicles()
      ]);
      const sorted = [...jobsData].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJobs(sorted);
      setVehicles(vehiclesData);
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
            // no payment exists yet for this job
          }
        })
      );
      setPaidJobs(paidIds);
      const mechanicIds = Array.from(new Set(sorted.filter((j: any) => j.mechanicId).map((j: any) => j.mechanicId)));
      const missingIds = mechanicIds.filter(id => !mechanicProfiles[id as number]);
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
        setMechanicProfiles(prev => {
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
  // Refetches every time this tab regains focus (not just on first mount), so job-card
  // updates made elsewhere — like a payment completed inside a chat — show up here
  // without needing a manual pull-to-refresh.
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Pushes the current job state into the shared chat thread's job card, mirroring
  // the same helper MechanicJobsScreen uses for start/complete updates.
  const syncJobCard = async (job: any, patch: Partial<JobCardMetadata>) => {
    // A job only has mechanicId set once accepted. Before that (e.g. cancelling a
    // still-PENDING DIRECT request), the intended mechanic is tracked as
    // preferredMechanicId instead — and a chat thread with them already exists
    // from CreateJobModal's initial job card, so fall back to that.
    const targetMechanicId = job.mechanicId || job.preferredMechanicId;
    if (!targetMechanicId) return; // GENERAL request with no specific mechanic yet — no thread to update
    try {
      const existing = await messageService.getConversationWithUser(user?.userId, targetMechanicId).catch(() => null);
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
        mechanicId: job.mechanicId || undefined,
        ...patch,
      };
      await messageService.sendJobCard(chatJobId, user?.userId, targetMechanicId, meta);
    } catch {
      // Chat sync is a nice-to-have — never block the actual job action on it
    }
  };
  const requestCancelJob = (job: any) => {
    setCancelTarget(job);
  };
  const confirmCancelJob = async () => {
    const job = cancelTarget;
    setCancelTarget(null);
    if (!job) return;
    try {
      await jobService.cancelJob(job.id);
      await syncJobCard(job, { status: 'CANCELLED' });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  const requestDeleteJob = (job: any) => {
    setDeleteJobTarget(job);
  };
  const confirmDeleteJob = async () => {
    const job = deleteJobTarget;
    setDeleteJobTarget(null);
    if (!job) return;
    try {
      await jobService.deleteJob(job.id);
      setJobs(prev => prev.filter(j => j.id !== job.id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not delete this job.');
    }
  };
  const requestPayment = (job: any) => {
    setPaymentTarget(job);
  };
  const handleWalletJobPaid = () => {
    const job = paymentTarget;
    if (!job) return;
    setPaidJobs(prev => [...prev, job.id]);
    fetchData();
    setPaymentTarget(null);
    setCurrentJob(job);
    setRatingModal(true);
  };
  const openMechanicChat = async (job: any, mechanicName: string) => {
    setOpeningChatJobId(job.id);
    try {
      const existing = await messageService.getConversationWithUser(job.ownerId, job.mechanicId).catch(() => null);
      const chatJobId = existing ? existing.job_id : job.id;
      navigation.navigate('Chat', {
        job: { ...job, id: chatJobId },
        otherUserId: job.mechanicId,
        otherUserName: mechanicName,
      });
    } finally {
      setOpeningChatJobId(null);
    }
  };
  const handleSubmitReview = async () => {
    if (selectedRating === 0) {
      Alert.alert('Please select a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        jobId: currentJob.id,
        revieweeId: currentJob.mechanicId,
        rating: selectedRating,
        comment: ratingComment,
      });
      setReviewSubmitted(true);
      setTimeout(() => {
        setRatingModal(false);
        setReviewSubmitted(false);
        setSelectedRating(0);
        setRatingComment('');
        setCurrentJob(null);
      }, 1500);
    } catch (e: any) {
      setRatingModal(false);
      setSelectedRating(0);
      setRatingComment('');
      setCurrentJob(null);
      if (e.message?.toLowerCase().includes('already reviewed') || e.message?.includes('Unexpected end of input')) {
        // Already reviewed — close quietly
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setSubmittingReview(false);
    }
  };
  const handleFabPress = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(fabScale, { toValue: 0.85, useNativeDriver: true, friction: 5 }),
        Animated.timing(fabRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 100 }),
    ]).start(() => {
      fabRotate.setValue(0);
    });
    setModalVisible(true);
  };
  const fabRotateInterpolate = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });
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
      <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </LinearGradient>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {['ALL', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(tab => (
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1b4332" />}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 140 }}>
        {loading ? (
          <ActivityIndicator color="#1b4332" style={{ marginTop: 40 }} />
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
                      mechanic={job.mechanicId ? mechanicProfiles[job.mechanicId] : null}
                      paidJobs={paidJobs}
                      onCancel={requestCancelJob}
                      onPay={requestPayment}
                      onMessage={openMechanicChat}
                      onDelete={requestDeleteJob}
                      messagingBusy={openingChatJobId === job.id}
                    />
                  ))}
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
      <TouchableOpacity
        onPress={handleFabPress}
        activeOpacity={0.9}
        style={styles.fab}>
        <Animated.View style={{ transform: [{ scale: fabScale }, { rotate: fabRotateInterpolate }] }}>
          <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
      {/* Rating Modal */}
      <Modal visible={ratingModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.ratingOverlay}>
            <View style={styles.ratingCard}>
              {reviewSubmitted ? (
                <View style={styles.reviewSuccessWrap}>
                  <View style={styles.reviewSuccessIconWrap}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  </View>
                  <Text style={styles.reviewSuccessTitle}>Thank you!</Text>
                  <Text style={styles.reviewSuccessSubtitle}>Your review has been submitted.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.ratingIconContainer}>
                    <Text style={styles.ratingEmoji}>⭐</Text>
                  </View>
                  <Text style={styles.ratingTitle}>Rate your Mechanic</Text>
                  <Text style={styles.ratingSubtitle}>How was your experience?</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                        <Ionicons
                          name={star <= selectedRating ? 'star' : 'star-outline'}
                          size={40}
                          color={star <= selectedRating ? '#f59e0b' : '#d1d5db'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedRating > 0 && (
                    <Text style={styles.ratingLabel}>
                      {selectedRating === 1 ? 'Poor' : selectedRating === 2 ? 'Fair' : selectedRating === 3 ? 'Good' : selectedRating === 4 ? 'Very Good' : 'Excellent!'}
                    </Text>
                  )}
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Leave a comment (optional)"
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity style={styles.submitRatingBtn} onPress={handleSubmitReview} disabled={submittingReview} activeOpacity={0.85}>
                    <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.submitRatingGradient}>
                      {submittingReview ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitRatingText}>Submit Review</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={() => {
                    setRatingModal(false);
                    setSelectedRating(0);
                    setRatingComment('');
                    setCurrentJob(null);
                  }}>
                    <Text style={styles.skipText}>Skip for now</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CreateJobModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        vehicles={vehicles}
        userId={user?.userId}
        onCreated={() => fetchData()}
      />
      <ConfirmDialog
        visible={!!cancelTarget}
        icon="close-circle-outline"
        title="Cancel Job"
        message={`Are you sure you want to cancel "${cancelTarget?.title}"?`}
        confirmText="Yes, Cancel"
        cancelText="No"
        destructive
        onConfirm={confirmCancelJob}
        onCancel={() => setCancelTarget(null)}
      />
      <ConfirmDialog
        visible={!!deleteJobTarget}
        icon="trash-outline"
        title="Delete Job"
        message={`Permanently delete "${deleteJobTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={confirmDeleteJob}
        onCancel={() => setDeleteJobTarget(null)}
      />
      <WalletPaymentSheet
        visible={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        navigation={navigation}
        jobId={paymentTarget?.id || 0}
        jobTitle={paymentTarget?.title || ''}
        payeeId={paymentTarget?.mechanicId || 0}
        amount={paymentTarget?.finalCost || 0}
        onPaid={handleWalletJobPaid}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  tabs: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: '#fff', maxHeight: 52 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, marginRight: 8, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: '#1b4332' },
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
  scheduledPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: 6 },
  scheduledPillText: { fontSize: 10, fontWeight: '600', color: '#7c3aed' },
  directPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: 6 },
  directPillText: { fontSize: 10, fontWeight: '600', color: '#2563eb' },
  jobDesc: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginBottom: 6, lineHeight: 17 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: '#9ca3af', flexShrink: 1 },
  gpsPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  gpsText: { fontSize: 9, fontWeight: '600', color: '#10b981' },
  costText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b4332', marginTop: 6 },
  mechanicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, backgroundColor: '#f9fafb', borderRadius: RADIUS.sm },
  mechanicAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center' },
  mechanicAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  mechanicLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  mechanicName: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#1b1b1b' },
  messageIconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { marginTop: 8, padding: 8, backgroundColor: '#fef2f2', borderRadius: RADIUS.sm, alignItems: 'center' },
  cancelText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#dc2626' },
  payBtn: { marginTop: 8, padding: 10, backgroundColor: '#1b4332', borderRadius: RADIUS.sm, alignItems: 'center' },
  payBtnText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: '#fff' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: RADIUS.sm, justifyContent: 'center' },
  paidText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#10b981' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 6 },
  swipeHintText: { fontSize: 9, color: '#d1d5db' },
  deleteAction: { backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', width: 76, marginBottom: SPACING.sm, borderRadius: 14 },
  deleteActionText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  fab: { position: 'absolute', right: SPACING.lg, bottom: 130, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#374151' },
  ratingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ratingCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40, alignItems: 'center' },
  ratingIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  ratingEmoji: { fontSize: 32 },
  ratingTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b', marginBottom: 4 },
  ratingSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: SPACING.lg },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  ratingLabel: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#f59e0b', marginBottom: SPACING.md },
  commentInput: { width: '100%', backgroundColor: '#f9fafb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: FONT_SIZES.md, color: '#1b1b1b', textAlignVertical: 'top', minHeight: 80, marginBottom: SPACING.lg },
  submitRatingBtn: { width: '100%', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md },
  submitRatingGradient: { padding: 16, alignItems: 'center' },
  submitRatingText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  skipBtn: { padding: 8 },
  skipText: { fontSize: FONT_SIZES.sm, color: '#9ca3af' },
  reviewSuccessWrap: { alignItems: 'center', paddingVertical: SPACING.lg },
  reviewSuccessIconWrap: { marginBottom: SPACING.md },
  reviewSuccessTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b', marginBottom: 4 },
  reviewSuccessSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280' },
});