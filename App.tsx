import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreenView } from './src/screens/SplashScreenView';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { WebLandingScreen } from './src/screens/WebLandingScreen';
import { OtpScreen } from './src/screens/OtpScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import { CreateTripScreen } from './src/screens/CreateTripScreen';
import { ItineraryScreen } from './src/screens/ItineraryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import type { AuthUser } from './src/services/auth/sessionStore';
import { loadSession, signOut } from './src/services/auth/sessionStore';
import { clearWarmItineraryCache } from './src/services/cache/warmItineraryCache';
import { clearWarmTripCache } from './src/services/cache/warmTripCache';
import { setApiJwt } from './src/services/api/sessionStore';
import { checkDueActivityReminders } from './src/services/notifications/activityReminderService';

void SplashScreen.preventAutoHideAsync().catch(() => {});

type Phase = 'splash' | 'landing' | 'login' | 'register' | 'otp' | 'main';

type MainFlow =
  | { name: 'trips' }
  | { name: 'create' }
  | { name: 'itinerary'; tripId: number }
  | { name: 'profile' }
  | { name: 'notifications' };

export default function App() {
  return (
    <View style={[styles.shell, Platform.OS === 'web' && styles.shellWeb]}>
      <SafeAreaProvider style={styles.safeFill}>
        <AppRoot />
      </SafeAreaProvider>
    </View>
  );
}

function AppRoot() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [phase, setPhase] = useState<Phase>(Platform.OS === 'web' ? 'landing' : 'splash');
  const [phoneE164, setPhoneE164] = useState('');
  const [otpBanner, setOtpBanner] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mainFlow, setMainFlow] = useState<MainFlow>({ name: 'trips' });

  useLayoutEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) setBootstrapping(false);
    }, 800);
    (async () => {
      try {
        const session = await loadSession();
        if (cancelled) return;
        if (session) {
          setUser(session);
          // Web: stay on marketing landing until user taps "Open my trips". Native: go straight in.
          if (Platform.OS !== 'web') {
            setPhase('main');
          }
        }
      } catch {
        /* keep splash → login */
      } finally {
        clearTimeout(fallback);
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (bootstrapping) return;
    if (phase !== 'splash') return;
    setPhase('login');
  }, [bootstrapping, phase]);

  const onRegisterRequired = useCallback((e164: string) => {
    setPhoneE164(e164);
    setOtpBanner('');
    setPhase('register');
  }, []);

  const onProceedToOtp = useCallback((e164: string, banner: string) => {
    setPhoneE164(e164);
    setOtpBanner(banner);
    setPhase('otp');
  }, []);

  const onVerified = useCallback(async () => {
    const session = await loadSession();
    if (session) {
      setUser(session);
      setPhase('main');
    } else {
      setPhase('login');
    }
  }, []);

  const onChangeNumber = useCallback(() => {
    setPhoneE164('');
    setOtpBanner('');
    setPhase('login');
  }, []);

  const onBackFromRegister = useCallback(() => {
    setPhoneE164('');
    setPhase('login');
  }, []);

  const onSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      /* still leave session locally inconsistent — force login */
    }
    clearWarmTripCache();
    clearWarmItineraryCache();
    await setApiJwt(null);
    setUser(null);
    setPhoneE164('');
    setOtpBanner('');
    setMainFlow({ name: 'trips' });
    setPhase(Platform.OS === 'web' ? 'landing' : 'login');
  }, []);

  const onCreateTrip = useCallback(() => {
    setMainFlow({ name: 'create' });
  }, []);

  const onOpenTrip = useCallback((trip: { id: number }) => {
    setMainFlow({ name: 'itinerary', tripId: trip.id });
  }, []);

  const onOpenProfile = useCallback(() => {
    setMainFlow({ name: 'profile' });
  }, []);

  const onOpenNotifications = useCallback(() => {
    setMainFlow({ name: 'notifications' });
  }, []);

  const backToTrips = useCallback(() => {
    setMainFlow({ name: 'trips' });
  }, []);

  useEffect(() => {
    if (phase !== 'main' || !user) return;
    let stopped = false;
    const run = async () => {
      const due = await checkDueActivityReminders(user.id);
      if (stopped || !due.length) return;
      Alert.alert('Activity reminder', due[0]);
    };
    void run();
    const id = setInterval(() => {
      void run();
    }, 30000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [phase, user]);

  /* Web: show React landing first (even while session loads). Native: splash until bootstrap done. */
  if (Platform.OS === 'web' && phase === 'landing') {
    return (
      <>
        <WebLandingScreen
          user={user}
          onOpenLogin={() => setPhase('login')}
          onContinueToApp={() => setPhase('main')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (bootstrapping) {
    return (
      <>
        <SplashScreenView />
        <StatusBar style="light" />
      </>
    );
  }

  if (phase === 'splash') {
    return (
      <>
        <SplashScreenView />
        <StatusBar style="light" />
      </>
    );
  }

  if (phase === 'login') {
    return (
      <>
        <LoginScreen onRegisterRequired={onRegisterRequired} onProceedToOtp={onProceedToOtp} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (phase === 'register') {
    return (
      <>
        <RegisterScreen
          phoneE164={phoneE164}
          onBack={onBackFromRegister}
          onProceedToOtp={(banner) => {
            setOtpBanner(banner);
            setPhase('otp');
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (phase === 'otp') {
    return (
      <>
        <OtpScreen
          phoneE164={phoneE164}
          banner={otpBanner}
          onVerified={onVerified}
          onChangeNumber={onChangeNumber}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (phase === 'main' && !user) {
    return (
      <>
        <LoginScreen onRegisterRequired={onRegisterRequired} onProceedToOtp={onProceedToOtp} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (user) {
    if (mainFlow.name === 'create') {
      return (
        <>
          <CreateTripScreen
            userId={user.id}
            profileLabel={user.firstName?.trim() || 'Profile'}
            onBack={backToTrips}
            onCreateTrip={onCreateTrip}
            onProfile={onOpenProfile}
            onNotifications={onOpenNotifications}
          />
          <StatusBar style="dark" />
        </>
      );
    }
    if (mainFlow.name === 'itinerary') {
      return (
        <>
          <ItineraryScreen
            userId={user.id}
            tripId={mainFlow.tripId}
            profileLabel={user.firstName?.trim() || 'Profile'}
            onBack={backToTrips}
            onCreateTrip={onCreateTrip}
            onProfile={onOpenProfile}
            onNotifications={onOpenNotifications}
          />
          <StatusBar style="dark" />
        </>
      );
    }
    if (mainFlow.name === 'profile') {
      return (
        <>
          <ProfileScreen
            user={user}
            onHome={backToTrips}
            onAddTrip={onCreateTrip}
            onSignOut={onSignOut}
            onProfileUpdated={setUser}
            onNotifications={onOpenNotifications}
          />
          <StatusBar style="dark" />
        </>
      );
    }
    if (mainFlow.name === 'notifications') {
      return (
        <>
          <NotificationsScreen
            user={user}
            onHome={backToTrips}
            onAddTrip={onCreateTrip}
            onProfile={onOpenProfile}
          />
          <StatusBar style="dark" />
        </>
      );
    }
    return (
      <>
        <TripsScreen
          user={user}
          onCreateTrip={onCreateTrip}
          onOpenTrip={onOpenTrip}
          onOpenProfile={onOpenProfile}
          onOpenNotifications={onOpenNotifications}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <View style={styles.fallback}>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  shellWeb: {
    width: '100%',
    minHeight: '100vh',
  },
  safeFill: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
