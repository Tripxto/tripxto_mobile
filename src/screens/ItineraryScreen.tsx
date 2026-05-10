import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainBottomNav } from '../components/MainBottomNav';
import { DateField } from '../components/DateField';
import { hydrateItinerary } from '../services/sync/hydrateItinerary';
import { resizeItineraryDays, saveItinerary } from '../services/trips/itineraryStore';
import { getTripById, updateTrip } from '../services/trips/tripsStore';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import type { ItineraryDay, ItineraryDocument } from '../types/itinerary';
import { formatDayHeader, inclusiveDayCount, parseYmdLocal } from '../utils/dateOnly';

type Props = {
  userId: string;
  tripId: number;
  profileLabel: string;
  onBack: () => void;
  onCreateTrip: () => void;
  onProfile: () => void;
  onNotifications: () => void;
};

const DayBlock = memo(function DayBlock({
  dayIndex,
  day,
  startYmd,
  r,
  packDraft,
  onToggleCollapsed,
  onAddPlan,
  onChangePlan,
  onChangePlanTime,
  onRemovePlan,
  onMovePlan,
  onTogglePack,
  onRemovePack,
  onPackDraft,
  onAddPack,
  onNotes,
}: {
  dayIndex: number;
  day: ItineraryDay;
  startYmd: string;
  r: ReturnType<typeof useResponsive>;
  packDraft: string;
  onToggleCollapsed: () => void;
  onAddPlan: () => void;
  onChangePlan: (pIdx: number, text: string) => void;
  onChangePlanTime: (pIdx: number, time: string) => void;
  onRemovePlan: (pIdx: number) => void;
  onMovePlan: (pIdx: number, dir: -1 | 1) => void;
  onTogglePack: (i: number) => void;
  onRemovePack: (i: number) => void;
  onPackDraft: (t: string) => void;
  onAddPack: () => void;
  onNotes: (t: string) => void;
}) {
  const header = formatDayHeader(startYmd, dayIndex);

  return (
    <View style={[styles.dayOuter, { marginBottom: r.moderate(24) }]}>
      <View style={[styles.premium, { borderRadius: r.moderate(16) }]}>
        <Pressable onPress={onToggleCollapsed} style={[styles.dayHead, { padding: r.moderate(16) }]} accessibilityRole="button">
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.dayTitle, { fontSize: r.scaledFont(13) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              {header}
            </Text>
            <Text style={[styles.daySub, { fontSize: r.scaledFont(10), marginTop: 4 }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              {day.plans.length} SCHEDULED ITEMS
            </Text>
          </View>
          <Text
            style={[
              styles.chev,
              { fontSize: r.scaledFont(18), transform: [{ rotate: day.collapsed ? '0deg' : '180deg' }] },
            ]}>
            ▼
          </Text>
        </Pressable>

        {!day.collapsed ? (
          <View style={{ paddingHorizontal: r.moderate(20), paddingBottom: r.moderate(20) }}>
            <View style={[styles.sep, { marginBottom: r.moderate(12) }]} />
            <Text style={[styles.secLabel, { fontSize: r.scaledFont(10), marginBottom: r.moderate(10) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              SCHEDULE
            </Text>

            {day.plans.map((p, pIdx) => (
              <View
                key={`p-${pIdx}`}
                style={[
                  styles.planRow,
                  {
                    padding: r.moderate(10),
                    borderRadius: r.moderate(10),
                    marginBottom: r.moderate(8),
                  },
                ]}>
                <Text style={[styles.dragDots, { fontSize: 10, marginRight: r.moderate(8) }]}>⋮⋮</Text>
                <TextInput
                  value={p.time}
                  onChangeText={(t) => onChangePlanTime(pIdx, t.replace(/[^\d:]/g, '').slice(0, 5))}
                  placeholder="09:00"
                  placeholderTextColor={colors.slate400}
                  style={[
                    styles.timeInput,
                    { fontSize: r.scaledFont(12), width: r.moderate(62), marginRight: r.moderate(8) },
                  ]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                />
                <TextInput
                  value={p.text}
                  onChangeText={(t) => onChangePlan(pIdx, t)}
                  placeholder="Activity..."
                  placeholderTextColor={colors.slate400}
                  style={[styles.planInput, { fontSize: r.scaledFont(13), flex: 1 }]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                />
                <View style={styles.reorderCol}>
                  <Pressable onPress={() => onMovePlan(pIdx, -1)} disabled={pIdx === 0} hitSlop={6}>
                    <Text style={[styles.reorderTxt, pIdx === 0 && styles.reorderOff]}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => onMovePlan(pIdx, 1)} disabled={pIdx === day.plans.length - 1} hitSlop={6}>
                    <Text style={[styles.reorderTxt, pIdx === day.plans.length - 1 && styles.reorderOff]}>↓</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => onRemovePlan(pIdx)} hitSlop={8} accessibilityLabel="Remove activity">
                  <Text style={[styles.rm, { fontSize: r.scaledFont(14) }]}>✕</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={onAddPlan}
              style={[
                styles.addAct,
                {
                  paddingVertical: r.moderate(10),
                  paddingHorizontal: r.moderate(14),
                  borderRadius: r.moderate(12),
                  marginTop: r.moderate(4),
                },
              ]}>
              <Text style={[styles.addActTxt, { fontSize: r.scaledFont(11) }]}>＋ New Activity</Text>
            </Pressable>

            <View style={[styles.sep2, { marginTop: r.moderate(20), marginBottom: r.moderate(12) }]} />
            <Text style={[styles.secLabel, { fontSize: r.scaledFont(10), marginBottom: r.moderate(10) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              PACKING CHECKLIST
            </Text>

            {day.packing.map((it, iIdx) => (
              <View key={`k-${iIdx}`} style={[styles.packRow, { paddingVertical: r.moderate(6) }]}>
                <Pressable onPress={() => onTogglePack(iIdx)} style={[styles.cb, it.checked && styles.cbOn]} accessibilityRole="checkbox" accessibilityState={{ checked: it.checked }}>
                  {it.checked ? <Text style={styles.cbMark}>✓</Text> : null}
                </Pressable>
                <Text
                  style={[
                    styles.packTxt,
                    { fontSize: r.scaledFont(12), flex: 1 },
                    it.checked && styles.packStrike,
                  ]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                  {it.text}
                </Text>
                <Pressable onPress={() => onRemovePack(iIdx)} hitSlop={8}>
                  <Text style={styles.rm}>✕</Text>
                </Pressable>
              </View>
            ))}

            <View style={[styles.packAddRow, { marginTop: r.moderate(8), gap: r.moderate(8) }]}>
              <TextInput
                value={packDraft}
                onChangeText={onPackDraft}
                placeholder="Item..."
                placeholderTextColor={colors.slate400}
                style={[
                  styles.packIn,
                  {
                    flex: 1,
                    padding: r.moderate(8),
                    borderRadius: r.moderate(8),
                    fontSize: r.scaledFont(12),
                  },
                ]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
              />
              <Pressable
                onPress={onAddPack}
                style={[
                  styles.addPackBtn,
                  { paddingHorizontal: r.moderate(14), paddingVertical: r.moderate(8), borderRadius: r.moderate(8) },
                ]}>
                <Text style={[styles.addPackBtnTxt, { fontSize: r.scaledFont(11) }]}>Add</Text>
              </Pressable>
            </View>

            <View style={[styles.sep2, { marginTop: r.moderate(20), marginBottom: r.moderate(8) }]} />
            <Text style={[styles.secLabel, { fontSize: r.scaledFont(10), marginBottom: r.moderate(8) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              NOTES
            </Text>
            <TextInput
              value={day.notes}
              onChangeText={onNotes}
              placeholder="Address, notes, links..."
              placeholderTextColor={colors.slate400}
              multiline
              style={[
                styles.notes,
                {
                  minHeight: r.moderate(72),
                  padding: r.moderate(10),
                  borderRadius: r.moderate(12),
                  fontSize: r.scaledFont(12),
                },
              ]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
});

export function ItineraryScreen({ userId, tripId, profileLabel, onBack, onCreateTrip, onProfile, onNotifications }: Props) {
  const r = useResponsive();
  const { width: winW } = useWindowDimensions();
  const [doc, setDoc] = useState<ItineraryDocument | null>(null);
  const [packDraft, setPackDraft] = useState<Record<number, string>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const aboutPrev = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const trip = await getTripById(userId, tripId);
      if (!alive) return;
      if (!trip) {
        onBack();
        return;
      }
      await hydrateItinerary(userId, trip, {
        onUpdate: (d) => {
          if (!alive) return;
          setDoc(d);
        },
      });
    })();
    return () => {
      alive = false;
    };
  }, [onBack, tripId, userId]);

  useEffect(() => {
    if (!doc) return;
    if (aboutPrev.current !== null && aboutPrev.current !== doc.about) {
      aboutPrev.current = doc.about;
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1000);
      return () => clearTimeout(t);
    }
    aboutPrev.current = doc.about;
    return undefined;
  }, [doc?.about, doc]);

  useEffect(() => {
    if (!doc) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveItinerary(userId, doc);
        const base = await getTripById(userId, doc.tripId);
        if (base) {
          await updateTrip(userId, {
            ...base,
            startDate: doc.startDate,
            endDate: doc.endDate,
            about: doc.about,
            title: doc.title,
          });
        }
      } catch {
        /* offline / storage */
      }
    }, 450);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, userId]);

  const setDates = useCallback((start: string, end: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const n = inclusiveDayCount(start, end);
      if (n <= 0) return { ...prev, startDate: start, endDate: end };
      return {
        ...prev,
        startDate: start,
        endDate: end,
        days: resizeItineraryDays(prev.days, n),
      };
    });
  }, []);

  const listHeader = useMemo(() => {
    if (!doc) return null;
    return (
      <View style={{ paddingHorizontal: r.gutter, paddingTop: r.moderate(12) }}>
        <View style={[styles.nav, { marginBottom: r.moderate(16), gap: r.moderate(8) }]}>
          <Text style={[styles.brand, { fontSize: r.scaledFont(20) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
            TripXto
          </Text>
          <View style={styles.navRight}>
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={[styles.navMuted, { fontSize: r.scaledFont(13) }]}>Trips</Text>
            </Pressable>
            <Pressable
              onPress={onCreateTrip}
              style={[
                styles.createPill,
                { paddingHorizontal: r.moderate(14), paddingVertical: r.moderate(8), borderRadius: 999 },
              ]}>
              <Text style={[styles.createPillTxt, { fontSize: r.scaledFont(12) }]}>Create Trips</Text>
            </Pressable>
          </View>
        </View>

        <TextInput
          value={doc.title}
          onChangeText={(t) => setDoc((p) => (p ? { ...p, title: t } : p))}
          placeholder="Trip title"
          placeholderTextColor={colors.slate300}
          style={[
            styles.bigTitle,
            {
              fontSize: r.scaledFont(32),
              marginBottom: r.moderate(16),
            },
          ]}
          maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
        />

        <View style={[styles.grid2, { gap: r.moderate(12), marginBottom: r.moderate(12) }]}>
          <View style={[styles.premium, { borderRadius: r.moderate(16), padding: r.moderate(16) }]}>
            <Text style={[styles.cardLbl, { fontSize: r.scaledFont(10), marginBottom: r.moderate(10) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              CHANGE DATE & DURATION
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: r.moderate(8), flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <DateField label="" valueYmd={doc.startDate} onChangeYmd={(ymd) => setDates(ymd, doc.endDate)} />
              </View>
              <Text style={{ color: colors.slate300, fontWeight: '800' }}>→</Text>
              <View style={{ flex: 1, minWidth: 120 }}>
                <DateField
                  label=""
                  valueYmd={doc.endDate}
                  onChangeYmd={(ymd) => setDates(doc.startDate, ymd)}
                  minimumDate={parseYmdLocal(doc.startDate)}
                />
              </View>
            </View>
          </View>

          <View style={[styles.premium, { borderRadius: r.moderate(16), padding: r.moderate(16) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: r.moderate(6) }}>
              <Text style={[styles.cardLbl, { fontSize: r.scaledFont(10) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                ABOUT THIS TRIP
              </Text>
              <Text style={[styles.saved, { fontSize: r.scaledFont(9), opacity: savedFlash ? 1 : 0 }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                SAVED
              </Text>
            </View>
            <TextInput
              value={doc.about}
              onChangeText={(t) => setDoc((p) => (p ? { ...p, about: t } : p))}
              multiline
              style={[styles.aboutIn, { fontSize: r.scaledFont(13), minHeight: r.moderate(72) }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
            />
          </View>
        </View>
      </View>
    );
  }, [doc, onBack, onCreateTrip, r, savedFlash, setDates, winW]);

  const renderDay = useCallback(
    ({ item, index }: { item: ItineraryDay; index: number }) => {
      if (!doc) return null;
      return (
        <DayBlock
          dayIndex={index}
          day={item}
          startYmd={doc.startDate}
          r={r}
          packDraft={packDraft[index] ?? ''}
          onToggleCollapsed={() =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) => (i === index ? { ...d, collapsed: !d.collapsed } : d)),
                  }
                : p,
            )
          }
          onAddPlan={() =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index ? { ...d, plans: [...d.plans, { time: '09:00', text: '' }] } : d,
                    ),
                  }
                : p,
            )
          }
          onChangePlan={(pIdx, text) =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            plans: d.plans.map((pl, j) => (j === pIdx ? { ...pl, text } : pl)),
                          }
                        : d,
                    ),
                  }
                : p,
            )
          }
          onChangePlanTime={(pIdx, time) =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            plans: d.plans.map((pl, j) => (j === pIdx ? { ...pl, time } : pl)),
                          }
                        : d,
                    ),
                  }
                : p,
            )
          }
          onRemovePlan={(pIdx) =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index ? { ...d, plans: d.plans.filter((_, j) => j !== pIdx) } : d,
                    ),
                  }
                : p,
            )
          }
          onMovePlan={(pIdx, dir) =>
            setDoc((p) => {
              if (!p) return p;
              const j = pIdx + dir;
              const d = p.days[index];
              if (j < 0 || j >= d.plans.length) return p;
              const plans = [...d.plans];
              [plans[pIdx], plans[j]] = [plans[j], plans[pIdx]];
              return {
                ...p,
                days: p.days.map((day, i) => (i === index ? { ...day, plans } : day)),
              };
            })
          }
          onTogglePack={(iIdx) =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            packing: d.packing.map((it, k) =>
                              k === iIdx ? { ...it, checked: !it.checked } : it,
                            ),
                          }
                        : d,
                    ),
                  }
                : p,
            )
          }
          onRemovePack={(iIdx) =>
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index ? { ...d, packing: d.packing.filter((_, k) => k !== iIdx) } : d,
                    ),
                  }
                : p,
            )
          }
          onPackDraft={(t) => setPackDraft((prev) => ({ ...prev, [index]: t }))}
          onAddPack={() => {
            const t = (packDraft[index] ?? '').trim();
            if (!t) return;
            setDoc((p) =>
              p
                ? {
                    ...p,
                    days: p.days.map((d, i) =>
                      i === index ? { ...d, packing: [...d.packing, { text: t, checked: false }] } : d,
                    ),
                  }
                : p,
            );
            setPackDraft((prev) => ({ ...prev, [index]: '' }));
          }}
          onNotes={(t) =>
            setDoc((p) =>
              p ? { ...p, days: p.days.map((d, i) => (i === index ? { ...d, notes: t } : d)) } : p,
            )
          }
        />
      );
    },
    [doc, packDraft, r],
  );

  if (!doc) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'bottom']}>
        <Text style={{ color: colors.slate400 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}>
        <FlatList
          data={doc.days}
          keyExtractor={(_, i) => `day-${i}`}
          renderItem={renderDay}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: r.moderate(96) }}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
      <MainBottomNav
        active="home"
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
    backgroundColor: colors.pageItinerary,
    minHeight: 0,
  },
  flex: { flex: 1, minHeight: 0 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
    paddingBottom: 10,
  },
  brand: {
    fontWeight: '800',
    color: colors.blue600,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navMuted: { color: colors.slate400, fontWeight: '500' },
  createPill: { backgroundColor: colors.slate900 },
  createPillTxt: { color: colors.white, fontWeight: '700' },
  bigTitle: {
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.5,
  },
  grid2: {},
  premium: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#4207e6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
    minWidth: 0,
  },
  cardLbl: {
    fontWeight: '900',
    color: colors.slate400,
    letterSpacing: 1.2,
  },
  saved: { color: '#22c55e', fontWeight: '800' },
  aboutIn: {
    color: colors.slate600,
    textAlignVertical: 'top',
  },
  dayOuter: {},
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  dayTitle: { fontWeight: '800', color: colors.slate900 },
  daySub: { fontWeight: '800', color: colors.slate400, letterSpacing: 1 },
  chev: { color: colors.slate300 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate50 },
  sep2: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate100 },
  secLabel: { fontWeight: '900', color: colors.slate400, letterSpacing: 1.2 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dragDots: { color: colors.slate300 },
  planInput: { fontWeight: '600', color: colors.slate800, minWidth: 0 },
  timeInput: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.slate900,
    textAlign: 'center',
    fontWeight: '700',
  },
  reorderCol: { marginHorizontal: 4 },
  reorderTxt: { color: colors.indigo600, fontWeight: '800', fontSize: 12 },
  reorderOff: { opacity: 0.25 },
  rm: { color: colors.slate300, paddingHorizontal: 4 },
  addAct: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.slate200,
  },
  addActTxt: { fontWeight: '800', color: colors.slate600 },
  packRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate50 },
  cb: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.indigo600,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cbOn: { backgroundColor: colors.indigo600 },
  cbMark: { color: colors.white, fontSize: 10, fontWeight: '900' },
  packTxt: { color: colors.slate600, fontWeight: '500' },
  packStrike: { textDecorationLine: 'line-through', color: colors.slate400 },
  packAddRow: { flexDirection: 'row', alignItems: 'center' },
  packIn: { backgroundColor: colors.slate50, color: colors.slate800 },
  addPackBtn: { backgroundColor: colors.slate900 },
  addPackBtnTxt: { color: colors.white, fontWeight: '800' },
  notes: {
    backgroundColor: colors.slate50,
    color: colors.slate600,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
