import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
        <Image
          source={require('../../assets/LOGO.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>GearUp</Text>
        <Text style={styles.tagline}>Your mechanic, wherever you are.</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', gap: 12 },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  title: { fontSize: 36, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#86efac' },
});