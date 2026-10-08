import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, RADIUS } from '../constants';

interface ConfirmDialogProps {
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  accentColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// The inner card content — exported separately so it can be embedded inline
// (as a plain View) inside screens that are ALREADY showing another <Modal>,
// avoiding the iOS nested-Modal touch-blocking bug.
export function ConfirmDialogCard({
  icon = 'help-circle',
  iconColor,
  iconBg,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  accentColor = '#1b4332',
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, 'visible'>) {
  const resolvedIconColor = iconColor || (destructive ? '#dc2626' : accentColor);
  const resolvedIconBg = iconBg || (destructive ? '#fef2f2' : '#f0fdf4');

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: resolvedIconBg }]}>
        <Ionicons name={icon} size={28} color={resolvedIconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.cancelText}>{cancelText}</Text>
        </TouchableOpacity>
        {destructive ? (
          <TouchableOpacity style={styles.destructiveBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.destructiveText}>{confirmText}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
            <LinearGradient colors={[accentColor, accentColor]} style={styles.confirmGradient}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Standalone version — use this when the screen is NOT already inside another Modal.
export default function ConfirmDialog(props: ConfirmDialogProps) {
  const { visible, onCancel, ...rest } = props;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <ConfirmDialogCard {...rest} onCancel={onCancel} />
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
  actionsRow: { flexDirection: 'row', gap: SPACING.md, alignSelf: 'stretch' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#6b7280' },
  confirmBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmGradient: { padding: 14, alignItems: 'center' },
  confirmText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  destructiveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: '#dc2626', alignItems: 'center' },
  destructiveText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
});