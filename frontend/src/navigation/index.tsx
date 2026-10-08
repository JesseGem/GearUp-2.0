import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loadStoredUser } from '../store/slices/authSlice';
import { PaystackProvider } from 'react-native-paystack-webview';
import { PAYSTACK_PUBLIC_KEY } from '../config/PaystackConfig';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetNewPasswordScreen from '../screens/auth/ResetNewPasswordScreen';
import OwnerTabNavigator from './OwnerTabNavigator';
import MechanicTabNavigator from './MechanicTabNavigator';
import DevSettingsScreen from '../screens/DevSettingsScreen';

import ChatScreen from '../screens/ChatScreen';
import OwnerSOSScreen from '../screens/owner/OwnerSOSScreen';
import WalletScreen from '../screens/WalletScreen';
import TopUpScreen from '../screens/TopUpScreen';
import BankAccountScreen from '../screens/mechanic/BankAccountScreen';
import WithdrawScreen from '../screens/mechanic/WithdrawScreen';

const Stack = createNativeStackNavigator();
const SPLASH_DURATION = 2800;
const SPLASH_FADE_DURATION = 500;

const isCustomerRole = (role?: string | null) => {
  const value = (role ?? '').toString().toLowerCase();
  return value === 'customer' || value === 'owner' || value === 'car_owner';
};

const isMechanicRole = (role?: string | null) => {
  const value = (role ?? '').toString().toLowerCase();
  return value === 'mechanic';
};

export default function Navigation() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    dispatch(loadStoredUser());
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: SPLASH_FADE_DURATION,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const role = user?.role ?? '';

  return (
    <>
      <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!user ? (
              <>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Otp" component={OtpScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetNewPassword" component={ResetNewPasswordScreen} />
                <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
              </>
            ) : isCustomerRole(role) ? (
              <>
                <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
                <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="SOS" component={OwnerSOSScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="TopUp" component={TopUpScreen} />
                <Stack.Screen name="Otp" component={OtpScreen} />
              </>
            ) : isMechanicRole(role) ? (
              <>
                <Stack.Screen name="MechanicTabs" component={MechanicTabNavigator} />
                <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="TopUp" component={TopUpScreen} />
                <Stack.Screen name="BankAccount" component={BankAccountScreen} />
                <Stack.Screen name="Withdraw" component={WithdrawScreen} />
                <Stack.Screen name="Otp" component={OtpScreen} />
              </>
            ) : null}
          </Stack.Navigator>
        </NavigationContainer>
      </PaystackProvider>

      {showSplash && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]} pointerEvents="none">
          <SplashScreen />
        </Animated.View>
      )}
    </>
  );
}
