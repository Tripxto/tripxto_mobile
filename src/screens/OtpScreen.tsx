import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import { finalizeLoginAfterOtp } from '../services/auth/sessionStore';
import { getOtpService, peekDevSimulatedOtp } from '../services/otp';

const OTP_LEN = 6;

type Props = {
  phoneE164: string;
  banner?: string;
  onVerified: () => void;
  onChangeNumber: () => void;
};

export function OtpScreen({ phoneE164, banner, onVerified, onChangeNumber }: Props) {
  const r = useResponsive();
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const [cells, setCells] = useState<string[]>(() => Array(OTP_LEN).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const code = cells.join('');

  const showDevOtpHint = __DEV__ && Platform.OS === 'web';

  const refreshDevOtpHint = useCallback(() => {
    if (!showDevOtpHint) {
      setDevOtpHint(null);
      return;
    }
    const hint = peekDevSimulatedOtp(phoneE164);
    setDevOtpHint(hint ?? null);
  }, [phoneE164, showDevOtpHint]);

  useEffect(() => {
    refreshDevOtpHint();
  }, [refreshDevOtpHint]);

  const focusIndex = useCallback((i: number) => {
    const input = inputsRef.current[i];
    input?.focus();
  }, []);

  const onChangeCell = useCallback(
    (index: number, t: string) => {
      setError(null);
      const d = t.replace(/\D/g, '').slice(-1);
      setCells((prev) => {
        const next = [...prev];
        next[index] = d;
        return next;
      });
      if (d && index < OTP_LEN - 1) {
        focusIndex(index + 1);
      }
    },
    [focusIndex],
  );

  const onKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !cells[index] && index > 0) {
        focusIndex(index - 1);
      }
    },
    [cells, focusIndex],
  );

  const verify = useCallback(async () => {
    setError(null);
    if (code.length !== OTP_LEN) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const res = await getOtpService().verifyOtp(phoneE164, code);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      try {
        await finalizeLoginAfterOtp(phoneE164);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setError(
          msg === 'USER_NOT_FOUND'
            ? 'Account not found. Go back and sign in again.'
            : 'Could not complete sign-in. Try again.',
        );
        return;
      }
      onVerified();
    } catch {
      setError('Could not verify. Try again.');
    } finally {
      setBusy(false);
    }
  }, [code, onVerified, phoneE164]);

  const resend = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await getOtpService().sendOtp(phoneE164);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      refreshDevOtpHint();
      setCells(Array(OTP_LEN).fill(''));
      focusIndex(0);
    } catch {
      setError('Could not resend. Try again.');
    } finally {
      setBusy(false);
    }
  }, [focusIndex, phoneE164, refreshDevOtpHint]);

  const gap = r.moderate(6);
  const boxSize = Math.min(r.moderate(44), Math.floor((r.shortSide - r.gutter * 2 - gap * (OTP_LEN - 1)) / OTP_LEN));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? r.moderate(8) : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: r.gutter,
              paddingVertical: r.moderate(24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                padding: r.moderate(30),
                borderRadius: r.moderate(20),
                maxWidth: r.contentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <Text
              style={[
                styles.title,
                { fontSize: r.scaledFont(22), marginBottom: r.moderate(8) },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              OTP Verification
            </Text>

            {banner ? (
              <Text
                style={[
                  styles.banner,
                  { fontSize: r.scaledFont(13), marginTop: r.moderate(10) },
                ]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                {banner}
              </Text>
            ) : null}
            <Text
              style={[
                styles.body,
                { fontSize: r.scaledFont(15), marginTop: r.moderate(8) },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Enter OTP
            </Text>

            {showDevOtpHint && devOtpHint ? (
              <Text
                style={[
                  styles.devOtp,
                  { fontSize: r.scaledFont(14), marginTop: r.moderate(10) },
                ]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                selectable>
                Dev only — your code: {devOtpHint}
              </Text>
            ) : null}

            <View style={[styles.otpRow, { marginTop: r.moderate(20), marginBottom: r.moderate(8), gap }]}>
              {cells.map((val, i) => (
                <TextInput
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  style={[
                    styles.otpCell,
                    {
                      width: boxSize,
                      height: boxSize,
                      fontSize: r.scaledFont(18),
                      borderRadius: r.moderate(4),
                    },
                  ]}
                  value={val}
                  onChangeText={(t) => onChangeCell(i, t)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                  inputMode="numeric"
                  maxLength={1}
                  editable={!busy}
                  textAlign="center"
                  accessibilityLabel={`OTP digit ${i + 1}`}
                />
              ))}
            </View>

            {error ? (
              <Text
                style={[
                  styles.error,
                  { fontSize: r.scaledFont(13), marginTop: r.moderate(6) },
                ]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={verify}
              disabled={busy}
              style={({ pressed }) => [
                styles.outlineBtn,
                {
                  marginTop: r.moderate(20),
                  paddingVertical: r.moderate(10),
                  paddingHorizontal: r.moderate(20),
                  borderRadius: r.moderate(8),
                  opacity: busy ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
              accessibilityRole="button">
              <Text
                style={[styles.outlineBtnText, { fontSize: r.scaledFont(15) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                Verify
              </Text>
            </Pressable>

            <Pressable
              onPress={resend}
              disabled={busy}
              style={({ pressed }) => [
                styles.fillBtn,
                {
                  marginTop: r.moderate(10),
                  paddingVertical: r.moderate(10),
                  paddingHorizontal: r.moderate(20),
                  borderRadius: r.moderate(8),
                  opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                },
              ]}
              accessibilityRole="button">
              <Text
                style={[styles.fillBtnText, { fontSize: r.scaledFont(15) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                Resend OTP
              </Text>
            </Pressable>

            <Pressable
              onPress={onChangeNumber}
              disabled={busy}
              style={({ pressed }) => ({
                marginTop: r.moderate(20),
                opacity: pressed ? 0.75 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Change phone number">
              <Text
                style={[styles.linkLine, { fontSize: r.scaledFont(14) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                <Text style={styles.linkMuted}>Didn’t receive OTP? </Text>
                <Text style={styles.link}>Change Number</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageGray,
    minHeight: 0,
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  card: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    color: colors.loginBlue,
    textAlign: 'center',
    width: '100%',
  },
  body: {
    color: colors.slate900,
    textAlign: 'center',
    width: '100%',
  },
  banner: {
    color: colors.slate600,
    textAlign: 'center',
    width: '100%',
    lineHeight: 20,
  },
  devOtp: {
    color: colors.slate600,
    textAlign: 'center',
    width: '100%',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'nowrap',
  },
  otpCell: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.inputBorder,
    color: colors.slate900,
    fontWeight: '600',
    minWidth: 0,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    width: '100%',
  },
  outlineBtn: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.loginBlue,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: colors.loginBlue,
    fontWeight: '600',
  },
  fillBtn: {
    backgroundColor: colors.loginBlue,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
  linkLine: {
    textAlign: 'center',
  },
  linkMuted: {
    color: colors.slate600,
  },
  link: {
    color: colors.loginBlue,
    fontWeight: '600',
  },
});
