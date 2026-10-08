import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Animated, Modal, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder, useAudioPlayer, useAudioPlayerStatus,
  AudioModule, RecordingPresets, setAudioModeAsync,
} from 'expo-audio';
import CreateJobModal from '../components/CreateJobModal';
import { vehicleService } from '../services/vehicleService';
import { partsService } from '../services/partsService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { messageService, Message, JobCardMetadata, AttachmentMetadata, PartCardMetadata } from '../services/messageService';
import { jobService } from '../services/jobService';
import { paymentService } from '../services/paymentService';
import { reviewService } from '../services/reviewService';
import ConfirmDialog from '../components/ConfirmDialog';
import WalletPaymentSheet from '../components/WalletPaymentSheet';
import { AppAlertCard } from '../components/AppAlert';
import { SPACING, FONT_SIZES, RADIUS } from '../constants';
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

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const formatDuration = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
// Lives outside the component so it survives ChatScreen unmounting/remounting when
// navigating away and back — plain component state alone gets wiped on unmount.
// Resets on a full app restart, which is an acceptable scope for this.
const jobCardExpandedStore: Record<number, boolean> = {};
const partCardExpandedStore: Record<number, boolean> = {};
// ─── AnimatedActionButton: press-scale wrapper used for all job card action buttons ───
function AnimatedActionButton({ style, textStyle, icon, iconColor, label, onPress, disabled, loading }: {
  style: any;
  textStyle: any;
  icon: any;
  iconColor: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 6 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }).start();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={0.9}>
        {loading ? (
          <ActivityIndicator size="small" color={textStyle?.color === '#fff' ? '#fff' : iconColor} />
        ) : (
          <>
            <Ionicons name={icon} size={15} color={iconColor} />
            <Text style={textStyle}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── JobCardBubble: expandable job card rendered inline in the chat ───
function JobCardBubble({
  item, isMine, isOwner, myId, accentColor, onActionDone, onPaid, navigation, expanded, onToggleExpanded, onRequestDelete,
}: {
  item: Message;
  isMine: boolean;
  isOwner: boolean;
  myId: number;
  accentColor: string;
  onActionDone: (updated: Message) => void;
  onPaid: (jobId: number, mechanicId: number) => void;
  navigation: any;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRequestDelete: () => void;
}){
  const [processing, setProcessing] = useState(false);
  const [declineConfirm, setDeclineConfirm] = useState(false);
  const [proposeModal, setProposeModal] = useState(false);
  const [proposedCost, setProposedCost] = useState('');
  const [proposedNote, setProposedNote] = useState('');
  const [proposedDate, setProposedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cardAlert, setCardAlert] = useState<{ title: string; message: string } | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalCostInput, setFinalCostInput] = useState('');
const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cancelJobConfirm, setCancelJobConfirm] = useState(false);
  const [bidModal, setBidModal] = useState(false);
  const [bidCostInput, setBidCostInput] = useState('');
  const [bidNoteInput, setBidNoteInput] = useState('');

  const meta = item.metadata as JobCardMetadata;

  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    Animated.spring(entranceAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!meta) return;
    if (prevStatusRef.current !== null && prevStatusRef.current !== meta.status) {
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: false }).start();
    }
    prevStatusRef.current = meta.status;
  }, [meta?.status]);

 if (!meta) return null;
  const isDeletableCard = meta.status === 'CANCELLED' || (meta.status === 'COMPLETED' && !!meta.isPaid);
  const isPendingOriginal = meta.status === 'PENDING' && !meta.proposedByMechanicId;
  const isPendingCounter = meta.status === 'PENDING' && !!meta.proposedByMechanicId;
  const mechanicCanRespond = !isOwner && isPendingOriginal;
  const mechanicAwaitingOwner = !isOwner && isPendingCounter && meta.proposedByMechanicId === myId;
  const ownerCanRespondToCounter = isOwner && isPendingCounter;
  const ownerAwaitingMechanic = isOwner && isPendingOriginal;
  const mechanicCanStart = !isOwner && meta.status === 'ACCEPTED';
  const mechanicCanComplete = !isOwner && meta.status === 'IN_PROGRESS';
  const canNegotiatePrice = meta.status === 'COMPLETED' && !meta.isPaid;
  const hasActiveBid = canNegotiatePrice && meta.biddingByUserId != null;
  const isMyBid = hasActiveBid && meta.biddingByUserId === myId;
  const isTheirBid = hasActiveBid && !isMyBid;

  const otherPartyId = isMine ? item.receiver_id : item.sender_id;
  const chatJobId = item.job_id;

  const pushCardUpdate = async (updatedMeta: JobCardMetadata) => {
    const updated = await messageService.sendJobCard(chatJobId, myId, otherPartyId, updatedMeta);
    onActionDone(updated);
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await jobService.acceptJob(meta.jobId);
      await pushCardUpdate({ ...meta, status: 'ACCEPTED', mechanicId: myId, proposedCost: null, proposedScheduledDate: null, proposedNote: null, proposedByMechanicId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Accept', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
const handleCancelJob = async () => {
    setCancelJobConfirm(false);
    setProcessing(true);
    try {
      await jobService.cancelJob(meta.jobId);
      await pushCardUpdate({ ...meta, status: 'CANCELLED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Cancel', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleDecline = async () => {
    setDeclineConfirm(false);
    setProcessing(true);
    try {
      await jobService.declineJob(meta.jobId);
      await pushCardUpdate({ ...meta, status: 'CANCELLED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Decline', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitProposal = async () => {
    setProcessing(true);
    try {
      const payload: any = { proposedNote: proposedNote || undefined };
      if (proposedCost) payload.proposedCost = parseFloat(proposedCost);
      if (proposedDate) payload.proposedScheduledDate = proposedDate.toISOString();
      await jobService.proposeChanges(meta.jobId, payload);
      await pushCardUpdate({
        ...meta,
        proposedCost: proposedCost ? parseFloat(proposedCost) : null,
        proposedScheduledDate: proposedDate ? proposedDate.toISOString() : null,
        proposedNote: proposedNote || null,
        proposedByMechanicId: myId,
      });
      setProposeModal(false);
      setProposedCost('');
      setProposedNote('');
      setProposedDate(null);
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Send Proposal', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptCounter = async () => {
    setProcessing(true);
    try {
      const updatedJob = await jobService.acceptCounterOffer(meta.jobId);
      await pushCardUpdate({
        ...meta,
        status: 'ACCEPTED',
        estimatedCost: updatedJob.estimatedCost ?? meta.estimatedCost,
        scheduledDate: updatedJob.scheduledDate ?? meta.scheduledDate,
        proposedCost: null,
        proposedScheduledDate: null,
        proposedNote: null,
        proposedByMechanicId: null,
      });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Accept', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCounter = async () => {
    setProcessing(true);
    try {
      await jobService.rejectCounterOffer(meta.jobId);
      await pushCardUpdate({ ...meta, proposedCost: null, proposedScheduledDate: null, proposedNote: null, proposedByMechanicId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Reject', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartJob = async () => {
    setProcessing(true);
    try {
      await jobService.startJob(meta.jobId);
      await pushCardUpdate({ ...meta, status: 'IN_PROGRESS' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Start Job', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitComplete = async () => {
    if (!finalCostInput) {
      setCardAlert({ title: 'Missing Price', message: 'Please enter the final cost to complete this job.' });
      return;
    }
    setProcessing(true);
    try {
      const cost = parseFloat(finalCostInput);
      await jobService.completeJob(meta.jobId, cost);
      await pushCardUpdate({ ...meta, status: 'COMPLETED', finalCost: cost });
      setShowCompleteModal(false);
      setFinalCostInput('');
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Complete Job', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleWalletPaid = async () => {
    try {
      await pushCardUpdate({ ...meta, isPaid: true });
    } catch {
      // card update failing shouldn't block the paid state — the payment itself already succeeded
    }
    onPaid(meta.jobId, meta.mechanicId || otherPartyId);
  };

  const handleAcceptBid = async () => {
    setProcessing(true);
    try {
      const updatedJob = await jobService.acceptBid(meta.jobId);
      await pushCardUpdate({ ...meta, finalCost: updatedJob.finalCost, biddingCost: null, biddingNote: null, biddingByUserId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Accept', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineBid = async () => {
    setProcessing(true);
    try {
      await jobService.declineBid(meta.jobId);
      await pushCardUpdate({ ...meta, biddingCost: null, biddingNote: null, biddingByUserId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Decline', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!bidCostInput) {
      setCardAlert({ title: 'Missing Price', message: 'Please enter a price.' });
      return;
    }
    setProcessing(true);
    try {
      await jobService.proposeBid(meta.jobId, { biddingCost: parseFloat(bidCostInput), biddingNote: bidNoteInput || undefined });
      await pushCardUpdate({
        ...meta,
        biddingCost: parseFloat(bidCostInput),
        biddingNote: bidNoteInput || null,
        biddingByUserId: myId,
      });
      setBidModal(false);
      setBidCostInput('');
      setBidNoteInput('');
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Send Offer', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const statusColor = getStatusColor(meta.status);

  const entranceStyle = {
    opacity: entranceAnim,
    transform: [
      { scale: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
      { translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  };

  const pulseOverlayStyle = {
    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
    backgroundColor: statusColor,
  };

  return (
    <View style={[styles.jobCardWrap, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
      <Animated.View style={[styles.jobCard, entranceStyle]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pulseOverlayStyle, { borderRadius: 16 }]} />

        <TouchableOpacity
          style={styles.jobCardHeader}
          onPress={onToggleExpanded}
          onLongPress={isOwner && isDeletableCard ? onRequestDelete : undefined}
          activeOpacity={0.85}>
          <View style={styles.jobCardHeaderLeft}>
            <Ionicons name="briefcase" size={16} color={accentColor} />
            <Text style={styles.jobCardTitle} numberOfLines={1}>{meta.title}</Text>
          </View>
          <View style={styles.jobCardHeaderRight}>
            <View style={[styles.jobCardStatusBadge, { backgroundColor: statusColor + '18' }]}>
              <View style={[styles.jobCardStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.jobCardStatusText, { color: statusColor }]}>{meta.status.replace('_', ' ')}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.jobCardBody}>
            <Text style={styles.jobCardDesc}>{meta.description}</Text>
            <View style={styles.jobCardDetailRow}>
              <Ionicons name="construct-outline" size={13} color="#9ca3af" />
              <Text style={styles.jobCardDetailText}>{meta.jobType}</Text>
            </View>
            {meta.location && (
              <View style={styles.jobCardDetailRow}>
                <Ionicons name="location-outline" size={13} color="#9ca3af" />
                <Text style={styles.jobCardDetailText} numberOfLines={1}>{meta.location}</Text>
              </View>
            )}
            {meta.scheduledDate && (
              <View style={styles.jobCardDetailRow}>
                <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                <Text style={styles.jobCardDetailText}>{formatDate(meta.scheduledDate)}</Text>
              </View>
            )}
            {(meta.estimatedCost || meta.finalCost) && (
              <View style={styles.jobCardDetailRow}>
                <Ionicons name="cash-outline" size={13} color="#9ca3af" />
                <Text style={styles.jobCardDetailText}>
                  {meta.finalCost ? `Final: GHS ${meta.finalCost}` : `Est: GHS ${meta.estimatedCost}`}
                </Text>
              </View>
            )}

            {isPendingCounter && (
              <View style={styles.counterOfferBox}>
                <Text style={styles.counterOfferTitle}>
                  {meta.proposedByMechanicId === myId ? 'Your proposed changes' : 'Proposed changes'}
                </Text>
                {meta.proposedCost != null && (
                  <Text style={styles.counterOfferLine}>💰 New price: GHS {meta.proposedCost}</Text>
                )}
                {meta.proposedScheduledDate && (
                  <Text style={styles.counterOfferLine}>📅 New time: {formatDate(meta.proposedScheduledDate)}</Text>
                )}
                {meta.proposedNote && (
                  <Text style={styles.counterOfferLine}>📝 {meta.proposedNote}</Text>
                )}
              </View>
            )}

            {mechanicAwaitingOwner && (
              <Text style={styles.awaitingText}>Waiting for the owner to respond to your proposal…</Text>
            )}
            {ownerAwaitingMechanic && (
              <Text style={styles.awaitingText}>Waiting for the mechanic to respond…</Text>
            )}
            {isOwner && meta.status === 'PENDING' && (
              <View style={styles.jobCardActionsFullRow}>
                <AnimatedActionButton
                  style={styles.declineBtn}
                  textStyle={styles.declineBtnText}
                  icon="close-circle-outline"
                  iconColor="#dc2626"
                  label="Cancel Job"
                  onPress={() => setCancelJobConfirm(true)}
                  disabled={processing}
                />
              </View>
            )}

            {mechanicCanRespond && (
              <View style={styles.jobCardActionsStack}>
                <View style={styles.jobCardActionsFullRow}>
                  <AnimatedActionButton
                    style={styles.acceptBtn}
                    textStyle={styles.acceptBtnText}
                    icon="checkmark"
                    iconColor="#fff"
                    label="Accept Job"
                    onPress={handleAccept}
                    disabled={processing}
                    loading={processing}
                  />
                </View>
                <View style={styles.jobCardActions}>
                  <AnimatedActionButton
                    style={styles.changesBtn}
                    textStyle={styles.changesBtnText}
                    icon="create-outline"
                    iconColor="#7c3aed"
                    label="Changes"
                    onPress={() => setProposeModal(true)}
                    disabled={processing}
                  />
                  <AnimatedActionButton
                    style={styles.declineBtn}
                    textStyle={styles.declineBtnText}
                    icon="close"
                    iconColor="#dc2626"
                    label="Decline"
                    onPress={() => setDeclineConfirm(true)}
                    disabled={processing}
                  />
                </View>
              </View>
            )}

            {ownerCanRespondToCounter && (
              <View style={styles.jobCardActions}>
                <AnimatedActionButton
                  style={styles.acceptBtn}
                  textStyle={styles.acceptBtnText}
                  icon="checkmark"
                  iconColor="#fff"
                  label="Accept Offer"
                  onPress={handleAcceptCounter}
                  disabled={processing}
                  loading={processing}
                />
                <AnimatedActionButton
                  style={styles.declineBtn}
                  textStyle={styles.declineBtnText}
                  icon="close"
                  iconColor="#dc2626"
                  label="Reject"
                  onPress={handleRejectCounter}
                  disabled={processing}
                />
              </View>
            )}

            {mechanicCanStart && (
              <View style={styles.jobCardActionsFullRow}>
                <AnimatedActionButton
                  style={styles.startBtn}
                  textStyle={styles.startBtnText}
                  icon="play"
                  iconColor="#fff"
                  label="Start Job"
                  onPress={handleStartJob}
                  disabled={processing}
                  loading={processing}
                />
              </View>
            )}

            {mechanicCanComplete && (
              <View style={styles.jobCardActionsFullRow}>
                <AnimatedActionButton
                  style={styles.completeBtn}
                  textStyle={styles.completeBtnText}
                  icon="checkmark-done"
                  iconColor="#fff"
                  label="Mark as Completed"
                  onPress={() => setShowCompleteModal(true)}
                  disabled={processing}
                />
              </View>
            )}

            {meta.status === 'COMPLETED' && meta.isPaid && (
              <View style={styles.paidBadgeChat}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.paidBadgeChatText}>Paid</Text>
              </View>
            )}

            {isOwner && meta.status === 'COMPLETED' && !meta.isPaid && (
              <View style={styles.jobCardActionsFullRow}>
                <AnimatedActionButton
                  style={styles.payBtnCard}
                  textStyle={styles.payBtnCardText}
                  icon="card"
                  iconColor="#fff"
                  label={`Pay GHS ${meta.finalCost || 0}`}
                  onPress={() => setShowPaymentModal(true)}
                  disabled={processing}
                />
              </View>
            )}

            {canNegotiatePrice && (
              <View style={styles.biddingSection}>
                {hasActiveBid ? (
                  isMyBid ? (
                    <View style={styles.counterOfferBox}>
                      <Text style={styles.counterOfferTitle}>Your price offer</Text>
                      <Text style={styles.counterOfferLine}>💰 GHS {meta.biddingCost}</Text>
                      {meta.biddingNote && <Text style={styles.counterOfferLine}>📝 {meta.biddingNote}</Text>}
                      <Text style={styles.awaitingText}>Waiting for the other party to respond…</Text>
                    </View>
                  ) : (
                    <View style={styles.counterOfferBox}>
                      <Text style={styles.counterOfferTitle}>New price offer</Text>
                      <Text style={styles.counterOfferLine}>💰 GHS {meta.biddingCost}</Text>
                      {meta.biddingNote && <Text style={styles.counterOfferLine}>📝 {meta.biddingNote}</Text>}
                      <View style={styles.jobCardActionsStack}>
                        <View style={styles.jobCardActionsFullRow}>
                          <AnimatedActionButton
                            style={styles.acceptBtn}
                            textStyle={styles.acceptBtnText}
                            icon="checkmark"
                            iconColor="#fff"
                            label="Accept Price"
                            onPress={handleAcceptBid}
                            disabled={processing}
                            loading={processing}
                          />
                        </View>
                        <View style={styles.jobCardActions}>
                          <AnimatedActionButton
                            style={styles.changesBtn}
                            textStyle={styles.changesBtnText}
                            icon="create-outline"
                            iconColor="#7c3aed"
                            label="Counter"
                            onPress={() => setBidModal(true)}
                            disabled={processing}
                          />
                          <AnimatedActionButton
                            style={styles.declineBtn}
                            textStyle={styles.declineBtnText}
                            icon="close"
                            iconColor="#dc2626"
                            label="Decline"
                            onPress={handleDeclineBid}
                            disabled={processing}
                          />
                        </View>
                      </View>
                    </View>
                  )
                ) : (
                  <View style={styles.jobCardActionsFullRow}>
                    <AnimatedActionButton
                      style={styles.bidBtn}
                      textStyle={styles.bidBtnText}
                      icon="pricetag-outline"
                      iconColor="#7c3aed"
                      label="Propose New Price"
                      onPress={() => setBidModal(true)}
                      disabled={processing}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <Modal visible={proposeModal} transparent animationType="fade" onRequestClose={() => !processing && setProposeModal(false)}>
          <View style={styles.cardOverlay}>
            <View style={styles.proposeCard}>
              <Text style={styles.proposeTitle}>Propose Changes</Text>
              <Text style={styles.proposeLabel}>New Price (GHS)</Text>
              <TextInput
                style={styles.proposeInput}
                placeholder="e.g. 350"
                keyboardType="numeric"
                value={proposedCost}
                onChangeText={t => setProposedCost(t.replace(/[^0-9.]/g, ''))}
              />
              <Text style={styles.proposeLabel}>New Date & Time</Text>
              <TouchableOpacity style={styles.proposeDateBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={15} color="#7c3aed" />
                <Text style={styles.proposeDateBtnText}>{proposedDate ? formatDate(proposedDate.toISOString()) : 'Optional — tap to set'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={proposedDate || new Date()}
                  mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  themeVariant="light"
                  textColor="#1b1b1b"
                  onChange={(e, selected) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selected) setProposedDate(selected);
                  }}
                />
              )}
              <Text style={styles.proposeLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.proposeInput, styles.proposeTextArea]}
                placeholder="Explain the change..."
                multiline
                numberOfLines={2}
                value={proposedNote}
                onChangeText={setProposedNote}
              />
              <View style={styles.proposeActionsRow}>
                <TouchableOpacity style={styles.proposeCancelBtn} onPress={() => setProposeModal(false)} disabled={processing}>
                  <Text style={styles.proposeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proposeSubmitBtn} onPress={handleSubmitProposal} disabled={processing} activeOpacity={0.85}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.proposeSubmitText}>Send</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showCompleteModal} transparent animationType="fade" onRequestClose={() => !processing && setShowCompleteModal(false)}>
          <View style={styles.cardOverlay}>
            <View style={styles.proposeCard}>
              <Text style={styles.proposeTitle}>Complete Job</Text>
              <Text style={styles.proposeLabel}>Final Price (GHS) *</Text>
              <TextInput
                style={styles.proposeInput}
                placeholder="e.g. 350"
                keyboardType="numeric"
                value={finalCostInput}
                onChangeText={t => setFinalCostInput(t.replace(/[^0-9.]/g, ''))}
                autoFocus
              />
              <View style={styles.proposeActionsRow}>
                <TouchableOpacity style={styles.proposeCancelBtn} onPress={() => setShowCompleteModal(false)} disabled={processing}>
                  <Text style={styles.proposeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proposeSubmitBtn} onPress={handleSubmitComplete} disabled={processing} activeOpacity={0.85}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.proposeSubmitText}>Complete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={bidModal} transparent animationType="fade" onRequestClose={() => !processing && setBidModal(false)}>
          <View style={styles.cardOverlay}>
            <View style={styles.proposeCard}>
              <Text style={styles.proposeTitle}>Propose a Price</Text>
              <Text style={styles.proposeLabel}>Price (GHS) *</Text>
              <TextInput
                style={styles.proposeInput}
                placeholder="e.g. 300"
                keyboardType="numeric"
                value={bidCostInput}
                onChangeText={t => setBidCostInput(t.replace(/[^0-9.]/g, ''))}
                autoFocus
              />
              <Text style={styles.proposeLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.proposeInput, styles.proposeTextArea]}
                placeholder="Explain your offer..."
                multiline
                numberOfLines={2}
                value={bidNoteInput}
                onChangeText={setBidNoteInput}
              />
              <View style={styles.proposeActionsRow}>
                <TouchableOpacity style={styles.proposeCancelBtn} onPress={() => setBidModal(false)} disabled={processing}>
                  <Text style={styles.proposeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proposeSubmitBtn} onPress={handleSubmitBid} disabled={processing} activeOpacity={0.85}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.proposeSubmitText}>Send Offer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ConfirmDialog
          visible={declineConfirm}
          icon="close-circle-outline"
          title="Decline This Job"
          message="This will cancel the job request. The owner will be notified."
          confirmText="Decline"
          destructive
          onConfirm={handleDecline}
          onCancel={() => setDeclineConfirm(false)}
        />
<ConfirmDialog
          visible={cancelJobConfirm}
          icon="close-circle-outline"
          title="Cancel Job"
          message={`Are you sure you want to cancel "${meta.title}"?`}
          confirmText="Yes, Cancel"
          cancelText="No"
          destructive
          onConfirm={handleCancelJob}
          onCancel={() => setCancelJobConfirm(false)}
        />
        <Modal visible={!!cardAlert} transparent animationType="fade" onRequestClose={() => setCardAlert(null)}>
          <View style={styles.cardOverlay}>
            {cardAlert && (
              <AppAlertCard
                type="error"
                title={cardAlert.title}
                message={cardAlert.message}
                onClose={() => setCardAlert(null)}
              />
            )}
          </View>
        </Modal>

        <WalletPaymentSheet
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          navigation={navigation}
          jobId={meta.jobId}
          jobTitle={meta.title}
          payeeId={meta.mechanicId || otherPartyId}
          amount={meta.finalCost || 0}
          accentColor={accentColor}
          onPaid={handleWalletPaid}
        />
      </Animated.View>
    </View>
  );
}
// ─── PartCardBubble: expandable part-order card rendered inline in the chat ───
function PartCardBubble({
  item, isMine, isOwner, myId, accentColor, onActionDone, navigation, expanded, onToggleExpanded, onRequestDelete,
}: {
  item: Message;
  isMine: boolean;
  isOwner: boolean;
  myId: number;
  accentColor: string;
  onActionDone: (updated: Message) => void;
  navigation: any;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRequestDelete: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [cardAlert, setCardAlert] = useState<{ title: string; message: string } | null>(null);
  const [declineConfirm, setDeclineConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [offerModal, setOfferModal] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const meta = item.metadata as PartCardMetadata;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    Animated.spring(entranceAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, []);
  useEffect(() => {
    if (!meta) return;
    if (prevStatusRef.current !== null && prevStatusRef.current !== meta.status) {
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: false }).start();
    }
    prevStatusRef.current = meta.status;
  }, [meta?.status]);
  if (!meta) return null;
  const isDeletableCard = meta.status === 'DECLINED' || meta.status === 'CANCELLED' || (meta.status === 'COMPLETED' && !!meta.isPaid);
  const hasProposal = meta.proposedPrice != null;
  const isMyProposal = hasProposal && meta.proposedByUserId === myId;
  const sellerCanRespondToOrder = !isOwner && meta.status === 'PENDING';
  const buyerCanCancel = isOwner && meta.status === 'PENDING';
  const canNegotiate = meta.status === 'PENDING' && !hasProposal;
  const otherPartyId = isMine ? item.receiver_id : item.sender_id;
  const chatJobId = item.job_id;
  const pushCardUpdate = async (updatedMeta: PartCardMetadata) => {
    const updated = await messageService.sendPartCard(chatJobId, myId, otherPartyId, updatedMeta);
    onActionDone(updated);
  };
  const handleAcceptOrder = async () => {
    setProcessing(true);
    try {
      await partsService.acceptOrder(meta.orderId);
      await pushCardUpdate({ ...meta, status: 'ACCEPTED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Accept', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleDeclineOrder = async () => {
    setDeclineConfirm(false);
    setProcessing(true);
    try {
      await partsService.declineOrder(meta.orderId);
      await pushCardUpdate({ ...meta, status: 'DECLINED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Decline', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleCancelOrder = async () => {
    setCancelConfirm(false);
    setProcessing(true);
    try {
      await partsService.cancelOrder(meta.orderId);
      await pushCardUpdate({ ...meta, status: 'CANCELLED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Cancel', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleMarkSold = async () => {
    setProcessing(true);
    try {
      await partsService.completeOrder(meta.orderId);
      await pushCardUpdate({ ...meta, status: 'COMPLETED' });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Complete', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleSubmitOffer = async () => {
    const parsed = parseFloat(offerInput);
    if (!offerInput || isNaN(parsed) || parsed <= 0) {
      setCardAlert({ title: 'Invalid Price', message: 'Please enter a valid positive number.' });
      return;
    }
    setProcessing(true);
    try {
      await partsService.proposePartPrice(meta.orderId, parsed);
      await pushCardUpdate({ ...meta, proposedPrice: parsed, proposedByUserId: myId });
      setOfferModal(false);
      setOfferInput('');
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Send Offer', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleAcceptOffer = async () => {
    setProcessing(true);
    try {
      await partsService.acceptProposedPartPrice(meta.orderId);
      await pushCardUpdate({ ...meta, price: meta.proposedPrice!, proposedPrice: null, proposedByUserId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Accept', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleRejectOffer = async () => {
    setProcessing(true);
    try {
      await partsService.rejectProposedPartPrice(meta.orderId);
      await pushCardUpdate({ ...meta, proposedPrice: null, proposedByUserId: null });
    } catch (e: any) {
      setCardAlert({ title: 'Could Not Reject', message: e.message || 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };
  const handleWalletPaid = async () => {
    try {
      await pushCardUpdate({ ...meta, isPaid: true });
    } catch {
      // card update failing shouldn't block the paid state — the payment itself already succeeded
    }
  };
  const statusColor = getStatusColor(
    meta.status === 'ACCEPTED' ? 'ACCEPTED' :
    meta.status === 'COMPLETED' ? 'COMPLETED' :
    meta.status === 'DECLINED' || meta.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING'
  );
  const entranceStyle = {
    opacity: entranceAnim,
    transform: [
      { scale: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
      { translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  };
  const pulseOverlayStyle = {
    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
    backgroundColor: statusColor,
  };
  return (
    <View style={[styles.jobCardWrap, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
      <Animated.View style={[styles.jobCard, entranceStyle]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pulseOverlayStyle, { borderRadius: 16 }]} />
        <TouchableOpacity
          style={styles.jobCardHeader}
          onPress={onToggleExpanded}
          onLongPress={isOwner && isDeletableCard ? onRequestDelete : undefined}
          activeOpacity={0.85}>
          <View style={styles.jobCardHeaderLeft}>
            <Ionicons name="cube" size={16} color={accentColor} />
            <Text style={styles.jobCardTitle} numberOfLines={1}>{meta.partName}</Text>
          </View>
          <View style={styles.jobCardHeaderRight}>
            <View style={[styles.jobCardStatusBadge, { backgroundColor: statusColor + '18' }]}>
              <View style={[styles.jobCardStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.jobCardStatusText, { color: statusColor }]}>
                {meta.status === 'ACCEPTED' ? 'RESERVED' : meta.status}
              </Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>
        {expanded && (
          <View style={styles.jobCardBody}>
            {meta.imageUrl && (
              <Image source={{ uri: meta.imageUrl }} style={styles.partCardImage} />
            )}
            <View style={styles.jobCardDetailRow}>
              <Ionicons name="cash-outline" size={13} color="#9ca3af" />
              <Text style={styles.jobCardDetailText}>Price: GHS {meta.price}</Text>
            </View>
            {hasProposal && (
              <View style={styles.counterOfferBox}>
                <Text style={styles.counterOfferTitle}>
                  {isMyProposal ? 'Your price offer' : 'New price offer'}
                </Text>
                <Text style={styles.counterOfferLine}>💰 GHS {meta.proposedPrice}</Text>
                {isMyProposal ? (
                  <Text style={styles.awaitingText}>Waiting for the other party to respond…</Text>
                ) : (
                  <View style={styles.jobCardActions}>
                    <AnimatedActionButton
                      style={styles.acceptBtn}
                      textStyle={styles.acceptBtnText}
                      icon="checkmark"
                      iconColor="#fff"
                      label="Accept"
                      onPress={handleAcceptOffer}
                      disabled={processing}
                      loading={processing}
                    />
                    <AnimatedActionButton
                      style={styles.declineBtn}
                      textStyle={styles.declineBtnText}
                      icon="close"
                      iconColor="#dc2626"
                      label="Reject"
                      onPress={handleRejectOffer}
                      disabled={processing}
                    />
                  </View>
                )}
              </View>
            )}
            {sellerCanRespondToOrder && (
              <View style={styles.jobCardActionsStack}>
                <View style={styles.jobCardActionsFullRow}>
                  <AnimatedActionButton
                    style={styles.acceptBtn}
                    textStyle={styles.acceptBtnText}
                    icon="checkmark"
                    iconColor="#fff"
                    label="Accept Order"
                    onPress={handleAcceptOrder}
                    disabled={processing}
                    loading={processing}
                  />
                </View>
                <View style={styles.jobCardActions}>
                  {canNegotiate && (
                    <AnimatedActionButton
                      style={styles.changesBtn}
                      textStyle={styles.changesBtnText}
                      icon="pricetag-outline"
                      iconColor="#7c3aed"
                      label="Propose Price"
                      onPress={() => setOfferModal(true)}
                      disabled={processing}
                    />
                  )}
                  <AnimatedActionButton
                    style={styles.declineBtn}
                    textStyle={styles.declineBtnText}
                    icon="close"
                    iconColor="#dc2626"
                    label="Decline"
                    onPress={() => setDeclineConfirm(true)}
                    disabled={processing}
                  />
                </View>
              </View>
            )}
            {buyerCanCancel && (
              <View style={styles.jobCardActionsStack}>
                <Text style={styles.awaitingText}>Waiting for the seller to respond…</Text>
                <View style={styles.jobCardActions}>
                  {canNegotiate && (
                    <AnimatedActionButton
                      style={styles.changesBtn}
                      textStyle={styles.changesBtnText}
                      icon="pricetag-outline"
                      iconColor="#7c3aed"
                      label="Propose Price"
                      onPress={() => setOfferModal(true)}
                      disabled={processing}
                    />
                  )}
                  <AnimatedActionButton
                    style={styles.declineBtn}
                    textStyle={styles.declineBtnText}
                    icon="close"
                    iconColor="#dc2626"
                    label="Cancel Order"
                    onPress={() => setCancelConfirm(true)}
                    disabled={processing}
                  />
                </View>
              </View>
            )}
            {meta.status === 'ACCEPTED' && !isOwner && !meta.isPaid && (
  <Text style={styles.awaitingText}>Reserved — waiting for the buyer to pay…</Text>
)}
{meta.status === 'ACCEPTED' && !isOwner && meta.isPaid && (
  <View style={styles.jobCardActionsFullRow}>
    <AnimatedActionButton
      style={styles.completeBtn}
      textStyle={styles.completeBtnText}
      icon="checkmark-done"
      iconColor="#fff"
      label="Mark as Sold"
      onPress={handleMarkSold}
      disabled={processing}
      loading={processing}
    />
  </View>
)}
{meta.status === 'ACCEPTED' && isOwner && !meta.isPaid && (
  <View style={styles.jobCardActionsFullRow}>
    <AnimatedActionButton
      style={styles.payBtnCard}
      textStyle={styles.payBtnCardText}
      icon="card"
      iconColor="#fff"
      label={`Pay GHS ${meta.price}`}
      onPress={() => setShowPaymentModal(true)}
      disabled={processing}
    />
  </View>
)}
{meta.status === 'ACCEPTED' && isOwner && meta.isPaid && (
  <View style={styles.paidBadgeChat}>
    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
    <Text style={styles.paidBadgeChatText}>Paid — waiting for seller to mark as sold</Text>
  </View>
)}
            {meta.status === 'COMPLETED' && meta.isPaid && (
              <View style={styles.paidBadgeChat}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.paidBadgeChatText}>Paid</Text>
              </View>
            )}
            {isOwner && meta.status === 'COMPLETED' && !meta.isPaid && (
              <View style={styles.jobCardActionsFullRow}>
                <AnimatedActionButton
                  style={styles.payBtnCard}
                  textStyle={styles.payBtnCardText}
                  icon="card"
                  iconColor="#fff"
                  label={`Pay GHS ${meta.price}`}
                  onPress={() => setShowPaymentModal(true)}
                  disabled={processing}
                />
              </View>
            )}
            {!isOwner && meta.status === 'COMPLETED' && !meta.isPaid && (
              <Text style={styles.awaitingText}>Sold — waiting for payment…</Text>
            )}
          </View>
        )}
        <Modal visible={offerModal} transparent animationType="fade" onRequestClose={() => !processing && setOfferModal(false)}>
          <View style={styles.cardOverlay}>
            <View style={styles.proposeCard}>
              <Text style={styles.proposeTitle}>Propose a Price</Text>
              <Text style={styles.proposeLabel}>Price (GHS) *</Text>
              <TextInput
                style={styles.proposeInput}
                placeholder="e.g. 350"
                keyboardType="numeric"
                value={offerInput}
                onChangeText={t => setOfferInput(t.replace(/[^0-9.]/g, ''))}
                autoFocus
              />
              <View style={styles.proposeActionsRow}>
                <TouchableOpacity style={styles.proposeCancelBtn} onPress={() => setOfferModal(false)} disabled={processing}>
                  <Text style={styles.proposeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proposeSubmitBtn} onPress={handleSubmitOffer} disabled={processing} activeOpacity={0.85}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.proposeSubmitText}>Send Offer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <ConfirmDialog
          visible={declineConfirm}
          icon="close-circle-outline"
          title="Decline This Order"
          message="This will decline the buyer's order request."
          confirmText="Decline"
          destructive
          onConfirm={handleDeclineOrder}
          onCancel={() => setDeclineConfirm(false)}
        />
        <ConfirmDialog
          visible={cancelConfirm}
          icon="close-circle-outline"
          title="Cancel Order"
          message="Are you sure you want to cancel this order?"
          confirmText="Yes, Cancel"
          destructive
          onConfirm={handleCancelOrder}
          onCancel={() => setCancelConfirm(false)}
        />
        <Modal visible={!!cardAlert} transparent animationType="fade" onRequestClose={() => setCardAlert(null)}>
          <View style={styles.cardOverlay}>
            {cardAlert && (
              <AppAlertCard
                type="error"
                title={cardAlert.title}
                message={cardAlert.message}
                onClose={() => setCardAlert(null)}
              />
            )}
          </View>
        </Modal>
        <WalletPaymentSheet
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          navigation={navigation}
          jobId={-meta.orderId}
          jobTitle={meta.partName}
          payeeId={meta.sellerId}
          amount={meta.price}
          accentColor={accentColor}
          onPaid={handleWalletPaid}
        />
      </Animated.View>
    </View>
  );
}
// ─── AudioMessageBubble: playback bubble for voice note messages ───
function AudioMessageBubble({ url, durationSeconds, isMine, onLongPress }: {
  url: string;
  durationSeconds?: number;
  isMine: boolean;
  onLongPress: () => void;
}) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const knownDuration = status.duration || durationSeconds || 0;
  const displaySeconds = status.currentTime > 0 ? status.currentTime : knownDuration;
  const progress = knownDuration > 0 ? Math.min(1, status.currentTime / knownDuration) : 0;

  const handlePress = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // expo-audio doesn't auto-reset position after finishing playback, unlike expo-av —
    // seek back to start manually if we're at (or past) the end before replaying.
    if (knownDuration > 0 && status.currentTime >= knownDuration - 0.15) {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[styles.audioBubble, isMine ? styles.audioBubbleMine : styles.audioBubbleTheirs]}>
      <Ionicons
        name={status.playing ? 'pause-circle' : 'play-circle'}
        size={34}
        color={isMine ? '#fff' : '#1b4332'}
      />
      <View style={styles.audioProgressTrack}>
        <View style={[styles.audioProgressFill, { width: `${progress * 100}%`, backgroundColor: isMine ? '#fff' : '#1b4332' }]} />
      </View>
      <Text style={[styles.audioDurationText, { color: isMine ? '#fff' : '#1b1b1b' }]}>
        {formatDuration(displaySeconds)}
      </Text>
    </TouchableOpacity>
  );
}
// ─── AudioPreviewPlayer: playback control shown in the send-confirmation modal ───
function AudioPreviewPlayer({ uri, accentColor }: { uri: string; accentColor: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  const handlePress = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && status.currentTime >= duration - 0.15) {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <View style={styles.audioPreviewPlayerRow}>
      <TouchableOpacity onPress={handlePress}>
        <Ionicons name={status.playing ? 'pause-circle' : 'play-circle'} size={48} color={accentColor} />
      </TouchableOpacity>
      <View style={styles.audioProgressTrack}>
        <View style={[styles.audioProgressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
      </View>
      <Text style={styles.audioPreviewDurationText}>{formatDuration(status.currentTime || duration)}</Text>
    </View>
  );
}
export default function ChatScreen({ route, navigation }: any) {
  const { job, otherUserId, otherUserName } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const pendingAttachActionRef = useRef<(() => void) | null>(null);

  // Modal's onDismiss only fires on iOS, so Android needs its own path to trigger
  // the pending action (camera/library/recording) after the attach menu closes.
  // Android doesn't share iOS's native-modal-presentation conflict, so a short
  // delay here is reliable — unlike on iOS, where a fixed delay alone wasn't enough.
  const triggerAttachAction = (action: () => void) => {
    pendingAttachActionRef.current = action;
    setAttachMenuVisible(false);
    if (Platform.OS === 'android') {
      setTimeout(() => {
        const pending = pendingAttachActionRef.current;
        pendingAttachActionRef.current = null;
        if (pending) pending();
      }, 300);
    }
  };
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [sendingPreview, setSendingPreview] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  // Keyed by the stable jobId (not the message's own id, which changes every time
  // sendJobCard deletes-and-reinserts the row) so collapse/expand survives job card updates.
  const [expandedJobCards, setExpandedJobCards] = useState<Record<number, boolean>>(() => ({ ...jobCardExpandedStore }));
  const [expandedPartCards, setExpandedPartCards] = useState<Record<number, boolean>>(() => ({ ...partCardExpandedStore }));
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);
  const [pendingAudioDuration, setPendingAudioDuration] = useState(0);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [createJobModalVisible, setCreateJobModalVisible] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const [reviewTarget, setReviewTarget] = useState<{ jobId: number; mechanicId: number } | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const myId = user?.userId;
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    return () => {
      if (channelRef.current) {
        messageService.unsubscribe(channelRef.current);
      }
    };
  }, []);

  const loadMessages = async () => {
    try {
      const data = await messageService.getMessages(job.id);
      setMessages(data);
      await messageService.markAsRead(job.id, myId);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      // Scheduled aIt fter setLoading(false) rather than before — the FlatList only
      // mounts once loading is false, so scrolling it any earlier hits a null ref
      // and silently does nothing.
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  };

  const upsertJobCard = (message: Message) => {
    setMessages(prev => [
      ...prev.filter(m => !(m.message_type === 'job_card' && (m.metadata as JobCardMetadata)?.jobId === (message.metadata as JobCardMetadata)?.jobId)),
      message,
    ]);
    flatListRef.current?.scrollToEnd({ animated: true });
  };
  const upsertPartCard = (message: Message) => {
    setMessages(prev => [
      ...prev.filter(m => !(m.message_type === 'part_card' && (m.metadata as PartCardMetadata)?.orderId === (message.metadata as PartCardMetadata)?.orderId)),
      message,
    ]);
    flatListRef.current?.scrollToEnd({ animated: true });
  };
  const subscribeToMessages = () => {
    channelRef.current = messageService.subscribeToMessages(job.id, (message: any) => {
      if (message._deleted) {
        setMessages(prev => prev.filter(m => m.id !== message.id));
        return;
      }
      if (message.message_type === 'job_card') {
        upsertJobCard(message);
        return;
      }
      if (message.message_type === 'part_card') {
        upsertPartCard(message);
        return;
      }
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === message.id);
        if (idx !== -1) {
          // An update to an existing row (e.g. is_read flipping to true) — replace
          // it in place rather than silently dropping it, which is what the old
          // "already exists, do nothing" logic did.
          const updated = [...prev];
          updated[idx] = message;
          return updated;
        }
        return [...prev, message];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const sent = await messageService.sendMessage(job.id, myId, otherUserId, content);
      setMessages(prev => {
        const exists = prev.find(m => m.id === sent.id);
        if (exists) return prev;
        return [...prev, sent];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };
const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to send an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPendingImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPendingImageUri(result.assets[0].uri);
  };

  const cancelImagePreview = () => setPendingImageUri(null);

  const confirmSendImage = async () => {
    if (!pendingImageUri) return;
    setSendingPreview(true);
    try {
      const url = await messageService.uploadAttachment(pendingImageUri, 'image');
      const sent = await messageService.sendAttachmentMessage(job.id, myId, otherUserId, url, 'image');
      setMessages(prev => {
        const exists = prev.find(m => m.id === sent.id);
        if (exists) return prev;
        return [...prev, sent];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
      setPendingImageUri(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send photo. Please try again.');
    } finally {
      setSendingPreview(false);
    }
  };
  const openCreateJob = async () => {
    setCreateJobModalVisible(true);
    if (vehicles.length === 0) {
      try {
        const data = await vehicleService.getMyVehicles();
        setVehicles(data);
      } catch {
        // If this fails, CreateJobModal's own "no vehicles" state will show — not fatal
      }
    }
  };
  const startRecording = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow microphone access to record a voice note.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };
  const cancelRecording = async () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    try {
      await audioRecorder.stop();
    } catch {
      // already stopped or never started — safe to ignore
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };
  const stopAndPreviewRecording = async () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    const finishedSeconds = recordingSeconds;
    await audioRecorder.stop();
    setIsRecording(false);
    const uri = audioRecorder.uri;
    if (uri) {
      setPendingAudioUri(uri);
      setPendingAudioDuration(finishedSeconds);
    }
  };
  const cancelAudioPreview = () => {
    setPendingAudioUri(null);
    setPendingAudioDuration(0);
  };
  const confirmSendAudio = async () => {
    if (!pendingAudioUri) return;
    setSendingAudio(true);
    try {
      const url = await messageService.uploadAttachment(pendingAudioUri, 'audio');
      const sent = await messageService.sendAttachmentMessage(
        job.id, myId, otherUserId, url, 'audio', { durationSeconds: pendingAudioDuration }
      );
      setMessages(prev => {
        const exists = prev.find(m => m.id === sent.id);
        if (exists) return prev;
        return [...prev, sent];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
      setPendingAudioUri(null);
      setPendingAudioDuration(0);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send voice note. Please try again.');
    } finally {
      setSendingAudio(false);
    }
  };
  const handleDeleteMessage = async () => {
    if (!deleteTarget) return;
    setDeletingMessage(true);
    try {
      await messageService.deleteMessage(deleteTarget);
      setMessages(prev => prev.filter(m => m.id !== deleteTarget));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not delete this message.');
    } finally {
      setDeletingMessage(false);
      setDeleteTarget(null);
    }
  };
  const handleSubmitReview = async () => {
    if (!reviewTarget || selectedRating === 0) return;
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        jobId: reviewTarget.jobId,
        revieweeId: reviewTarget.mechanicId,
        rating: selectedRating,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      setTimeout(() => {
        setReviewTarget(null);
        setReviewSubmitted(false);
        setSelectedRating(0);
        setReviewComment('');
      }, 1500);
    } catch (e: any) {
      setReviewTarget(null);
      setSelectedRating(0);
      setReviewComment('');
      if (!e.message?.toLowerCase().includes('already reviewed') && !e.message?.includes('Unexpected end of input')) {
        Alert.alert('Error', e.message);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const accentColor = isOwner ? '#1b4332' : '#000814';

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === myId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMsg ||
      new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    if (item.message_type === 'job_card') {
      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short'
                })}
              </Text>
            </View>
          )}
          <JobCardBubble
            item={item}
            isMine={isMine}
            isOwner={isOwner}
            myId={myId}
            accentColor={accentColor}
            onActionDone={upsertJobCard}
            onPaid={(jobId, mechanicId) => setReviewTarget({ jobId, mechanicId })}
            navigation={navigation}
            onRequestDelete={() => setDeleteTarget(item.id)}
            expanded={expandedJobCards[(item.metadata as JobCardMetadata)?.jobId] ?? true}
            onToggleExpanded={() => {
              const jobId = (item.metadata as JobCardMetadata)?.jobId;
              if (jobId == null) return;
              setExpandedJobCards(prev => {
                const next = { ...prev, [jobId]: !(prev[jobId] ?? true) };
                jobCardExpandedStore[jobId] = next[jobId];
                return next;
              });
            }}
          />
        </>
      );
    }
    if (item.message_type === 'part_card') {
      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short'
                })}
              </Text>
            </View>
          )}
          <PartCardBubble
            item={item}
            isMine={isMine}
            isOwner={isOwner}
            myId={myId}
            accentColor={accentColor}
            onActionDone={upsertPartCard}
            navigation={navigation}
            onRequestDelete={() => setDeleteTarget(item.id)}
            expanded={expandedPartCards[(item.metadata as PartCardMetadata)?.orderId] ?? true}
            onToggleExpanded={() => {
              const orderId = (item.metadata as PartCardMetadata)?.orderId;
              if (orderId == null) return;
              setExpandedPartCards(prev => {
                const next = { ...prev, [orderId]: !(prev[orderId] ?? true) };
                partCardExpandedStore[orderId] = next[orderId];
                return next;
              });
            }}
          />
        </>
      );
    }
    if (item.message_type === 'image') {
      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short'
                })}
              </Text>
            </View>
          )}
          <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setViewerImageUrl(item.content)}
              onLongPress={() => isMine && setDeleteTarget(item.id)}>
              <Image source={{ uri: item.content }} style={styles.imageBubble} />
            </TouchableOpacity>
          </View>
        </>
      );
    }
    if (item.message_type === 'audio') {
      const durationSeconds = (item.metadata as AttachmentMetadata | null)?.durationSeconds;
      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short'
                })}
              </Text>
            </View>
          )}
          <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
            <AudioMessageBubble
              url={item.content}
              durationSeconds={durationSeconds}
              isMine={isMine}
              onLongPress={() => isMine && setDeleteTarget(item.id)}
            />
          </View>
        </>
      );
    }
    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {new Date(item.created_at).toLocaleDateString('en-GB', {
                weekday: 'short', day: '2-digit', month: 'short'
              })}
            </Text>
          </View>
        )}
        <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => isMine && setDeleteTarget(item.id)}
            style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {item.content}
            </Text>
            <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
              {formatTime(item.created_at)}
              {isMine && (
                <Text> {item.is_read ? '✓✓' : '✓'}</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };
  const headerColor = isOwner
    ? ['#1b4332', '#2d6a4f']
    : ['#000814', '#001D3D'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={headerColor} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{otherUserName?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{otherUserName}</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1b4332" />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSubText}>Send a message to get started</Text>
              </View>
            }
          />

          {isRecording ? (
            <View style={styles.recordingRow}>
              <TouchableOpacity style={styles.recordingCancelBtn} onPress={cancelRecording}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </TouchableOpacity>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTimeText}>{formatDuration(recordingSeconds)}</Text>
                <Text style={styles.recordingHintText}>Recording…</Text>
              </View>
              <TouchableOpacity
                style={[styles.recordingStopBtn, { backgroundColor: accentColor }]}
                onPress={stopAndPreviewRecording}>
                <Ionicons name="checkmark" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={() => setAttachMenuVisible(true)}>
                <Ionicons name="add" size={26} color={accentColor} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
                autoCorrect={true}
                spellCheck={true}
                keyboardType="default"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!newMessage.trim() || sending}>
                <LinearGradient
                  colors={isOwner ? ['#1b4332', '#2d6a4f'] : ['#000814', '#001D3D']}
                  style={styles.sendBtnGradient}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <Modal
            visible={attachMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setAttachMenuVisible(false)}
            onDismiss={() => {
              // iOS fires this only after the modal has genuinely finished closing —
              // that's the earliest safe moment to present another native UI element
              // like the image picker, avoiding the silent-failure issue we hit
              // when triggering it directly from inside the modal.
              const action = pendingAttachActionRef.current;
              pendingAttachActionRef.current = null;
              if (action) action();
            }}>
            <TouchableOpacity style={styles.attachMenuOverlay} activeOpacity={1} onPress={() => setAttachMenuVisible(false)}>
              <View style={styles.attachMenu}>
                <TouchableOpacity style={styles.attachMenuOption} onPress={() => triggerAttachAction(takePhoto)}>
                  <View style={[styles.attachMenuIconWrap, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="camera" size={20} color="#10b981" />
                  </View>
                  <Text style={styles.attachMenuText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachMenuOption} onPress={() => triggerAttachAction(pickFromLibrary)}>
                  <View style={[styles.attachMenuIconWrap, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="image" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.attachMenuText}>Choose Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachMenuOption} onPress={() => triggerAttachAction(startRecording)}>
                  <View style={[styles.attachMenuIconWrap, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="mic" size={20} color="#dc2626" />
                  </View>
                  <Text style={styles.attachMenuText}>Voice Note</Text>
                </TouchableOpacity>
                {isOwner && (
  <TouchableOpacity style={styles.attachMenuOption} onPress={() => { setAttachMenuVisible(false); openCreateJob(); }}>
    <View style={[styles.attachMenuIconWrap, { backgroundColor: '#f5f3ff' }]}>
      <Ionicons name="briefcase" size={20} color="#7c3aed" />
    </View>
    <Text style={styles.attachMenuText}>New Job</Text>
  </TouchableOpacity>
)}
              </View>
            </TouchableOpacity>
          </Modal>

          <Modal visible={!!viewerImageUrl} transparent animationType="fade" onRequestClose={() => setViewerImageUrl(null)}>
            <TouchableOpacity style={styles.imageViewerOverlay} activeOpacity={1} onPress={() => setViewerImageUrl(null)}>
              {viewerImageUrl && (
                <Image source={{ uri: viewerImageUrl }} style={styles.imageViewerFull} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </Modal>

          <Modal visible={!!pendingImageUri} transparent animationType="fade" onRequestClose={cancelImagePreview}>
            <View style={styles.imageViewerOverlay}>
              {pendingImageUri && (
                <Image source={{ uri: pendingImageUri }} style={styles.imageViewerFull} resizeMode="contain" />
              )}
              <View style={styles.previewActionsRow}>
                <TouchableOpacity style={styles.previewCancelBtn} onPress={cancelImagePreview} disabled={sendingPreview}>
                  <Ionicons name="close" size={22} color="#fff" />
                  <Text style={styles.previewBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewSendBtn, { backgroundColor: accentColor }]}
                  onPress={confirmSendImage}
                  disabled={sendingPreview}>
                  {sendingPreview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.previewBtnText}>Send</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <ConfirmDialog
            visible={!!deleteTarget}
            icon="trash-outline"
            title="Delete Message"
            message="This will permanently delete this message for everyone in the conversation."
            confirmText="Delete"
            destructive
            onConfirm={handleDeleteMessage}
            onCancel={() => setDeleteTarget(null)}
          />
<CreateJobModal
            visible={createJobModalVisible}
            onClose={() => setCreateJobModalVisible(false)}
            vehicles={vehicles}
            userId={myId}
            lockedMechanic={{ id: otherUserId, name: otherUserName }}
            onCreated={() => { /* the job card is already sent into this chat by CreateJobModal itself */ }}
          />
          <Modal visible={!!pendingAudioUri} transparent animationType="fade" onRequestClose={cancelAudioPreview}>
            <View style={styles.audioPreviewOverlay}>
              <View style={styles.audioPreviewCard}>
                <Text style={styles.audioPreviewTitle}>Voice Note</Text>
                {pendingAudioUri && <AudioPreviewPlayer uri={pendingAudioUri} accentColor={accentColor} />}
                <View style={styles.audioPreviewActionsRow}>
                  <TouchableOpacity style={styles.audioPreviewDiscardBtn} onPress={cancelAudioPreview} disabled={sendingAudio}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={styles.audioPreviewDiscardText}>Discard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.audioPreviewSendBtn, { backgroundColor: accentColor }]}
                    onPress={confirmSendAudio}
                    disabled={sendingAudio}>
                    {sendingAudio ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.audioPreviewSendText}>Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      )}

      <Modal visible={!!reviewTarget} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.cardOverlay}>
          <View style={styles.reviewCard}>
            {reviewSubmitted ? (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={44} color="#10b981" />
                <Text style={styles.reviewSuccessTitle}>Thank you!</Text>
                <Text style={styles.reviewSuccessSubtitle}>Your review has been submitted.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.proposeTitle}>Rate Your Mechanic</Text>
                <Text style={styles.proposeLabel}>How was your experience?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                      <Ionicons
                        name={star <= selectedRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= selectedRating ? '#f59e0b' : '#d1d5db'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.proposeInput, styles.proposeTextArea]}
                  placeholder="Leave a comment (optional)"
                  multiline
                  numberOfLines={2}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
                <View style={styles.proposeActionsRow}>
                  <TouchableOpacity style={styles.proposeCancelBtn} onPress={() => setReviewTarget(null)} disabled={submittingReview}>
                    <Text style={styles.proposeCancelText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.proposeSubmitBtn, selectedRating === 0 && { opacity: 0.5 }]}
                    onPress={handleSubmitReview}
                    disabled={submittingReview || selectedRating === 0}
                    activeOpacity={0.85}>
                    {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.proposeSubmitText}>Submit</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  headerName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  headerJob: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  messagesList: { padding: SPACING.lg, paddingBottom: SPACING.md },
  messageRow: { marginBottom: 4 },
  messageRowMine: { alignItems: 'flex-end' },
  messageRowTheirs: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#1b4332', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#ffffff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bubbleText: { fontSize: FONT_SIZES.md, lineHeight: 20 },
  bubbleTextMine: { color: '#ffffff' },
  bubbleTextTheirs: { color: '#1b1b1b' },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  bubbleTimeTheirs: { color: '#9ca3af' },
  dateSeparator: { alignItems: 'center', marginVertical: SPACING.md },
  dateSeparatorText: { fontSize: FONT_SIZES.xs, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyChatText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#9ca3af' },
  emptyChatSubText: { fontSize: FONT_SIZES.sm, color: '#d1d5db' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: SPACING.sm },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  attachMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  attachMenu: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: SPACING.md, paddingBottom: 40 },
  attachMenuOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  attachMenuIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  attachMenuText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b' },
  imageBubble: { width: 220, height: 220, borderRadius: 16, backgroundColor: '#f3f4f6' },
  partCardImage: { width: '100%', height: 140, borderRadius: RADIUS.sm, backgroundColor: '#f3f4f6', marginBottom: 6 },
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
imageViewerFull: { width: '100%', height: '80%' },
  previewActionsRow: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SPACING.xl },
  previewCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.full },
  previewSendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 26, paddingVertical: 12, borderRadius: RADIUS.full },
  previewBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  input: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 10, fontSize: FONT_SIZES.md, color: '#1b1b1b', maxHeight: 100 },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  jobCardWrap: { marginBottom: 4, width: '100%' },
  jobCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, backgroundColor: '#f9fafb' },
  jobCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  jobCardTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b1b1b', flexShrink: 1 },
  jobCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobCardStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  jobCardStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
  jobCardStatusText: { fontSize: 9, fontWeight: '800' },
  jobCardBody: { padding: SPACING.md, gap: 6 },
  jobCardDesc: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginBottom: 4, lineHeight: 17 },
  jobCardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobCardDetailText: { fontSize: 11, color: '#6b7280', flexShrink: 1 },
  counterOfferBox: { backgroundColor: '#f5f3ff', borderRadius: RADIUS.sm, padding: 10, marginTop: 6, gap: 3 },
  counterOfferTitle: { fontSize: 10, fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 2 },
  counterOfferLine: { fontSize: 12, color: '#4c1d95' },
  awaitingText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 6 },
  jobCardActionsStack: { gap: 6, marginTop: 8 },
  jobCardActionsFullRow: { flexDirection: 'row', marginTop: 8 },
  jobCardActions: { flexDirection: 'row', gap: 6 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#10b981', paddingVertical: 9, borderRadius: RADIUS.sm },
  acceptBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  changesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f5f3ff', paddingVertical: 9, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#ddd6fe' },
  changesBtnText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  declineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#fef2f2', paddingVertical: 9, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#fecaca' },
  declineBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingVertical: 9, borderRadius: RADIUS.sm },
  startBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#10b981', paddingVertical: 9, borderRadius: RADIUS.sm },
  completeBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  paidBadgeChat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: RADIUS.sm },
  paidBadgeChatText: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  payBtnCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1b4332', paddingVertical: 9, borderRadius: RADIUS.sm },
  payBtnCardText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb', borderRadius: RADIUS.sm, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  payOptionText: { fontSize: 13, fontWeight: '600', color: '#1b1b1b' },
  biddingSection: { marginTop: 4 },
  bidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f5f3ff', paddingVertical: 9, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#ddd6fe' },
  bidBtnText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md, borderRadius: 16 },
  proposeCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, width: '100%' },
  proposeTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b', marginBottom: 8, textAlign: 'center' },
  proposeLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  proposeInput: { backgroundColor: '#f9fafb', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#e5e7eb', padding: 8, fontSize: FONT_SIZES.sm, color: '#1b1b1b' },
  proposeTextArea: { height: 50, textAlignVertical: 'top' },
  proposeDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#ddd6fe', padding: 8 },
  proposeDateBtnText: { fontSize: 11, color: '#7c3aed', fontWeight: '600', flexShrink: 1 },
  proposeActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  proposeCancelBtn: { flex: 1, padding: 10, borderRadius: RADIUS.sm, backgroundColor: '#f3f4f6', alignItems: 'center' },
  proposeCancelText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  proposeSubmitBtn: { flex: 1, padding: 10, borderRadius: RADIUS.sm, backgroundColor: '#1b4332', alignItems: 'center' },
  proposeSubmitText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  reviewCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.lg, width: '100%', alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 6, marginVertical: SPACING.md },
  reviewSuccessTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b', marginTop: 8, marginBottom: 2 },
  reviewSuccessSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: SPACING.sm },
  recordingCancelBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626' },
  recordingTimeText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b' },
  recordingHintText: { fontSize: FONT_SIZES.sm, color: '#9ca3af' },
  recordingStopBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, minWidth: 200, maxWidth: '75%' },
  audioBubbleMine: { backgroundColor: '#1b4332', borderBottomRightRadius: 4 },
  audioBubbleTheirs: { backgroundColor: '#ffffff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  audioProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' },
  audioProgressFill: { height: '100%', borderRadius: 2 },
  audioDurationText: { fontSize: FONT_SIZES.xs, fontWeight: '600', minWidth: 34, textAlign: 'right' },
  audioPreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  audioPreviewCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%' },
  audioPreviewTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b', textAlign: 'center', marginBottom: SPACING.md },
  audioPreviewPlayerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  audioPreviewDurationText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', minWidth: 40, textAlign: 'right' },
  audioPreviewActionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  audioPreviewDiscardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md, backgroundColor: '#fef2f2' },
  audioPreviewDiscardText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#dc2626' },
  audioPreviewSendBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md },
  audioPreviewSendText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#fff' },
});