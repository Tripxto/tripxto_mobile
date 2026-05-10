import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { MainBottomNav } from '../components/MainBottomNav';
import { DateField } from '../components/DateField';
import { notifyTripCreated } from '../services/notifications/notificationsStore';
import { addTrip } from '../services/trips/tripsStore';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import type { Trip } from '../types/trip';
import { inclusiveDayCount, parseYmdLocal, toYmd } from '../utils/dateOnly';

type Props = {
  userId: string;
  profileLabel: string;
  onBack: () => void;
  onCreateTrip: () => void;
  onProfile: () => void;
  onNotifications: () => void;
};

export function CreateTripScreen({ userId, profileLabel, onBack, onCreateTrip, onProfile, onNotifications }: Props) {
  const r = useResponsive();
  const today = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);

  const [destination, setDestination] = useState('');
  const [startYmd, setStartYmd] = useState(toYmd(new Date()));
  const [endYmd, setEndYmd] = useState(toYmd(new Date()));
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dest = destination.trim();
    const n = inclusiveDayCount(startYmd, endYmd);
    if (!dest || n <= 0) return;
    const start = parseYmdLocal(startYmd);
    const end = parseYmdLocal(endYmd);
    if (end < start) return;
    const fs = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const fe = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    setAbout(`This is a ${n}-day trip to ${dest} from ${fs} to ${fe}.`);
  }, [destination, endYmd, startYmd]);

  const onStartChange = useCallback((ymd: string) => {
    setStartYmd(ymd);
    setEndYmd(ymd);
  }, []);

  const onSubmit = useCallback(async () => {
    const dest = destination.trim();
    if (!dest) {
      Alert.alert('Missing field', 'Please enter a destination.');
      return;
    }
    const start = parseYmdLocal(startYmd);
    const end = parseYmdLocal(endYmd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      Alert.alert('Dates', 'Please choose valid dates.');
      return;
    }
    if (end < start) {
      Alert.alert('Dates', 'End date must be on or after start date.');
      return;
    }
    const trip: Trip = {
      id: Date.now(),
      destination: dest,
      startDate: startYmd,
      endDate: endYmd,
      about: about.trim(),
    };
    setBusy(true);
    try {
      await addTrip(userId, trip);
      await notifyTripCreated(userId, trip);
      onBack();
    } catch {
      Alert.alert('Save failed', 'Could not save your trip. Try again.');
    } finally {
      setBusy(false);
    }
  }, [about, destination, endYmd, onBack, startYmd, userId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: r.gutter,
              paddingVertical: r.moderate(20),
              paddingBottom: r.moderate(96),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                padding: r.moderate(24),
                borderRadius: r.moderate(16),
                maxWidth: r.contentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={[styles.close, { top: r.moderate(12), right: r.moderate(12) }]}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Text style={{ fontSize: r.scaledFont(20), color: colors.gray400 }}>✕</Text>
            </Pressable>

            <Text
              style={[
                styles.title,
                { fontSize: r.scaledFont(26), marginBottom: r.moderate(24), marginTop: r.moderate(8) },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Create Your Perfect Trip
            </Text>

            <Text style={[styles.lbl, { fontSize: r.scaledFont(13), marginBottom: r.moderate(8) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              Where are you traveling to?
            </Text>
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Places like Bengaluru, Mumbai etc"
              placeholderTextColor={colors.gray400}
              style={[
                styles.input,
                {
                  padding: r.moderate(12),
                  borderRadius: r.moderate(12),
                  fontSize: r.scaledFont(15),
                  marginBottom: r.moderate(20),
                },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />

            <Text style={[styles.lbl, { fontSize: r.scaledFont(13), marginBottom: r.moderate(8) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              How many days is your trip?
            </Text>
            <View style={[styles.row2, { gap: r.moderate(12), marginBottom: r.moderate(20) }]}>
              <DateField label="Start Date" valueYmd={startYmd} onChangeYmd={onStartChange} minimumDate={today} />
              <DateField label="End Date" valueYmd={endYmd} onChangeYmd={setEndYmd} minimumDate={parseYmdLocal(startYmd)} />
            </View>

            <Text style={[styles.lbl, { fontSize: r.scaledFont(13), marginBottom: r.moderate(8) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              About This Trip
            </Text>
            <TextInput
              value={about}
              onChangeText={setAbout}
              placeholder="Tell us more about your travel plan..."
              placeholderTextColor={colors.gray400}
              multiline
              style={[
                styles.input,
                styles.textArea,
                {
                  padding: r.moderate(12),
                  borderRadius: r.moderate(12),
                  fontSize: r.scaledFont(15),
                  marginBottom: r.moderate(20),
                  minHeight: r.moderate(88),
                },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.cta,
                {
                  paddingVertical: r.moderate(14),
                  borderRadius: r.moderate(12),
                  opacity: busy ? 0.65 : pressed ? 0.92 : 1,
                },
              ]}>
              <Text style={[styles.ctaText, { fontSize: r.scaledFont(16) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                {busy ? 'Saving…' : 'Create Trip'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <MainBottomNav
        active="add"
        profileLabel={profileLabel}
        onHome={onBack}
        onAddTrip={onCreateTrip}
        onAlerts={onNotifications}
        onProfile={onProfile}
        bottomPadding={r.moderate(10)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eff6ff',
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
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    position: 'relative',
  },
  close: {
    position: 'absolute',
    zIndex: 2,
  },
  title: {
    fontWeight: '700',
    color: colors.blue600,
    textAlign: 'center',
  },
  lbl: {
    fontWeight: '500',
    color: colors.gray700,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    color: colors.gray900,
    width: '100%',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  row2: {
    flexDirection: 'row',
    width: '100%',
  },
  cta: {
    backgroundColor: colors.blue600,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    fontWeight: '600',
  },
});
