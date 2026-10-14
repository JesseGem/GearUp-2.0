import React from 'react';
import { COLORS, FONT_FAMILY, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  accentColor = COLORS.primary,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, 'visible'>) {
  const resolvedIconColor = iconColor || (destructive ? COLORS.error : accentColor);
  const resolvedIconBg = iconBg || (destructive ? COLORS.errorTint : COLORS.successTint);

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
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center', fontFamily: FONT_FAMILY.headingBold },
  message: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl, fontFamily: FONT_FAMILY.body },
  actionsRow: { flexDirection: 'row', gap: SPACING.md, alignSelf: 'stretch' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.bodySemiBold },
  confirmBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmGradient: { padding: 14, alignItems: 'center' },
  confirmText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.accentInk, fontFamily: FONT_FAMILY.bodyBold },
  destructiveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: 'center' },
  destructiveText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white, fontFamily: FONT_FAMILY.bodyBold },
});
