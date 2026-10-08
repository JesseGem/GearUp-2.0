import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePaystack } from 'react-native-paystack-webview';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AppTextInput from '../components/AppTextInput';
import { AppAlertCard } from '../components/AppAlert';
import { walletService } from '../services/walletService';
import { SPACING, FONT_SIZES, RADIUS } from '../constants';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function TopUpScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { popup } = usePaystack();
  const isOwner = user?.role === 'OWNER';
  const accentColor = isOwner ? '#1b4332' : '#000814';
  const gradientColors = isOwner ? ['#1b4332', '#2d6a4f'] : ['#000814', '#001D3D'];

const [amount, setAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string; goBackOnClose?: boolean } | null>(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const handlePay = () => {
    if (!isValidAmount) {
      setAlert({ type: 'warning', title: 'Invalid Amount', message: 'Please enter a valid amount greater than 0.' });
      return;
    }
    if (!user?.email) {
      setAlert({ type: 'error', title: 'Error', message: 'Could not find your account email. Please log out and back in.' });
      return;
    }

    // Generated up front so we know the reference before checkout starts —
    // the backend independently re-verifies this exact reference with Paystack,
    // so we don't need to trust or parse whatever shape onSuccess's res comes back as.
    const reference = `TOPUP_${user.userId}_${Date.now()}`;

    popup.checkout({
      email: user.email,
      amount: parsedAmount,
      reference,
      onSuccess: async () => {
        setVerifying(true);
        try {
          await walletService.verifyDeposit(reference, parsedAmount);
          setAlert({
            type: 'success',
            title: 'Success',
            message: `GHS ${parsedAmount.toFixed(2)} added to your wallet!`,
            goBackOnClose: true,
          });
        } catch (e: any) {
          setAlert({
            type: 'error',
            title: 'Verification Failed',
            message: e.message || `Your payment could not be verified. If money was deducted, contact support with reference: ${reference}`,
          });
        } finally {
          setVerifying(false);
        }
      },
      onCancel: () => {
        // User closed the checkout without paying — nothing to do
      },
      onError: (err: any) => {
        console.log('Paystack checkout error:', err);
        setAlert({ type: 'error', title: 'Payment Error', message: 'Something went wrong during checkout. Please try again.' });
      },
    });
  };

  const closeAlert = () => {
    const shouldGoBack = alert?.goBackOnClose;
    setAlert(null);
    if (shouldGoBack) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradientColors as any} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Up Wallet</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.body}>
          <Text style={styles.label}>Amount (GHS)</Text>
          <AppTextInput
            label="Amount"
            icon="cash-outline"
            keyboardType="numeric"
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            accentColor={accentColor}
            editable={!verifying}
          />
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(q => (
              <TouchableOpacity
                key={q}
                style={styles.quickChip}
                onPress={() => setAmount(String(q))}
                disabled={verifying}
                activeOpacity={0.85}>
                <Text style={styles.quickChipText}>GHS {q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, (!isValidAmount || verifying) && { opacity: 0.5 }]}
            onPress={handlePay}
            disabled={!isValidAmount || verifying}
            activeOpacity={0.85}>
            <LinearGradient colors={gradientColors as any} style={styles.continueGradient}>
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueText}>
                  Pay{isValidAmount ? ` — GHS ${parsedAmount.toFixed(2)}` : ''}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.hint}>You'll be taken to Paystack's secure checkout to complete this top-up.</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.alertOverlay}>
          {alert && (
            <AppAlertCard
              type={alert.type}
              title={alert.title}
              message={alert.message}
              onClose={closeAlert}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  body: { flex: 1, padding: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', marginBottom: 8 },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  quickChipText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151' },
  continueBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  continueGradient: { padding: 16, alignItems: 'center' },
  continueText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  hint: { fontSize: FONT_SIZES.xs, color: '#9ca3af', textAlign: 'center', marginTop: SPACING.md },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});