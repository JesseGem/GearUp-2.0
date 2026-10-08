import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppTextInput from '../../components/AppTextInput';
import { AppAlertCard } from '../../components/AppAlert';
import { walletService, BankAccountDto, AccountType } from '../../services/walletService';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

const MOBILE_MONEY_PROVIDERS = [
  { name: 'MTN Mobile Money', code: 'MTN' },
  { name: 'Vodafone Cash', code: 'VOD' },
  { name: 'AirtelTigo Money', code: 'ATL' },
];

const BANK_PROVIDERS = [
  { name: 'GCB Bank', code: '040100' },
  { name: 'Ecobank Ghana', code: '130100' },
  { name: 'Fidelity Bank', code: '240100' },
  { name: 'Access Bank', code: '280100' },
  { name: 'Stanbic Bank', code: '190100' },
  { name: 'Standard Chartered Bank', code: '020100' },
  { name: 'Zenith Bank', code: '120100' },
  { name: 'CAL Bank', code: '140100' },
  { name: 'Absa Bank Ghana', code: '030100' },
  { name: 'Agricultural Development Bank', code: '080100' },
];

const ACCENT = '#000814';

export default function BankAccountScreen({ navigation }: any) {
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existingAccount, setExistingAccount] = useState<BankAccountDto | null>(null);
  const [editing, setEditing] = useState(false);

  const [accountType, setAccountType] = useState<AccountType>('MOBILE_MONEY');
  const [selectedProvider, setSelectedProvider] = useState<{ name: string; code: string } | null>(null);
 const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);

  const providers = accountType === 'MOBILE_MONEY' ? MOBILE_MONEY_PROVIDERS : BANK_PROVIDERS;

  useEffect(() => {
    walletService.getBankAccount()
      .then(acc => {
        setExistingAccount(acc);
        if (!acc) setEditing(true);
      })
      .catch(() => setEditing(true))
      .finally(() => setLoadingExisting(false));
  }, []);

  const handleSave = async () => {
    if (!selectedProvider) {
      setAlert({ type: 'warning', title: 'Missing Provider', message: 'Please choose a mobile money network or bank.' });
      return;
    }
    if (!accountNumber.trim()) {
      setAlert({ type: 'warning', title: 'Missing Account Number', message: 'Please enter the account or mobile money number.' });
      return;
    }
    setSaving(true);
    try {
      const saved = await walletService.saveBankAccount({
        accountType,
        bankCode: selectedProvider.code,
        bankName: selectedProvider.name,
        accountNumber: accountNumber.trim(),
      });
      setExistingAccount(saved);
      setEditing(false);
      setAlert({ type: 'success', title: 'Account Verified', message: `Confirmed: ${saved.accountName}` });
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Could Not Verify Account', message: e.message || 'Please check the details and try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
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
        <Text style={styles.headerTitle}>Payout Account</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}>
        {existingAccount && !editing ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            </View>
            <Text style={styles.summaryLabel}>Payout account on file</Text>
            <Text style={styles.summaryName}>{existingAccount.accountName}</Text>
            <Text style={styles.summaryDetail}>{existingAccount.bankName}</Text>
            <Text style={styles.summaryDetail}>{existingAccount.accountNumber}</Text>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setEditing(true)}>
              <Text style={styles.changeBtnText}>Change Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeOption, accountType === 'MOBILE_MONEY' && styles.typeOptionActive]}
                onPress={() => { setAccountType('MOBILE_MONEY'); setSelectedProvider(null); }}>
                <Ionicons name="phone-portrait-outline" size={16} color={accountType === 'MOBILE_MONEY' ? '#fff' : ACCENT} />
                <Text style={[styles.typeText, accountType === 'MOBILE_MONEY' && styles.typeTextActive]}>Mobile Money</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, accountType === 'BANK' && styles.typeOptionActive]}
                onPress={() => { setAccountType('BANK'); setSelectedProvider(null); }}>
                <Ionicons name="card-outline" size={16} color={accountType === 'BANK' ? '#fff' : ACCENT} />
                <Text style={[styles.typeText, accountType === 'BANK' && styles.typeTextActive]}>Bank</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{accountType === 'MOBILE_MONEY' ? 'Network' : 'Bank'}</Text>
            <View style={styles.providerList}>
              {providers.map(p => (
                <TouchableOpacity
                  key={p.code}
                  style={[styles.providerRow, selectedProvider?.code === p.code && styles.providerRowActive]}
                  onPress={() => setSelectedProvider(p)}>
                  <Text style={[styles.providerText, selectedProvider?.code === p.code && styles.providerTextActive]}>
                    {p.name}
                  </Text>
                  {selectedProvider?.code === p.code && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              {accountType === 'MOBILE_MONEY' ? 'Mobile Money Number' : 'Account Number'}
            </Text>
            <AppTextInput
              label={accountType === 'MOBILE_MONEY' ? 'Mobile Number' : 'Account Number'}
              icon="keypad-outline"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={t => setAccountNumber(t.replace(/[^0-9]/g, ''))}
              accentColor={ACCENT}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}>
              <LinearGradient colors={['#000814', '#001D3D']} style={styles.saveGradient}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Verify & Save</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {existingAccount && (
              <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={() => setAlert(null)}>
        <View style={styles.alertOverlay}>
          {alert && (
            <AppAlertCard
              type={alert.type}
              title={alert.title}
              message={alert.message}
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
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  body: { flex: 1, padding: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: SPACING.md },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  typeOptionActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  typeText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  typeTextActive: { color: '#fff' },
  providerList: { gap: 8 },
  providerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  providerRowActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  providerText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151' },
  providerTextActive: { color: '#fff' },
  saveBtn: { marginTop: SPACING.xl, borderRadius: RADIUS.md, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  cancelEditBtn: { marginTop: SPACING.md, padding: 10, alignItems: 'center' },
  cancelEditText: { fontSize: FONT_SIZES.sm, color: '#9ca3af', fontWeight: '600' },
  summaryCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6', marginTop: SPACING.md },
  summaryIconWrap: { marginBottom: SPACING.sm },
  summaryLabel: { fontSize: FONT_SIZES.xs, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  summaryName: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', marginTop: 4 },
  summaryDetail: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginTop: 2 },
  changeBtn: { marginTop: SPACING.lg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  changeBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: ACCENT },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});