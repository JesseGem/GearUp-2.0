import React, { useState, useRef } from 'react';
import {
  View, TextInput, Text, StyleSheet, Animated,
  TouchableOpacity, TextInputProps, ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZES, RADIUS } from '../constants';

interface AppTextInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  accentColor?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  backgroundColor?: string;
}

export default function AppTextInput({
  label,
  icon,
  error,
  accentColor = '#1b4332',
  containerStyle,
  isPassword,
  secureTextEntry,
  value,
  onFocus,
  onBlur,
  style,
  multiline,
  backgroundColor = '#f9fafb',
  ...rest
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(animatedLabel, { toValue: 1, duration: 150, useNativeDriver: false }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animatedLabel, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    }
    onBlur?.(e);
  };

  const borderColor = error ? '#dc2626' : isFocused ? accentColor : '#e5e7eb';

  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [multiline ? 28 : 18, -9] });
  const labelFontSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [FONT_SIZES.md, 12] });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.inputRow, { borderColor }, multiline && styles.multilineRow]}>
        {icon && (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={isFocused ? accentColor : '#9ca3af'} />
          </View>
        )}
        <View style={styles.fieldArea}>
          <Animated.Text
            style={[
              styles.floatingLabel,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: error ? '#dc2626' : isFocused ? accentColor : '#9ca3af',
                backgroundColor: animatedLabel.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['transparent', backgroundColor === '#f9fafb' ? '#ffffff' : backgroundColor],
                }) as any,
              },
            ]}
            pointerEvents="none">
            {' ' + label + ' '}
          </Animated.Text>
          <TextInput
            {...rest}
            value={value}
            multiline={multiline}
            secureTextEntry={isPassword ? !showPassword : secureTextEntry}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.input, multiline && styles.multilineInput, style]}
            placeholder=""
          />
        </View>
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: RADIUS.md, borderWidth: 1.5,
    paddingHorizontal: 12, height: 56,
  },
  multilineRow: { height: undefined, minHeight: 80, alignItems: 'flex-start', paddingVertical: 8 },
  iconWrap: { width: 26, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  fieldArea: { flex: 1, justifyContent: 'center' },
  floatingLabel: {
    position: 'absolute', left: 0, fontWeight: '500', borderRadius: 4, overflow: 'hidden',
  },
  input: { fontSize: FONT_SIZES.md, color: '#1b1b1b', height: 56, paddingTop: 0 },
  multilineInput: { height: undefined, minHeight: 60, paddingTop: 20, textAlignVertical: 'top' },
  eyeBtn: { marginLeft: 8 },
  errorText: { fontSize: FONT_SIZES.xs, color: '#dc2626', marginTop: 4, marginLeft: 4 },
});