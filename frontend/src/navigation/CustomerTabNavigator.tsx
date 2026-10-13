import React, { useEffect, useRef } from 'react';
import { COLORS, FONT_FAMILY } from '../constants';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
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

function TabButton({ routeName, focused, onPress, showDot }: { routeName: string; focused: boolean; onPress: () => void; showDot?: boolean }) {
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
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <TouchableOpacity style={styles.tabBtn} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View>
          <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
            <Ionicons name={(focused ? filled : outline) as any} size={22} color={color} />
          </View>
          {showDot && <View style={styles.tabDot} />}
        </View>
      </Animated.View>
      <Text style={[styles.tabLabel, { color }]}>{LABELS[routeName]}</Text>
    </TouchableOpacity>
  );
}
function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const unreadCount = useUnreadMessagesCount(user?.userId);
  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.shadowWrapper}>
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <View style={styles.overlay} />
          <View style={styles.row}>
          {state.routes.map((route: any, index: number) => {
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
              />
            );
          })}
        </View>
        </BlurView>
      </View>
    </View>
  );
}
export default function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
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
