import React, { useEffect, useState } from 'react';
import { COLORS, FONT_FAMILY, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { walletService } from '../services/walletService';
import { paymentService } from '../services/paymentService';

interface WalletPaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  jobId: number;
  jobTitle: string;
  payeeId: number;
  amount: number;
  accentColor?: string;
  onPaid: () => void;
}

export default function WalletPaymentSheet({
  visible, onClose, navigation, jobId, jobTitle, payeeId, amount, accentColor = COLORS.accent, onPaid,
}: WalletPaymentSheetProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [paying, setPaying] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setAlreadyPaid(false);
      Promise.all([
        walletService.getWallet(),
        // A missing/errored lookup just means "not paid yet" — the normal case —
        // so it's swallowed rather than surfaced as an error.
        paymentService.getPaymentByJob(jobId).catch(() => null),
      ])
        .then(([w, existingPayment]) => {
          setBalance(w.balance);
          if (existingPayment && existingPayment.status === 'success') {
            setAlreadyPaid(true);
          }
        })
        .catch(() => setBalance(0))
        .finally(() => setLoading(false));
    }
  }, [visible, jobId]);

  const sufficientBalance = balance >= amount;

  const handlePay = async () => {
    setPaying(true);
    try {
      const payment = await paymentService.createPayment({
        jobId,
        payeeId,
        amount,
        method: 'mobile_money', // record-keeping label only — actual funds move via the wallet ledger on the backend
      });
      await paymentService.completePayment(payment.id);
      onPaid();
      onClose();
    } catch (e: any) {
      // The backend's duplicate-payment guard can reject here even if this sheet's
      // own check missed it (e.g. a stale open sheet) — update the UI immediately
      // rather than just showing an error and leaving a "Pay" button that will
      // fail the same way again.
      if (e.message?.toLowerCase().includes('already been paid')) {
        setAlreadyPaid(true);
      } else {
        Alert.alert('Payment Failed', e.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

  const handleTopUp = () => {
    onClose();
    navigation.navigate('TopUp');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !paying && onClose()}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Pay for "{jobTitle}"</Text>
          <Text style={styles.amountText}>GHS {amount.toFixed(2)}</Text>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
          ) : alreadyPaid ? (
            <View style={styles.shortfallBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
              <Text style={[styles.shortfallText, { color: COLORS.success }]}>
                This job has already been paid for.
              </Text>
            </View>
          ) : sufficientBalance ? (
            <>
              <Text style={styles.balanceText}>Wallet balance: GHS {balance.toFixed(2)}</Text>
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: accentColor }]}
                onPress={handlePay}
                disabled={paying}
                activeOpacity={0.85}>
                {paying ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.payBtnText}>Pay from Wallet</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.shortfallBox}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.shortfallText}>
                  Your balance is GHS {balance.toFixed(2)}. You need GHS {(amount - balance).toFixed(2)} more to pay for this job.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: accentColor }]}
                onPress={handleTopUp}
                activeOpacity={0.85}>
                <Text style={styles.payBtnText}>Top Up Wallet</Text>
              </TouchableOpacity>
            </>
          )}

          {!paying && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, textAlign: 'center', fontFamily: FONT_FAMILY.headingBold },
  amountText: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.text, marginTop: 4, marginBottom: SPACING.md, fontFamily: FONT_FAMILY.headingBold },
  balanceText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.md, fontFamily: FONT_FAMILY.body },
  shortfallBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.warningTint, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.warning, marginBottom: SPACING.md },
  shortfallText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.warning, lineHeight: 17, fontFamily: FONT_FAMILY.body },
  payBtn: { width: '100%', paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  payBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.accentInk, fontFamily: FONT_FAMILY.bodyBold },
  cancelBtn: { marginTop: SPACING.md, padding: 8 },
  cancelText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.bodySemiBold },
});
