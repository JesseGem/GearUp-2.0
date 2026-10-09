import React from 'react';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '../constants';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkPasswordRequirements } from '../utils/validation';

interface Props {
  password?: string;
  accentColor?: string;
}

export default function PasswordRequirementsChecklist({ password = '', accentColor = COLORS.primary }: Props) {
  const req = checkPasswordRequirements(password);
  const items = [
    { met: req.minLength, label: 'At least 8 characters' },
    { met: req.hasUppercase, label: 'One uppercase letter' },
    { met: req.hasLowercase, label: 'One lowercase letter' },
    { met: req.hasNumber, label: 'One number' },
    { met: req.hasSpecialChar, label: 'One special character' },
  ];
  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Ionicons
            name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={item.met ? accentColor : COLORS.textSecondary}
          />
          <Text style={[styles.text, item.met && { color: accentColor, fontWeight: '600' }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: -6, marginBottom: 14, gap: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.body },
});
