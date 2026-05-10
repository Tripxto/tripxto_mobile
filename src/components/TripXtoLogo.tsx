import { type StyleProp, StyleSheet, Text, View, type ViewStyle, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Matches TripXto brand artwork (vibrant blue). */
const BRAND_BLUE = '#1155cc';

type Props = {
  variant?: 'fullscreen' | 'header';
  style?: StyleProp<ViewStyle>;
};

export function TripXtoLogo({ variant = 'fullscreen', style }: Props) {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const fontSize =
    variant === 'fullscreen'
      ? Math.min(56, Math.max(28, shortest * 0.11))
      : Math.min(22, Math.max(16, width * 0.052));

  const text = (
    <Text
      style={[styles.wordmark, { fontSize }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      maxFontSizeMultiplier={1.35}>
      TripXto
    </Text>
  );

  if (variant === 'fullscreen') {
    return (
      <SafeAreaView style={[styles.fullRoot, style]} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.fullCenter}>{text}</View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.headerRoot, style]}>
      <View style={styles.headerInner}>{text}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullRoot: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
  },
  fullCenter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerRoot: {
    backgroundColor: BRAND_BLUE,
    width: '100%',
  },
  headerInner: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: '#ffffff',
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: -1,
  },
});
