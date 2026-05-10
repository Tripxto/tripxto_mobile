import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';

/** Vibrant blue — matches brand artwork / Expo splash. */
const BRAND_BLUE = '#1155cc';
const BRAND_VIGNETTE = '#0d4a99';

/**
 * In-app splash: same wordmark treatment as assets (bold italic TripXto, white on blue).
 */
export function SplashScreenView() {
  const r = useResponsive();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(vignetteOpacity, {
        toValue: 0.26,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]);
    enter.start();
    return () => enter.stop();
  }, [logoOpacity, logoScale, vignetteOpacity]);

  const fontSize = r.scaledFont(48);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_BLUE }]} />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BRAND_VIGNETTE, opacity: vignetteOpacity },
          ]}
        />
      </View>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={[styles.inner, { paddingHorizontal: r.gutter, maxWidth: r.contentMaxWidth }]}>
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              alignItems: 'center',
            }}>
            <Text
              style={[styles.wordmark, { fontSize }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
              allowFontScaling>
              TripXto
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
  },
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  wordmark: {
    color: '#ffffff',
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: -1,
    textAlign: 'center',
  },
});
