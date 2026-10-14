import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT_FAMILY } from '../../constants';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Modal,
  Animated, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import AppTextInput from '../../components/AppTextInput';
import { AppAlertCard } from '../../components/AppAlert';
import { isAllowedEmailDomain } from '../../utils/validation';
import BrandLogo from '../../components/BrandLogo';

export default function LoginScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  const cardAnim = useRef(new Animated.Value(40)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setAlert({ title: 'Missing Information', message: 'Please fill in all fields.' });
      return;
    }
    if (!isAllowedEmailDomain(email)) {
      setAlert({ title: 'Invalid Email', message: 'Please use an email from a standard provider (e.g. Gmail, Outlook, Yahoo).' });
      return;
    }
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.rejected.match(result)) {
      setAlert({ title: 'Login Failed', message: result.payload as string });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && styles.desktopContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.pagePanel, isDesktop && styles.desktopPanel, isDesktop && { height: Math.min(height - 48, 660) }]}>
        <LinearGradient colors={[COLORS.primary, COLORS.primary]} style={[styles.hero, isDesktop && styles.desktopHero]}>
          <Animated.View style={{ opacity: heroAnim, alignItems: 'center' }}>
            <BrandLogo appearance="light" width={180} />
            <Text style={styles.tagline}>Your mechanic, wherever you are.</Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={[styles.card, isDesktop && styles.desktopCard, { transform: [{ translateY: cardAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.cardContent, isDesktop && styles.desktopCardContent]}>
          {!isDesktop && <View style={styles.cardHandle} />}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <AppTextInput
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AppTextInput
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={[COLORS.accent, COLORS.accent]} style={styles.loginGradient}>
              {loading ? (
                <ActivityIndicator color={COLORS.accentInk} />
              ) : (
                <>
                  <Text style={styles.loginText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.accentInk} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerBtn}>
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerHighlight}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
      </View>

      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={() => setAlert(null)}>
        <View style={styles.alertOverlay}>
          {alert && (
            <AppAlertCard
              type="error"
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
  hero: { height: 280, justifyContent: 'center', alignItems: 'center' },
  desktopHero: { height: 180 },
  tagline: { fontSize: 14, color: COLORS.darkTextSecondary, marginTop: 10, fontFamily: FONT_FAMILY.body },
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
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4, fontFamily: FONT_FAMILY.headingBold },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, fontFamily: FONT_FAMILY.body },
  forgotLink: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  loginBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  loginGradient: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  loginText: { fontSize: 16, fontWeight: '700', color: COLORS.accentInk, fontFamily: FONT_FAMILY.bodyBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: 14, color: COLORS.textSecondary },
  registerHighlight: { color: COLORS.primary, fontWeight: '700' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});
