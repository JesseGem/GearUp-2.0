import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppTextInput from '../../components/AppTextInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AppAlertCard } from '../../components/AppAlert';
import { walletService, BankAccountDto } from '../../services/walletService';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

const ACCENT = '#000814';

export default function WithdrawScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bankAccount, setBankAccount] = useState<BankAccountDto | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultAlert, setResultAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [wallet, account] = await Promise.all([
        walletService.getWallet(),
        walletService.getBankAccount(),
      ]);
      setBalance(wallet.balance);
      setBankAccount(account);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load wallet details');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= balance;

  const handleWithdraw = () => {
    if (!isValidAmount) return;
    setShowConfirm(true);
  };

  const submitWithdrawal = async () => {
    setShowConfirm(false);
    setWithdrawing(true);
    try {
      await walletService.withdraw(parsedAmount);
      setResultAlert({
        type: 'success',
        title: 'Withdrawal Sent',
        message: `GHS ${parsedAmount.toFixed(2)} is on its way to your account.`,
      });
    } catch (e: any) {
      setResultAlert({
        type: 'error',
        title: 'Withdrawal Failed',
        message: e.message || 'Something went wrong. Your balance has not been affected if the transfer failed.',
      });
      fetchData();
    } finally {
      setWithdrawing(false);
    }
  };

  const closeResultAlert = () => {
    const wasSuccess = resultAlert?.type === 'success';
    setResultAlert(null);
    if (wasSuccess) navigation.goBack();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#000814', '#001D3D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {!bankAccount ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No payout account on file</Text>
          <Text style={styles.emptySubText}>Add a bank or mobile money account before withdrawing</Text>
          <TouchableOpacity style={styles.addAccountBtn} onPress={() => navigation.navigate('BankAccount')}>
            <Text style={styles.addAccountBtnText}>Add Payout Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.body}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>GHS {balance.toFixed(2)}</Text>

            <View style={styles.destinationCard}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.destinationName}>{bankAccount.accountName}</Text>
                <Text style={styles.destinationDetail}>{bankAccount.bankName} · {bankAccount.accountNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('BankAccount')}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount to Withdraw (GHS)</Text>
            <AppTextInput
              label="Amount"
              icon="cash-outline"
              keyboardType="numeric"
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
              accentColor={ACCENT}
              editable={!withdrawing}
            />
            {amount.length > 0 && parsedAmount > balance && (
              <Text style={styles.errorText}>Amount exceeds your available balance.</Text>
            )}

            <TouchableOpacity
              style={[styles.withdrawBtn, (!isValidAmount || withdrawing) && { opacity: 0.5 }]}
              onPress={handleWithdraw}
              disabled={!isValidAmount || withdrawing}
              activeOpacity={0.85}>
              <LinearGradient colors={['#000814', '#001D3D']} style={styles.withdrawGradient}>
                {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.withdrawText}>Withdraw</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <ConfirmDialog
        visible={showConfirm}
        icon="cash-outline"
        title="Confirm Withdrawal"
        message={`Withdraw GHS ${parsedAmount.toFixed(2)} to ${bankAccount?.bankName} (${bankAccount?.accountNumber})?`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={submitWithdrawal}
        onCancel={() => setShowConfirm(false)}
      />

      <Modal visible={!!resultAlert} transparent animationType="fade" onRequestClose={closeResultAlert}>
        <View style={styles.alertOverlay}>
          {resultAlert && (
            <AppAlertCard
              type={resultAlert.type}
              title={resultAlert.title}
              message={resultAlert.message}
              onClose={closeResultAlert}
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
  balanceLabel: { fontSize: FONT_SIZES.sm, color: '#6b7280' },
  balanceValue: { fontSize: 32, fontWeight: '800', color: '#1b1b1b', marginTop: 2, marginBottom: SPACING.lg },
  destinationCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: SPACING.lg },
  destinationName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b1b1b' },
  destinationDetail: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginTop: 2 },
  changeLink: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#2563eb' },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', marginBottom: 8 },
  errorText: { fontSize: FONT_SIZES.xs, color: '#dc2626', marginTop: -8, marginBottom: SPACING.md },
  withdrawBtn: { marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: 'hidden' },
  withdrawGradient: { padding: 16, alignItems: 'center' },
  withdrawText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#374151' },
  emptySubText: { fontSize: FONT_SIZES.sm, color: '#9ca3af', textAlign: 'center' },
  addAccountBtn: { marginTop: SPACING.lg, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md },
  addAccountBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});