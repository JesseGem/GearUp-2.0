import React from 'react';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function AccountDeletionSubmittedScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const isCustomer = user?.role === 'customer';
  const isMechanic = user?.role === 'mechanic';
  const roleTab = isCustomer ? 'CustomerTabs' : isMechanic ? 'MechanicTabs' : null;
  const accentColor = isCustomer ? COLORS.primary : COLORS.primary;
  const gradientColors = isCustomer ? [COLORS.primary, COLORS.primary] : [COLORS.primary, COLORS.secondary];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradientColors as any} style={styles.hero}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="checkmark" size={32} color={accentColor} />
          </View>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.title}>Request Submitted</Text>
        <Text style={styles.subtitle}>
          Your account deletion request has been received. Your account remains fully active — nothing changes yet.
          {'\n\n'}
          Our team will review your request before any action is taken. You can cancel this request at any time from your Profile screen.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => {
            if (roleTab) navigation.reset({ index: 0, routes: [{ name: roleTab }] });
          }}>
          <LinearGradient colors={gradientColors as any} style={styles.doneGradient}>
            <Text style={styles.doneText}>Back to Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  hero: { height: 220, justifyContent: 'center', alignItems: 'center' },
  iconOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  iconInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  doneBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  doneGradient: { padding: 16, alignItems: 'center' },
  doneText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
});
