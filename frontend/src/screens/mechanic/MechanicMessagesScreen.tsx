import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { messageService } from '../../services/messageService';
import { jobService } from '../../services/jobService';
import { userService } from '../../services/userService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

const ACCENT = '#000814';
const ACCENT_DEEP = '#001D3D';

// ─── ConversationCard: its own component so entrance-animation hooks are safe/stable ───
function ConversationCard({
  convo, index, userId, getPreviewText, formatTime, onOpen, onDelete, swipeableRefs,
}: {
  convo: any;
  index: number;
  userId: number;
  getPreviewText: (c: any) => string;
  formatTime: (d: string) => string;
  onOpen: (c: any) => void;
  onDelete: (c: any) => void;
  swipeableRefs: React.MutableRefObject<Record<string, Swipeable | null>>;
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
  const isUnread = !convo.is_read && convo.sender_id !== userId;
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => onDelete(convo)} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 4 }}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };
  return (
    <Animated.View style={animatedStyle}>
      <Swipeable
        ref={(ref) => { swipeableRefs.current[convo.id] = ref; }}
        renderRightActions={renderRightActions}
        overshootRight={false}>
        <TouchableOpacity style={styles.convoCard} activeOpacity={0.85} onPress={() => onOpen(convo)}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.avatar}>
              <Text style={styles.avatarText}>{convo.otherUserName?.[0]?.toUpperCase()}</Text>
            </LinearGradient>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <View style={styles.convoInfo}>
            <View style={styles.convoHeader}>
              <Text style={[styles.convoName, isUnread && styles.convoNameUnread]} numberOfLines={1}>
                {convo.otherUserName}
              </Text>
              <Text style={[styles.convoTime, isUnread && styles.convoTimeUnread]}>{formatTime(convo.created_at)}</Text>
            </View>
            <View style={styles.convoMessageRow}>
              {convo.sender_id === userId && (
                <Text style={styles.convoReceipt}>{convo.is_read ? '✓✓' : '✓'}</Text>
              )}
              <Text style={[styles.convoMessage, isUnread && styles.convoMessageUnread]} numberOfLines={1}>
                {getPreviewText(convo)}
              </Text>
            </View>
          </View>
          {isUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

export default function MechanicMessagesScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const enterAnim = useRef(new Animated.Value(0)).current;

  const loadConversations = async () => {
    try {
      const myId = user?.userId;
      const [msgs, jobs] = await Promise.all([
        messageService.getConversations(myId),
        jobService.getMyJobsAsMechanic(),
      ]);
      const enriched = await Promise.all(
        msgs.map(async (msg: any) => {
          const isPartOrder = msg.job_id < 0;
          // Conversations are reused across an owner's jobs — if the job that
          // originally started this thread was since deleted, fall back to a
          // generic label instead of hiding the conversation entirely.
          const job = isPartOrder
            ? { id: msg.job_id, title: 'Part Sale', isPartOrder: true }
            : jobs.find((j: any) => j.id === msg.job_id) || { id: msg.job_id, title: 'Previous Job' };
          const otherUserId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
          let otherUserName = 'Car Owner';
          try {
            const profile = await userService.getUserById(otherUserId);
            otherUserName = profile.name;
          } catch {}
          return { ...msg, job, otherUserId, otherUserName };
        })
      );
      setConversations(enriched);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      Animated.timing(enterAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); loadConversations(); };

  const requestDelete = (convo: any) => {
    swipeableRefs.current[convo.id]?.close();
    setDeleteTarget(convo);
  };

  const confirmDelete = async () => {
    const convo = deleteTarget;
    setDeleteTarget(null);
    if (!convo) return;
    try {
      await messageService.deleteConversation(convo.job_id);
      setConversations(prev => prev.filter(c => c.job_id !== convo.job_id));
    } catch (e: any) {
      Alert.alert('Error', 'Could not delete conversation. Please try again.');
    }
  };

  const getPreviewText = (convo: any): string => {
    const isMine = convo.sender_id === user?.userId;
    let text: string;
    if (convo.message_type === 'image') text = '📷 Photo';
    else if (convo.message_type === 'audio') text = '🎤 Voice message';
    else if (convo.message_type === 'part_card') text = convo.content;
    else text = convo.content;
    return isMine ? `You: ${text}` : text;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const openChat = (convo: any) => {
    navigation.navigate('Chat', {
      job: convo.job,
      otherUserId: convo.otherUserId,
      otherUserName: convo.otherUserName,
    });
  };

  const unreadCount = conversations.filter(c => !c.is_read && c.sender_id !== user?.userId).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount > 0 ? `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}` : 'All caught up'}
        </Text>
      </LinearGradient>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={ACCENT} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          contentContainerStyle={{ paddingBottom: 130 }}>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={40} color="#9ca3af" />
              </View>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>
                Messages with car owners will appear here
              </Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
              {conversations.map((convo, index) => (
                <ConversationCard
                  key={convo.id}
                  convo={convo}
                  index={index}
                  userId={user?.userId}
                  getPreviewText={getPreviewText}
                  formatTime={formatTime}
                  onOpen={openChat}
                  onDelete={requestDelete}
                  swipeableRefs={swipeableRefs}
                />
              ))}
            </Animated.View>
          )}
        </ScrollView>
      )}
      <ConfirmDialog
        visible={!!deleteTarget}
        icon="trash-outline"
        title="Delete Conversation"
        message={`Delete your conversation with ${deleteTarget?.otherUserName}? This cannot be undone.`}
        confirmText="Delete"
        destructive
        accentColor={ACCENT}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: '#fde68a', marginTop: 2 },
  convoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.md, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avatarContainer: { position: 'relative', marginRight: SPACING.md },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
  convoInfo: { flex: 1 },
  convoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 8 },
  convoName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b', flexShrink: 1 },
  convoNameUnread: { fontWeight: '800' },
  convoTime: { fontSize: FONT_SIZES.xs, color: '#9ca3af' },
  convoTimeUnread: { color: ACCENT, fontWeight: '700' },
  convoMessageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  convoReceipt: { fontSize: FONT_SIZES.sm, color: ACCENT, fontWeight: '600' },
  convoMessage: { fontSize: FONT_SIZES.sm, color: '#6b7280', flexShrink: 1 },
  convoMessageUnread: { color: '#1b1b1b', fontWeight: '600' },
  unreadBadge: { backgroundColor: ACCENT, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
  unreadCount: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: SPACING.xl, gap: 4 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: FONT_SIZES.sm, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  deleteAction: { backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', width: 76, marginTop: SPACING.md, marginRight: SPACING.lg, borderRadius: RADIUS.md },
  deleteActionText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});