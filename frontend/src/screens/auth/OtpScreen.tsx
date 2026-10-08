import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { verifyRegistrationThunk } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { AppAlertCard } from '../../components/AppAlert';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';


export default function OtpScreen({ route, navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
const { loading, error, user } = useSelector((state: RootState) => state.auth);
  const { mode = 'register', name, email, phone, password, role } = route.params;
  const isRegisterMode = mode === 'register';
  const isDeleteMode = mode === 'delete';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAlert, setResendAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [resetVerifying, setResetVerifying] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const displayLoading = isRegisterMode ? loading : resetVerifying;
  const displayError = isRegisterMode ? error : resetError;
  const inputs = useRef<Array<TextInput | null>>([]);
  const isSubmittingRef = useRef(false);
  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);
  useEffect(() => {
    if (isRegisterMode && user) {
      navigation.reset({
        index: 0,
        routes: [{ name: user.role === 'OWNER' ? 'OwnerTabs' : 'MechanicTabs' }],
      });
    }
  }, [user]);

  const handleOtpChange = (value: string, index: number) => {
  if (!/^\d*$/.test(value)) return;

  if (value.length > 1) {
    const digits = value.slice(0, 6).split('');
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    inputs.current[Math.min(digits.length, 5)]?.focus();
    if (digits.length === 6) handleVerify(digits.join(''));
    return;
  }

  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);
  if (value && index < 5) {
    inputs.current[index + 1]?.focus();
  }
  if (index === 5 && value) {
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) handleVerify(fullOtp);
  }
};

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    if (isSubmittingRef.current) return;
    const finalCode = code || otp.join('');
    if (finalCode.length < 6) {
      setResendAlert({ type: 'error', title: 'Invalid Code', message: 'Please enter the 6-digit code.' });
      return;
    }
    isSubmittingRef.current = true;
    try {
      if (isRegisterMode) {
        await dispatch(verifyRegistrationThunk({ name, email, phone, password, role, code: finalCode })).unwrap();
        return;
      }
      if (isDeleteMode) {
        setResetVerifying(true);
        setResetError(null);
        await authService.verifyAccountDeletion(finalCode);
        navigation.replace('AccountDeletionSubmitted');
        return;
      }
      setResetVerifying(true);
      setResetError(null);
      await authService.verifyResetCode(email, finalCode);
      navigation.navigate('ResetNewPassword', { email, code: finalCode });
    } catch (e: any) {
      if (!isRegisterMode) {
        setResetError(e?.message || 'Invalid or expired code. Please try again.');
      }
    } finally {
      isSubmittingRef.current = false;
      if (!isRegisterMode) setResetVerifying(false);
    }
  };
  const handleResend = async () => {
    setResending(true);
    try {
      if (isRegisterMode) {
        await authService.sendRegistrationCode({ name, email, phone, password, role });
      } else if (isDeleteMode) {
        await authService.sendAccountDeletionCode();
      } else {
        await authService.forgotPassword(email);
      }
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      setResendAlert({ type: 'success', title: 'Code Resent', message: `A new code has been sent to ${email}` });
    } catch (e: any) {
      setResendAlert({ type: 'error', title: 'Could Not Resend', message: e.message || 'Something went wrong. Please try again.' });
    } finally {
      setResending(false);
    }
  };
  const maskEmail = (value: string) => {
    const [local, domain] = value.split('@');
    if (!local || !domain) return value;
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
  };
  const maskedEmail = maskEmail(email);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          if (user) {
            navigation.reset({
              index: 0,
              routes: [{ name: user.role === 'OWNER' ? 'OwnerTabs' : 'MechanicTabs' }],
            });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#1b4332" />
      </TouchableOpacity>

      <View style={styles.inner}>
        {/* Icon */}
        <LinearGradient
          colors={['#52b788', '#1b4332']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name="mail-outline" size={36} color="#ffffff" />
        </LinearGradient>
        {/* Title */}
        <Text style={styles.title}>{isRegisterMode ? 'Verify your email' : isDeleteMode ? 'Confirm account deletion' : 'Enter reset code'}</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.phone}>{maskedEmail}</Text>
        </Text>

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputs.current[index] = ref;
                return;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Error */}
        {displayError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}
        {/* Verify button */}
        <TouchableOpacity
          onPress={() => handleVerify()}
          disabled={displayLoading || otp.join('').length < 6}
          activeOpacity={0.8}
          style={[
            styles.btnWrapper,
            (displayLoading || otp.join('').length < 6) && { opacity: 0.6 },
          ]}
        >
          <LinearGradient
            colors={['#52b788', '#2d6a4f', '#1b4332']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            {displayLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>Verify & Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          {canResend ? (
            resending ? (
              <ActivityIndicator size="small" color="#2d6a4f" />
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.resendTimer}>
              Resend in {timer}s
            </Text>
          )}
        </View>
      </View>

      <Modal visible={!!resendAlert} transparent animationType="fade" onRequestClose={() => setResendAlert(null)}>
        <View style={styles.alertOverlay}>
          {resendAlert && (
            <AppAlertCard
              type={resendAlert.type}
              title={resendAlert.title}
              message={resendAlert.message}
              onClose={() => setResendAlert(null)}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },

  // Icon
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#1b4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Text
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  phone: {
    fontWeight: '700',
    color: '#1b1b1b',
  },

  // OTP inputs
  otpRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  otpInputFilled: {
    borderColor: '#2d6a4f',
    backgroundColor: '#f0fdf4',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 6,
    width: '100%',
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: '#dc2626',
    flex: 1,
  },

  // Button
  btnWrapper: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#1b4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: SPACING.lg,
  },
  btn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Resend
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLabel: {
    fontSize: FONT_SIZES.sm,
    color: '#6b7280',
  },
  resendLink: {
    fontSize: FONT_SIZES.sm,
    color: '#2d6a4f',
    fontWeight: '700',
  },
  resendTimer: {
    fontSize: FONT_SIZES.sm,
    color: '#6b7280',
    fontWeight: '600',
  },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});