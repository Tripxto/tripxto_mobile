import { useCallback, useEffect, useRef, useState } from 'react';
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

import { checkRegistrationStatus, savePendingUserProfile } from '../services/auth/sessionStore';
import { lookupIndiaPincode } from '../services/location/indiaPostal';
import { getOtpService, peekDevSimulatedOtp } from '../services/otp';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  phoneE164: string;
  onBack: () => void;
  onProceedToOtp: (banner: string) => void;
};

function maskPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(-10);
  if (d.length < 10) return e164;
  return `+91 ${d.slice(0, 2)}******${d.slice(8)}`;
}

export function RegisterScreen({ phoneE164, onBack, onProceedToOtp }: Props) {
  const r = useResponsive();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pinTimer.current) clearTimeout(pinTimer.current);
    };
  }, []);

  const onPinInput = useCallback((t: string) => {
    const p = t.replace(/\D/g, '').slice(0, 6);
    setPincode(p);
    setError(null);
    if (pinTimer.current) clearTimeout(pinTimer.current);
    setCity('');
    setState('');
    if (p.length !== 6) return;
    pinTimer.current = setTimeout(async () => {
      setPinBusy(true);
      try {
        const res = await lookupIndiaPincode(p);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setCity(res.city);
        setState(res.state);
      } finally {
        setPinBusy(false);
      }
    }, 400);
  }, []);

  const onSubmit = useCallback(async () => {
    setError(null);
    const fn = firstName.trim();
    const em = email.trim().toLowerCase();
    if (!fn) {
      setError('First name is required.');
      return;
    }
    if (!EMAIL_RE.test(em)) {
      setError('Enter a valid email address.');
      return;
    }
    if (pincode.length !== 6) {
      setError('Enter a valid 6-digit pincode.');
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError('Wait for city and state from pincode, or check the pincode.');
      return;
    }

    setBusy(true);
    try {
      const status = await checkRegistrationStatus(phoneE164);
      if (status === 'verified') {
        setError('This number already has an account. Go back and sign in.');
        return;
      }
      const saved = await savePendingUserProfile(phoneE164, {
        firstName: fn,
        lastName: lastName.trim(),
        email: em,
        pincode,
        city: city.trim(),
        state: state.trim(),
        country: 'India',
      });
      if (!saved.ok) {
        setError('This number is already registered. Go back and sign in.');
        return;
      }
      const otp = await getOtpService().sendOtp(phoneE164);
      if (!otp.ok) {
        setError(otp.message);
        return;
      }
      const devWebOtpHint =
        __DEV__ && Platform.OS === 'web' ? peekDevSimulatedOtp(phoneE164) ?? null : null;
      const banner = 'We sent a verification code. Enter it below to activate your account.';
      onProceedToOtp(devWebOtpHint ? `${banner}\n\nDev web OTP: ${devWebOtpHint}` : banner);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [city, email, firstName, lastName, onProceedToOtp, phoneE164, pincode, state]);

  const digits = phoneE164.replace(/\D/g, '').slice(-10);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: r.gutter, paddingVertical: r.moderate(20) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                padding: r.moderate(26),
                borderRadius: r.moderate(20),
                maxWidth: r.contentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <Pressable onPress={onBack} hitSlop={12} style={styles.close} accessibilityLabel="Go back">
              <Text style={{ fontSize: r.scaledFont(18), color: colors.gray500 }}>✕</Text>
            </Pressable>

            <Text style={[styles.title, { fontSize: r.scaledFont(22) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Create Account
            </Text>
            <View style={[styles.divider, { marginVertical: r.moderate(12) }]} />

            <View style={[styles.banner, { padding: r.moderate(12), marginBottom: r.moderate(16) }]}>
              <Text style={[styles.bannerTxt, { fontSize: r.scaledFont(13) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                You are a new user. Complete your profile, then verify your number with OTP.
              </Text>
              <Text style={[styles.phoneShow, { fontSize: r.scaledFont(14), marginTop: 6 }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                {maskPhone(phoneE164)}
              </Text>
            </View>

            <Text style={styles.lbl}>Phone</Text>
            <View style={[styles.phoneRow, { marginBottom: r.moderate(14) }]}>
              <View style={styles.countryBox}>
                <Text style={{ fontSize: r.scaledFont(14) }}>🇮🇳 +91</Text>
              </View>
              <TextInput
                value={digits}
                editable={false}
                style={[styles.input, styles.inputFlex, { opacity: 0.85 }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
              />
            </View>
            <Text style={[styles.helper, { marginBottom: r.moderate(12) }]}>
              To change this number, tap back and enter a different phone.
            </Text>

            <View style={[styles.row2, { gap: r.moderate(10), marginBottom: r.moderate(12) }]}>
              <TextInput
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  setError(null);
                }}
                placeholder="First Name"
                placeholderTextColor={colors.gray400}
                style={[styles.input, styles.half]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor={colors.gray400}
                style={[styles.input, styles.half]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
              />
            </View>

            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="Email"
              placeholderTextColor={colors.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { marginBottom: r.moderate(12) }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />

            <TextInput
              value={pincode}
              onChangeText={onPinInput}
              placeholder="Pincode (6 digits)"
              placeholderTextColor={colors.gray400}
              keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
              inputMode="numeric"
              maxLength={6}
              style={[styles.input, { marginBottom: r.moderate(8) }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />
            {pinBusy ? (
              <Text style={[styles.helper, { marginBottom: 8 }]}>Looking up location…</Text>
            ) : null}

            <TextInput
              value={city}
              editable={false}
              placeholder="City"
              placeholderTextColor={colors.gray400}
              style={[styles.input, { marginBottom: r.moderate(10), backgroundColor: colors.prefixBg }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />
            <TextInput
              value={state}
              editable={false}
              placeholder="State"
              placeholderTextColor={colors.gray400}
              style={[styles.input, { marginBottom: r.moderate(16), backgroundColor: colors.prefixBg }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />

            {error ? (
              <Text style={[styles.error, { marginBottom: 12 }]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                { opacity: busy ? 0.65 : pressed ? 0.92 : 1 },
              ]}>
              <Text style={styles.btnTxt}>{busy ? 'Saving…' : 'Save & send OTP'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageGray, minHeight: 0 },
  flex: { flex: 1, minHeight: 0 },
  scroll: { flexGrow: 1 },
  card: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  close: { position: 'absolute', top: 14, right: 14, zIndex: 2 },
  title: {
    fontWeight: '700',
    color: colors.loginBlue,
    textAlign: 'center',
    width: '100%',
  },
  divider: { height: 2, backgroundColor: colors.loginBlue, width: '100%' },
  banner: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue200,
  },
  bannerTxt: { color: colors.slate800, textAlign: 'center', fontWeight: '600' },
  phoneShow: { textAlign: 'center', fontWeight: '700', color: colors.loginBlue },
  lbl: { fontSize: 12, color: colors.gray500, marginBottom: 6, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryBox: {
    height: 44,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    backgroundColor: colors.prefixBg,
    justifyContent: 'center',
  },
  row2: { flexDirection: 'row' },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.gray900,
  },
  inputFlex: { flex: 1 },
  half: { flex: 1, minWidth: 0 },
  helper: { fontSize: 12, color: colors.gray500 },
  error: { color: colors.error, fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: colors.loginBlue,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
