import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Modal,
  Animated, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import AppTextInput from '../../components/AppTextInput';
import { AppAlertCard } from '../../components/AppAlert';
import { isAllowedEmailDomain } from '../../utils/validation';

export default function LoginScreen({ navigation }: any) {
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.hero}>
        <Animated.View style={{ opacity: heroAnim, alignItems: 'center' }}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="construct" size={40} color="#1b4332" />
            </View>
          </View>
          <Text style={styles.logoText}>GearUp</Text>
          <Text style={styles.tagline}>Your mechanic, wherever you are.</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View style={[styles.card, { transform: [{ translateY: cardAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cardContent}>
          <View style={styles.cardHandle} />
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
            <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.loginGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#1b4332' },
  hero: { height: 280, justifyContent: 'center', alignItems: 'center' },
  iconOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  iconInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  tagline: { fontSize: 14, color: '#86efac' },
  card: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  cardContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1b1b1b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  forgotText: { fontSize: 13, color: '#1b4332', fontWeight: '600' },
  loginBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  loginGradient: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  loginText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerHighlight: { color: '#1b4332', fontWeight: '700' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});