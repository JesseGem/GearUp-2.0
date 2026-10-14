import React, { useEffect, useRef } from 'react';
import { COLORS, FONT_FAMILY } from '../constants';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
import BrandLogo from '../components/BrandLogo';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import CustomerSearchScreen from '../screens/customer/CustomerSearchScreen';
import CustomerJobsScreen from '../screens/customer/CustomerJobsScreen';
import CustomerMessagesScreen from '../screens/customer/CustomerMessagesScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, [string, string]> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Jobs: ['briefcase', 'briefcase-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
  Profile: ['person', 'person-outline'],
};

const LABELS: Record<string, string> = {
  Home: 'Home',
  Search: 'Search',
  Jobs: 'Jobs',
  Messages: 'Chats',
  Profile: 'Profile',
};

const ACTIVE_COLOR = COLORS.primary;
const INACTIVE_COLOR = COLORS.textSecondary;

function TabButton({ routeName, focused, onPress, showDot, desktop = false }: { routeName: string; focused: boolean; onPress: () => void; showDot?: boolean; desktop?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);
  const [filled, outline] = ICONS[routeName];
  const color = desktop
    ? focused ? COLORS.accent : COLORS.darkTextSecondary
    : focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <TouchableOpacity style={[styles.tabBtn, desktop && styles.desktopTabBtn]} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View>
          <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive, desktop && styles.desktopTabIconWrap]}>
            <Ionicons name={(focused ? filled : outline) as any} size={22} color={color} />
          </View>
          {showDot && <View style={styles.tabDot} />}
        </View>
      </Animated.View>
      <Text style={[styles.tabLabel, desktop && styles.desktopTabLabel, { color }]}>{LABELS[routeName]}</Text>
    </TouchableOpacity>
  );
}
function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 768;
  const { user } = useSelector((state: RootState) => state.auth);
  const unreadCount = useUnreadMessagesCount(user?.userId);
  const buttons = state.routes.map((route: any, index: number) => {
    const focused = state.index === index;
    const onPress = () => {
      if (!focused) navigation.navigate(route.name);
    };
    return (
      <TabButton
        key={route.key}
        routeName={route.name}
        focused={focused}
        onPress={onPress}
        showDot={route.name === 'Messages' && unreadCount > 0}
        desktop={desktop}
      />
    );
  });

  if (desktop) {
    return (
      <View style={styles.desktopBar}>
        <View style={styles.desktopBarContent}>
          <BrandLogo appearance="light" width={132} />
          <View style={styles.desktopRow}>{buttons}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.shadowWrapper}>
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <View style={styles.overlay} />
          <View style={styles.row}>{buttons}</View>
        </BlurView>
      </View>
    </View>
  );
}
export default function CustomerTabNavigator() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 768;
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarPosition: desktop ? 'top' : 'bottom' }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Search" component={CustomerSearchScreen} />
      <Tab.Screen name="Jobs" component={CustomerJobsScreen} />
      <Tab.Screen name="Messages" component={CustomerMessagesScreen} />
      <Tab.Screen name="Profile" component={CustomerProfileScreen} />
    </Tab.Navigator>
  );
}
const styles = StyleSheet.create({
  desktopBar: { width: '100%', backgroundColor: COLORS.primary, borderBottomWidth: 1, borderBottomColor: COLORS.secondary },
  desktopBarContent: { width: '100%', maxWidth: 1200, minHeight: 68, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 36 },
  desktopRow: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  desktopTabBtn: { flex: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  desktopTabIconWrap: { minWidth: 0, minHeight: 0, backgroundColor: 'transparent' },
  desktopTabLabel: { fontSize: 13 },
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  shadowWrapper: {
    width: '100%',
    borderRadius: 30,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 20,
  },
  blurContainer: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabIconWrap: { minWidth: 34, minHeight: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: COLORS.accent },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.bodySemiBold,
  },
  tabDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
});
