import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, RADIUS } from '../constants';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AppAlertProps {
  visible: boolean;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  buttonText?: string;
  accentColor?: string;
  onClose: () => void;
}

const TYPE_CONFIG: Record<AlertType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: '#10b981', bg: '#f0fdf4' },
  error: { icon: 'close-circle', color: '#dc2626', bg: '#fef2f2' },
  warning: { icon: 'warning', color: '#000814', bg: '#fffbeb' },
  info: { icon: 'information-circle', color: '#2563eb', bg: '#eff6ff' },
};

// Inline version — use inside a screen that's ALREADY showing another Modal,
// to avoid the iOS nested-Modal touch-blocking bug.
export function AppAlertCard({ type = 'info', icon, title, message, buttonText = 'OK', accentColor, onClose }: Omit<AppAlertProps, 'visible'>) {
  const config = TYPE_CONFIG[type];
  const resolvedIcon = icon || config.icon;
  const resolvedColor = accentColor || config.color;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
        <Ionicons name={resolvedIcon} size={28} color={resolvedColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
        <LinearGradient colors={[resolvedColor, resolvedColor]} style={styles.btnGradient}>
          <Text style={styles.btnText}>{buttonText}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Standalone version — use when the screen is NOT already inside another Modal.
export default function AppAlert(props: AppAlertProps) {
  const { visible, onClose, ...rest } = props;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <AppAlertCard {...rest} onClose={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', alignItems: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: FONT_SIZES.sm, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  btn: { alignSelf: 'stretch', borderRadius: RADIUS.md, overflow: 'hidden' },
  btnGradient: { padding: 14, alignItems: 'center' },
  btnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
});