import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store';
import { walletService, WalletTransactionDto, TransactionType } from '../services/walletService';
import { SPACING, FONT_SIZES, RADIUS } from '../constants';

const TRANSACTION_META: Record<TransactionType, { icon: any; color: string; sign: string }> = {
  DEPOSIT: { icon: 'arrow-down-circle', color: '#10b981', sign: '+' },
  JOB_PAYMENT_RECEIVED: { icon: 'arrow-down-circle', color: '#10b981', sign: '+' },
  WITHDRAWAL: { icon: 'arrow-up-circle', color: '#dc2626', sign: '-' },
  JOB_PAYMENT_SENT: { icon: 'arrow-up-circle', color: '#dc2626', sign: '-' },
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function WalletScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const isOwner = user?.role === 'OWNER';
  const accentColor = isOwner ? '#1b4332' : '#000814';
  const gradientColors = isOwner ? ['#1b4332', '#2d6a4f'] : ['#000814', '#001D3D'];

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [wallet, txns] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(),
      ]);
      setBalance(wallet.balance);
      setTransactions(txns);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const describeTransaction = (txn: WalletTransactionDto) => {
    switch (txn.type) {
      case 'DEPOSIT': return 'Wallet top-up';
      case 'WITHDRAWAL': return 'Withdrawal';
      case 'JOB_PAYMENT_SENT': return `Paid for job #${txn.jobId ?? ''}`;
      case 'JOB_PAYMENT_RECEIVED': return `Payment for job #${txn.jobId ?? ''}`;
      default: return txn.description || 'Transaction';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradientColors as any} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 36 }} />
        </View>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>GHS {(balance ?? 0).toFixed(2)}</Text>
          </>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TopUp')}>
            <Ionicons name="add-circle" size={18} color={accentColor} />
            <Text style={[styles.actionBtnText, { color: accentColor }]}>Top Up</Text>
          </TouchableOpacity>
          {!isOwner && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Withdraw')}>
                <Ionicons name="cash" size={18} color={accentColor} />
                <Text style={[styles.actionBtnText, { color: accentColor }]}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BankAccount')}>
                <Ionicons name="card" size={18} color={accentColor} />
                <Text style={[styles.actionBtnText, { color: accentColor }]}>Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {loading ? null : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map(txn => {
            const meta = TRANSACTION_META[txn.type];
            return (
              <View key={txn.id} style={styles.txnRow}>
                <View style={[styles.txnIconWrap, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{describeTransaction(txn)}</Text>
                  <Text style={styles.txnDate}>{formatDateTime(txn.createdAt)}</Text>
                  {txn.status !== 'COMPLETED' && (
                    <Text style={[styles.txnStatus, txn.status === 'FAILED' && { color: '#dc2626' }]}>
                      {txn.status}
                    </Text>
                  )}
                </View>
                <Text style={[styles.txnAmount, { color: meta.color }]}>
                  {meta.sign}GHS {txn.amount.toFixed(2)}
                </Text>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: SPACING.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  balanceLabel: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full },
  actionBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  body: { flex: 1, padding: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b', marginBottom: SPACING.md },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.md, color: '#9ca3af' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  txnIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txnTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b1b1b' },
  txnDate: { fontSize: FONT_SIZES.xs, color: '#9ca3af', marginTop: 2 },
  txnStatus: { fontSize: 10, fontWeight: '700', color: '#000814', marginTop: 2 },
  txnAmount: { fontSize: FONT_SIZES.sm, fontWeight: '800' },
});