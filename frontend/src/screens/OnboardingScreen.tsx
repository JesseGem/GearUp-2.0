// This is the Onboarding screens
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'search',
    colors: ['#1b4332', '#2d6a4f'],
    accent: '#86efac',
    title: 'Find Nearby Mechanics',
    subtitle: 'Search verified mechanics around you, sorted by distance, and see them right on the map.',
  },
  {
    icon: 'navigate',
    colors: ['#1e3a5f', '#2563eb'],
    accent: '#93c5fd',
    title: 'Track Your Job in Real Time',
    subtitle: 'Watch your mechanic\'s route, get live directions, and know exactly when help arrives.',
  },
  {
    icon: 'warning',
    colors: ['#7f1d1d', '#dc2626'],
    accent: '#fca5a5',
    title: 'SOS Emergency Assistance',
    subtitle: 'Stranded? One tap finds the nearest available mechanic and sends an emergency request instantly.',
  },
  {
    icon: 'star',
    colors: ['#001D3D', '#000814'],
    accent: '#fde68a',
    title: 'Save Your Favorite Mechanics',
    subtitle: 'Star the mechanics you trust and book them directly next time, or schedule ahead of time.',
  },
  {
    icon: 'chatbubbles',
    colors: ['#4c1d95', '#7c3aed'],
    accent: '#c4b5fd',
    title: 'Chat, Pay & Rate — All in One',
    subtitle: 'Message your mechanic, review the price, pay securely, and leave a rating once the job\'s done.',
  },
];

const ACCENT_INPUT_RANGE = SLIDES.map((_, i) => i * width);
const ACCENT_COLORS = SLIDES.map(s => s.accent);
const DARK_COLORS = SLIDES.map(s => s.colors[0]);

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<Animated.FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 700,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, []);

  const accentColor = scrollX.interpolate({
    inputRange: ACCENT_INPUT_RANGE,
    outputRange: ACCENT_COLORS,
  });
  const darkColor = scrollX.interpolate({
    inputRange: ACCENT_INPUT_RANGE,
    outputRange: DARK_COLORS,
  });

  const finishOnboarding = () => {
    navigation.replace('Login');
  };

  const goToIndex = (i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    listRef.current?.scrollToIndex({ index: clamped });
    setIndex(clamped);
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      goToIndex(index + 1);
    } else {
      finishOnboarding();
    }
  };

  const handlePrev = () => {
    if (index > 0) goToIndex(index - 1);
  };

  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Stacked gradient layers that cross-fade based on scroll position */}
        {SLIDES.map((s, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const layerOpacity = scrollX.interpolate({
            inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity: layerOpacity }]}>
              <LinearGradient colors={s.colors as any} style={StyleSheet.absoluteFill} />
            </Animated.View>
          );
        })}

        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={handlePrev}
            disabled={index === 0}
            style={[styles.navChip, index === 0 && styles.navChipHidden]}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          renderItem={({ item, index: i }) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

            const iconScale = scrollX.interpolate({
              inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp',
            });
            const iconOpacity = scrollX.interpolate({
              inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
            });
            const textTranslate = scrollX.interpolate({
              inputRange, outputRange: [40, 0, 40], extrapolate: 'clamp',
            });
            const textOpacity = scrollX.interpolate({
              inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp',
            });

            return (
              <View style={[styles.slide, { width }]}>
                {/* Tap zones nested INSIDE the scrollable slide so swipe gestures still work */}
                <View style={styles.tapZones} pointerEvents="box-none">
                  <TouchableOpacity style={styles.tapZoneLeft} onPress={handlePrev} activeOpacity={1} />
                  <TouchableOpacity style={styles.tapZoneRight} onPress={handleNext} activeOpacity={1} />
                </View>

                <Animated.View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: 'rgba(255,255,255,0.15)', transform: [{ scale: iconScale }], opacity: iconOpacity },
                  ]}
                  pointerEvents="none">
                  <View style={[styles.iconCircleInner, { backgroundColor: item.accent }]}>
                    <Ionicons name={item.icon as any} size={56} color={item.colors[0]} />
                  </View>
                </Animated.View>
                <Animated.Text
                  style={[styles.title, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}
                  pointerEvents="none">
                  {item.title}
                </Animated.Text>
                <Animated.Text
                  style={[styles.subtitle, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}
                  pointerEvents="none">
                  {item.subtitle}
                </Animated.Text>
              </View>
            );
          }}
        />

        <Animated.View style={[styles.footer, { opacity: enterAnim }]}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotScale = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
              const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
              return (
                <TouchableOpacity key={i} onPress={() => goToIndex(i)} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
                  <Animated.View
                    style={[
                      styles.dot,
                      { opacity: dotOpacity, backgroundColor: accentColor, transform: [{ scaleX: dotScale }] },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Animated.View style={[styles.nextBtnInner, { backgroundColor: accentColor }]}>
              {index === SLIDES.length - 1 ? (
                <Animated.Text style={[styles.nextText, { color: darkColor }]}>Get Started</Animated.Text>
              ) : (
                <AnimatedIonicons name="arrow-forward" size={22} color={darkColor as any} />
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  navChip: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  navChipHidden: { opacity: 0 },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapZoneLeft: { flex: 1 },
  tapZoneRight: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingTop: 80 },
  iconCircle: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  iconCircleInner: { width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 14 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 32, paddingBottom: 50, alignItems: 'center', gap: 28, zIndex: 2 },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 24, height: 8, borderRadius: 4 },
  nextBtn: { alignSelf: 'stretch' },
  nextBtnInner: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, flexDirection: 'row', alignSelf: 'center' },
  nextText: { fontSize: 16, fontWeight: '700' },
});