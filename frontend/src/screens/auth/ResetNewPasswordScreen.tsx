import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT_FAMILY } from '../../constants';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Modal,
  Animated, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import AppTextInput from '../../components/AppTextInput';
import PasswordRequirementsChecklist from '../../components/PasswordRequirementsChecklist';
import { AppAlertCard } from '../../components/AppAlert';
import { isPasswordValid } from '../../utils/validation';

export default function ResetNewPasswordScreen({ route, navigation }: any) {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { email, code } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const cardAnim = useRef(new Animated.Value(40)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setAlert({ type: 'warning', title: 'Missing Information', message: 'Please fill in both password fields.' });
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setAlert({ type: 'warning', title: 'Weak Password', message: 'Please make sure your password meets all the requirements shown below.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'warning', title: "Passwords Don't Match", message: 'Please make sure both passwords match.' });
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, code, newPassword);
      setDone(true);
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message || 'Could not reset password. Please try the process again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && styles.desktopContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.pagePanel, isDesktop && styles.desktopPanel, isDesktop && { height: Math.min(height - 48, 620) }]}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={[styles.hero, isDesktop && styles.desktopHero]}>
        {!done && (
          <TouchableOpacity style={[styles.backBtn, isDesktop && styles.desktopBackBtn]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        )}
        <Animated.View style={{ opacity: heroAnim, alignItems: 'center' }}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.logoText}>New Password</Text>
        </Animated.View>
      </LinearGradient>
      <Animated.View style={[styles.card, isDesktop && styles.desktopCard, { transform: [{ translateY: cardAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.cardContent, isDesktop && styles.desktopCardContent]}>
          {!isDesktop && <View style={styles.cardHandle} />}
          {done ? (
            <View style={styles.sentState}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
              <Text style={styles.sentTitle}>Password reset!</Text>
              <Text style={styles.sentSubtitle}>
                Your password has been changed successfully. You can now sign in with your new password.
              </Text>
              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
                <Text style={styles.backToLoginText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Set a new password</Text>
              <Text style={styles.subtitle}>Your code has been verified. Choose a new password below.</Text>
              <AppTextInput
                label="New Password"
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={setNewPassword}
                isPassword
              />
              <PasswordRequirementsChecklist password={newPassword} accentColor={COLORS.primary} />
              <AppTextInput
                label="Confirm Password"
                icon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={loading}>
                <LinearGradient colors={[COLORS.accent, COLORS.accent]} style={styles.submitGradient}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.accentInk} />
                  ) : (
                    <Text style={styles.submitText}>Reset Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
      </View>

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
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  desktopContainer: { backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  pagePanel: { flex: 1 },
  desktopPanel: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', backgroundColor: COLORS.white, borderRadius: 24, overflow: 'hidden', shadowColor: COLORS.black, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 28, elevation: 12 },
  hero: { height: 220, justifyContent: 'center', alignItems: 'center' },
  desktopHero: { height: 160 },
  backBtn: { position: 'absolute', top: 60, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  desktopBackBtn: { top: 16 },
  iconOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  iconInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 22, fontWeight: '800', color: COLORS.white, fontFamily: FONT_FAMILY.headingBold },
  card: {
    flex: 1,
    marginTop: -28,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  desktopCard: { flex: 1, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, shadowOpacity: 0, elevation: 0 },
  cardContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  desktopCardContent: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 32 },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, fontFamily: FONT_FAMILY.headingBold },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20, fontFamily: FONT_FAMILY.body },
  submitBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  submitGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.accentInk, fontFamily: FONT_FAMILY.bodyBold },
  sentState: { alignItems: 'center', paddingTop: 20 },
  sentTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  sentSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  backToLoginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  backToLoginText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});
