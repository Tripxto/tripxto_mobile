import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

import { checkRegistrationStatus } from '../services/auth/sessionStore';
import { getOtpService, peekDevSimulatedOtp } from '../services/otp';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import { isValidIndiaMobile, sanitizeIndiaMobile, toIndiaE164 } from '../utils/phone';

type Props = {
  onRegisterRequired: (phoneE164: string) => void;
  onProceedToOtp: (phoneE164: string, banner: string) => void;
};

export function LoginScreen({ onRegisterRequired, onProceedToOtp }: Props) {
  const r = useResponsive();
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const digits = useMemo(() => sanitizeIndiaMobile(phoneInput), [phoneInput]);

  const onChangePhone = useCallback((t: string) => {
    setError(null);
    setPhoneInput(t);
  }, []);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!isValidIndiaMobile(digits)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    const e164 = toIndiaE164(digits);
    setBusy(true);
    try {
      const status = await checkRegistrationStatus(e164);
      if (status === 'new') {
        onRegisterRequired(e164);
        return;
      }
      const res = await getOtpService().sendOtp(e164);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const devWebOtpHint =
        __DEV__ && Platform.OS === 'web' ? peekDevSimulatedOtp(e164) ?? null : null;
      const banner =
        status === 'verified'
          ? 'Account already exists. Enter the OTP to sign in.'
          : 'Finish signup — we sent a code to your number.';
      onProceedToOtp(
        e164,
        devWebOtpHint ? `${banner}\n\nDev web OTP: ${devWebOtpHint}` : banner,
      );
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '';
      setError(message ? `Unable to continue: ${message}` : 'Unable to continue right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [digits, onProceedToOtp, onRegisterRequired]);

  const cardPad = r.moderate(30);
  const radius = r.moderate(20);

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
                padding: cardPad,
                borderRadius: radius,
                maxWidth: r.contentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: r.scaledFont(22),
                  marginBottom: r.moderate(8),
                },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Login into TripXTO
            </Text>

            <Text
              style={[
                styles.body,
                { fontSize: r.scaledFont(15), marginTop: r.moderate(12) },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Enter your mobile number to continue
            </Text>

            <View
              style={[
                styles.inputRow,
                {
                  marginTop: r.moderate(20),
                  borderRadius: r.moderate(4),
                },
              ]}>
              <View style={[styles.prefix, { padding: r.moderate(10) }]}>
                <Text
                  style={[styles.prefixText, { fontSize: r.scaledFont(15) }]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                  +91
                </Text>
              </View>
              {Platform.OS === 'web'
                ? React.createElement('input', {
                    value: phoneInput,
                    onChange: (e: { target: { value: string } }) => {
                      onChangePhone(e.target.value);
                    },
                    placeholder: '9876543210',
                    inputMode: 'tel',
                    autoComplete: 'tel-national',
                    maxLength: 20,
                    'aria-label': 'Mobile number',
                    disabled: busy,
                    style: {
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: colors.slate900,
                      fontSize: `${r.scaledFont(16)}px`,
                      padding: `${r.moderate(10)}px`,
                    },
                  })
                : (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        paddingVertical: r.moderate(10),
                        paddingHorizontal: r.moderate(10),
                        fontSize: r.scaledFont(16),
                      },
                    ]}
                    placeholder="9876543210"
                    placeholderTextColor={colors.slate600}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneInput}
                    onChangeText={onChangePhone}
                    editable={!busy}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    accessibilityLabel="Mobile number"
                  />
                )}
            </View>

            <Text
              style={[
                styles.hint,
                { fontSize: r.scaledFont(13), marginTop: r.moderate(12) },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              New users will create an account next. Existing users receive an OTP.
            </Text>

            {error ? (
              <Text
                style={[
                  styles.error,
                  { fontSize: r.scaledFont(13), marginTop: r.moderate(10) },
                ]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  marginTop: r.moderate(24),
                  paddingVertical: r.moderate(12),
                  paddingHorizontal: r.moderate(30),
                  borderRadius: r.moderate(8),
                  opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}>
              <Text
                style={[styles.primaryBtnText, { fontSize: r.scaledFont(16) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                {busy ? 'Please wait…' : 'Continue'}
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
  hint: {
    color: colors.slate600,
    textAlign: 'center',
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.inputBorder,
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  prefix: {
    backgroundColor: colors.prefixBg,
    justifyContent: 'center',
  },
  prefixText: {
    fontWeight: '600',
    color: colors.slate900,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.slate900,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: colors.loginBlue,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
});
