import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import OwnerSearchScreen from '../screens/owner/OwnerSearchScreen';
import OwnerJobsScreen from '../screens/owner/OwnerJobsScreen';
import OwnerMessagesScreen from '../screens/owner/OwnerMessagesScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';

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

const ACTIVE_COLOR = '#1b4332';
const INACTIVE_COLOR = '#9ca3af';

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
          <Ionicons name={(focused ? filled : outline) as any} size={22} color={color} />
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
export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={OwnerHomeScreen} />
      <Tab.Screen name="Search" component={OwnerSearchScreen} />
      <Tab.Screen name="Jobs" component={OwnerJobsScreen} />
      <Tab.Screen name="Messages" component={OwnerMessagesScreen} />
      <Tab.Screen name="Profile" component={OwnerProfileScreen} />
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
    shadowColor: '#1b1b1b',
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
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  tabDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});