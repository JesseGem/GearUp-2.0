import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT_FAMILY } from '../../constants';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  Animated, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppTextInput from '../../components/AppTextInput';
import PasswordRequirementsChecklist from '../../components/PasswordRequirementsChecklist';
import { AppAlertCard } from '../../components/AppAlert';
import { authService } from '../../services/authService';
import { isAllowedEmailDomain, isPasswordValid } from '../../utils/validation';
import BrandLogo from '../../components/BrandLogo';

export default function RegisterScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  const cardAnim = useRef(new Animated.Value(40)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setAlert({ title: 'Missing Information', message: 'Please fill in all required fields.' });
      return;
    }
    if (!isAllowedEmailDomain(email)) {
      setAlert({ title: 'Invalid Email', message: 'Please use an email from a standard provider (e.g. Gmail, Outlook, Yahoo).' });
      return;
    }
    if (!isPasswordValid(password)) {
      setAlert({ title: 'Weak Password', message: 'Please make sure your password meets all the requirements shown below.' });
      return;
    }

    setLoading(true);
    try {
      await authService.register({ firstName, lastName, email, password, phone: phone || undefined });
      setAlert({
        title: 'Account created',
        message: 'Your account was created successfully. Please sign in.',
      });
      navigation.navigate('Login');
    } catch (e: any) {
      setAlert({ title: 'Could Not Continue', message: e.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.primary, COLORS.primary]} style={styles.hero}>
        <Animated.View style={{ opacity: heroAnim, alignItems: 'center' }}>
          <BrandLogo appearance="dark" width={160} />
          <Text style={styles.tagline}>Join the community</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View style={[styles.card, { transform: [{ translateY: cardAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cardContent}>
          <View style={styles.cardHandle} />
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <AppTextInput label="First Name" icon="person-outline" value={firstName} onChangeText={setFirstName} />
          <AppTextInput label="Last Name" icon="person-outline" value={lastName} onChangeText={setLastName} />
          <AppTextInput label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <AppTextInput label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <AppTextInput label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} isPassword />
          <PasswordRequirementsChecklist password={password} accentColor={COLORS.primary} />

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            <LinearGradient colors={[COLORS.accent, COLORS.accent]} style={styles.registerGradient}>
              {loading ? (
                <ActivityIndicator color={COLORS.accentInk} />
              ) : (
                <>
                  <Text style={styles.registerBtnText}>Create Account</Text>
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

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginHighlight}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {alert && (
        <View style={styles.alertOverlay}>
          <AppAlertCard
            type="error"
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  hero: { height: 200, justifyContent: 'center', alignItems: 'center' },
  tagline: { fontSize: 13, color: COLORS.darkTextSecondary, marginTop: 8, fontFamily: FONT_FAMILY.body },
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
  cardContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4, fontFamily: FONT_FAMILY.headingBold },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 18, fontFamily: FONT_FAMILY.body },
  registerBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  registerGradient: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  registerBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.accentInk, fontFamily: FONT_FAMILY.bodyBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  loginLink: { alignItems: 'center' },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginHighlight: { color: COLORS.primary, fontWeight: '700' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});
