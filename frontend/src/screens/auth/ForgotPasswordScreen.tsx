import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Modal,
  Animated, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import AppTextInput from '../../components/AppTextInput';
import { AppAlertCard } from '../../components/AppAlert';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);

  const cardAnim = useRef(new Animated.Value(40)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

const handleSendCode = async () => {
    if (!email) {
      setAlert({ type: 'warning', title: 'Missing Email', message: 'Please enter your email address.' });
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      navigation.navigate('Otp', { mode: 'reset', email });
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: e.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Animated.View style={{ opacity: heroAnim, alignItems: 'center' }}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="key" size={32} color="#1b4332" />
            </View>
          </View>
          <Text style={styles.logoText}>Reset Password</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View style={[styles.card, { transform: [{ translateY: cardAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cardContent}>
          <View style={styles.cardHandle} />
          <Text style={styles.title}>Forgot your password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account, and we'll send you a 6-digit code to reset it.
          </Text>
          <AppTextInput
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSendCode} disabled={loading}>
            <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Send Reset Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

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
  container: { flex: 1, backgroundColor: '#1b4332' },
  hero: { height: 220, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  iconOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  iconInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
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
  title: { fontSize: 22, fontWeight: '700', color: '#1b1b1b', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  submitBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  submitGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { fontSize: 14, color: '#1b4332', fontWeight: '600' },
  sentState: { alignItems: 'center', paddingTop: 20 },
  sentTitle: { fontSize: 20, fontWeight: '700', color: '#1b1b1b', marginTop: 16, marginBottom: 8 },
  sentSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  backToLoginBtn: { backgroundColor: '#1b4332', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  backToLoginText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});