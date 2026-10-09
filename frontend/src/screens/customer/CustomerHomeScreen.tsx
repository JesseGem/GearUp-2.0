import React, { useEffect, useState, useRef } from 'react';
import { COLORS, FONT_FAMILY, JOB_STATUS_COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { jobService } from '../../services/jobService';
import { vehicleService } from '../../services/vehicleService';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const AUTO_SWIPE_INTERVAL = 4500;

const VEHICLE_ICONS: Record<string, any> = {
  CAR: 'car-sport',
  TRUCK: 'bus',
  SUV: 'car-sport',
  MOTORCYCLE: 'bicycle',
  VAN: 'bus',
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatScheduled = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

type UpdateCardData = {
  key: string;
  icon: any;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function CustomerHomeScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [jobs, setJobs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const [updates, setUpdates] = useState<UpdateCardData[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [updateIndex, setUpdateIndex] = useState(0);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const updateListRef = useRef<FlatList>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildUpdates = async (sortedJobs: any[], vehiclesData: any[]): Promise<UpdateCardData[]> => {
    const results: UpdateCardData[] = [];

    const activeJob = sortedJobs.find(j => j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS');
    if (activeJob) {
      const isInProgress = activeJob.status === 'IN_PROGRESS';
      results.push({
        key: `active-${activeJob.id}`,
        icon: isInProgress ? 'construct' : 'checkmark-circle',
        color: COLORS.info,
        bg: COLORS.infoTint,
        title: isInProgress ? 'Job in progress' : 'Mechanic accepted your job',
        subtitle: `${activeJob.title} · ${isInProgress ? 'Work has started' : 'On the way to you'}`,
        onPress: () => navigation.navigate('Jobs'),
      });
    }

    const recentCompleted = sortedJobs.find(j => j.status === 'COMPLETED');
    if (recentCompleted) {
      try {
        const payment = await paymentService.getPaymentByJob(recentCompleted.id);
        if (!payment || payment.status !== 'success') {
          results.push({
            key: `payment-${recentCompleted.id}`,
            icon: 'cash-outline',
            color: COLORS.primary,
            bg: COLORS.warningTint,
            title: 'Job completed — payment due',
            subtitle: `${recentCompleted.title} · GHS ${recentCompleted.finalCost || 0}`,
            onPress: () => navigation.navigate('Jobs'),
          });
        }
      } catch {
        results.push({
          key: `payment-${recentCompleted.id}`,
          icon: 'cash-outline',
          color: COLORS.primary,
          bg: COLORS.warningTint,
          title: 'Job completed — payment due',
          subtitle: `${recentCompleted.title} · GHS ${recentCompleted.finalCost || 0}`,
          onPress: () => navigation.navigate('Jobs'),
        });
      }
    }

    const now = new Date().getTime();
    const upcoming = sortedJobs
      .filter(j => j.scheduledDate && (j.status === 'PENDING' || j.status === 'ACCEPTED') && new Date(j.scheduledDate).getTime() > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
    if (upcoming) {
      results.push({
        key: `scheduled-${upcoming.id}`,
        icon: 'calendar-outline',
        color: COLORS.info,
        bg: COLORS.infoTint,
        title: 'Upcoming scheduled job',
        subtitle: `${upcoming.title} · ${formatScheduled(upcoming.scheduledDate)}`,
        onPress: () => navigation.navigate('Jobs'),
      });
    }

    for (const v of vehiclesData) {
      for (const [field, label] of [['insuranceExpiry', 'Insurance'], ['roadworthyExpiry', 'Roadworthy']] as const) {
        const dateStr = v[field];
        if (!dateStr) continue;
        const daysLeft = (new Date(dateStr).getTime() - now) / (1000 * 60 * 60 * 24);
        if (daysLeft < 30) {
          results.push({
            key: `vehicle-${v.id}-${field}`,
            icon: 'alert-circle-outline',
            color: daysLeft < 0 ? COLORS.error : COLORS.primary,
            bg: daysLeft < 0 ? COLORS.errorTint : COLORS.warningTint,
            title: daysLeft < 0 ? `${label} expired` : `${label} expiring soon`,
            subtitle: `${v.make} ${v.model} · ${formatDate(dateStr)}`,
            onPress: () => navigation.navigate('Profile', { openVehicleId: v.id }),
          });
          break;
        }
      }
    }

    return results;
  };

  const fetchData = async () => {
    try {
      const [jobsData, vehiclesData, profileData] = await Promise.all([
        jobService.getMyJobsAsCustomer(),
        vehicleService.getMyVehicles(),
        userService.getMyProfile().catch(() => null),
      ]);
      const sorted = [...jobsData].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJobs(sorted);
      setVehicles(vehiclesData);
      if (profileData) setProfileImage(profileData.profileImage || null);

      const cards = await buildUpdates(sorted, vehiclesData);
      setUpdates(cards);
      setUpdateIndex(0);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (updates.length <= 1) return;
    startAutoTimer();
    return () => stopAutoTimer();
  }, [updates.length]);

  const startAutoTimer = () => {
    stopAutoTimer();
    autoTimerRef.current = setInterval(() => {
      setUpdateIndex(prev => {
        const next = (prev + 1) % updates.length;
        updateListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SWIPE_INTERVAL);
  };

  const stopAutoTimer = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const onUpdateScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING.sm));
    setUpdateIndex(newIndex);
    startAutoTimer();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => JOB_STATUS_COLORS[status] || COLORS.textSecondary;

  const featuredJob = jobs.find(j => j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS') || jobs[0] || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>What do you need help with today?</Text>
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
        <TouchableOpacity
          style={styles.sosButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CustomerSOS')}>
          <View style={styles.sosIconWrap}>
            <Ionicons name="warning" size={20} color={COLORS.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosText}>SOS Emergency</Text>
            <Text style={styles.sosSubtext}>Get help right now, nearest mechanic first</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        style={styles.scrollBody}>

        <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>

          {updates.length > 0 && (
            <View style={[styles.section, { paddingBottom: 0 }]}>
              <FlatList
                ref={updateListRef}
                data={updates}
                keyExtractor={item => item.key}
                horizontal
                pagingEnabled={false}
                snapToInterval={CARD_WIDTH + SPACING.sm}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onUpdateScrollEnd}
                onScrollBeginDrag={stopAutoTimer}
                ItemSeparatorComponent={() => <View style={{ width: SPACING.sm }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.updateCard, { backgroundColor: item.bg, width: CARD_WIDTH }]}
                    activeOpacity={0.85}
                    onPress={item.onPress}>
                    <View style={[styles.updateIconWrap, { backgroundColor: COLORS.white }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.updateTitle, { color: item.color }]}>{item.title}</Text>
                      <Text style={styles.updateSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={item.color} />
                  </TouchableOpacity>
                )}
              />
              {updates.length > 1 && (
                <View style={styles.updateDotsRow}>
                  {updates.map((_, i) => (
                    <View key={i} style={[styles.updateDot, i === updateIndex && styles.updateDotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Jobs')} activeOpacity={0.85}>
                <View style={[styles.actionIconWrap, { backgroundColor: COLORS.successTint }]}>
                  <Ionicons name="add-circle" size={26} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>New Job</Text>
                <Text style={styles.actionSubtext}>Find a mechanic for this job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Search')} activeOpacity={0.85}>
                <View style={[styles.actionIconWrap, { backgroundColor: COLORS.infoTint }]}>
                  <Ionicons name="search" size={24} color={COLORS.info} />
                </View>
                <Text style={styles.actionText}>Find Mechanic</Text>
                <Text style={styles.actionSubtext}>Browse & compare</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* My Vehicles */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Vehicles</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
            ) : vehicles.length === 0 ? (
              <TouchableOpacity style={styles.addVehicleCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
                <Ionicons name="car-outline" size={28} color={COLORS.border} />
                <Text style={styles.addVehicleText}>Add your first vehicle</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md, paddingRight: SPACING.lg }}>
                {vehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.vehicleCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Profile', { openVehicleId: v.id })}>
                    <LinearGradient colors={[COLORS.successTint, COLORS.successTint]} style={styles.vehicleImagePlaceholder}>
                      <Ionicons name={VEHICLE_ICONS[v.type] || 'car-sport'} size={38} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.vehicleName} numberOfLines={1}>{v.make} {v.model}</Text>
                    <Text style={styles.vehicleSub}>{v.year} · {v.licensePlate}</Text>
                    <View style={styles.vehicleMetaRow}>
                      <Text style={styles.typeBadgeText}>{v.type}</Text>
                    </View>
                    <View style={styles.servicedRow}>
                      <Ionicons name="build-outline" size={11} color={COLORS.textSecondary} />
                      <Text style={styles.servicedText}>Serviced: {formatDate(v.lastServicedDate)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addVehicleMini} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
                  <View style={styles.addVehicleMiniCircle}>
                    <Ionicons name="add" size={26} color={COLORS.primary} />
                  </View>
                  <Text style={styles.addVehicleMiniText}>Add Vehicle</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Featured / Most Relevant Job */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Job</Text>
              {jobs.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : !featuredJob ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="construct-outline" size={40} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.emptyText}>No jobs yet</Text>
                <Text style={styles.emptySubText}>Create your first job</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('Jobs')}>
                  <Text style={styles.emptyCtaText}>Create Job</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.jobCard} activeOpacity={0.85} onPress={() => navigation.navigate('Jobs')}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{featuredJob.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(featuredJob.status) + '18' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(featuredJob.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(featuredJob.status) }]}>{featuredJob.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.jobDesc} numberOfLines={2}>{featuredJob.description}</Text>
                <View style={styles.jobFooter}>
                  <Ionicons name="construct-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.jobMeta}>{featuredJob.type}</Text>
                  {featuredJob.location && (
                    <>
                      <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
                      <Text style={styles.jobMeta} numberOfLines={1}>{featuredJob.location}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white, fontFamily: FONT_FAMILY.headingBold },
  subGreeting: { fontSize: FONT_SIZES.sm, color: COLORS.darkTextSecondary, marginTop: 2, fontFamily: FONT_FAMILY.body },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.primary },
  sosButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(180,35,53,0.18)', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  sosIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  sosText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  sosSubtext: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  scrollBody: { flex: 1 },
  section: { padding: SPACING.lg, paddingTop: SPACING.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, fontFamily: FONT_FAMILY.headingBold },
  seeAllText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary },
  updateCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md },
  updateIconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  updateTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  updateSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  updateDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  updateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  updateDotActive: { backgroundColor: COLORS.primary, width: 18 },
  quickActions: { flexDirection: 'row', gap: SPACING.md },
  actionCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  actionSubtext: { fontSize: 11, color: COLORS.textSecondary },
  addVehicleCard: { alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', gap: 8 },
  addVehicleText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  vehicleCard: { width: 172, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vehicleImagePlaceholder: { width: '100%', height: 76, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  vehicleName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  vehicleSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  vehicleMetaRow: { marginTop: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.successTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  servicedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  servicedText: { fontSize: 10, color: COLORS.textSecondary },
  addVehicleMini: { width: 120, backgroundColor: COLORS.white, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', gap: 8, padding: SPACING.md },
  addVehicleMiniCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.successTint, justifyContent: 'center', alignItems: 'center' },
  addVehicleMiniText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.primary },
  jobCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  jobTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, flex: 1, fontFamily: FONT_FAMILY.headingBold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  jobDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 19 },
  jobFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, flexShrink: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: COLORS.white, borderRadius: RADIUS.md, gap: 4 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  emptySubText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 16 },
  emptyCta: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.full },
  emptyCtaText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.white },
});
