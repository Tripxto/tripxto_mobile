import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainBottomNav } from '../components/MainBottomNav';
import { PROMO_SLIDES, type PromoSlide } from '../data/promoData';
import type { AuthUser } from '../services/auth/sessionStore';
import { peekWarmTrips } from '../services/cache/warmTripCache';
import { ensureWelcomeNotifications } from '../services/notifications/notificationsStore';
import { hydrateTripsList } from '../services/sync/hydrateTripsList';
import { removeTrip } from '../services/trips/tripsStore';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import type { Trip, TripCategory } from '../types/trip';
import { filterTripsByCategory } from '../utils/tripFilters';

type Props = {
  user: AuthUser;
  onCreateTrip: () => void;
  onOpenTrip: (trip: Trip) => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
};

const TABS: TripCategory[] = ['Ongoing', 'Upcoming', 'Past'];

type RMetrics = ReturnType<typeof useResponsive>;

function formatGb(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function tripImageUri(destination: string): string {
  const q = encodeURIComponent(`${destination},city`);
  return `https://source.unsplash.com/800x600/?${q}`;
}

function tripDescription(t: Trip): string {
  return t.description ?? t.about ?? `A planned journey to ${t.destination}.`;
}

function tripTitle(t: Trip): string {
  return t.title ?? `${t.destination} Trip`;
}

type PromoCarouselProps = {
  slideWidth: number;
  r: RMetrics;
  winW: number;
  onCreateTrip: () => void;
};

function PromoCarousel({ slideWidth, r, winW, onCreateTrip }: PromoCarouselProps) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<PromoSlide>>(null);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideWidth);
      setIndex(Math.max(0, Math.min(i, PROMO_SLIDES.length - 1)));
    },
    [slideWidth],
  );

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % PROMO_SLIDES.length;
        listRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [slideWidth]);

  return (
    <View
      style={[
        styles.promoShell,
        {
          borderRadius: r.moderate(16),
          marginTop: r.moderate(8),
        },
      ]}>
      <FlatList
        ref={listRef}
        data={[...PROMO_SLIDES]}
        keyExtractor={(_, i) => `promo-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({
          length: slideWidth,
          offset: slideWidth * i,
          index: i,
        })}
        renderItem={({ item }) => (
          <View style={[styles.promoSlide, { width: slideWidth }]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={{ flex: 1, backgroundColor: item.gradient[0] }} />
                <View style={{ flex: 1, backgroundColor: item.gradient[1] }} />
              </View>
            </View>
            <View style={[styles.promoInner, { padding: r.moderate(20) }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={[
                    styles.promoPill,
                    {
                      paddingHorizontal: r.moderate(10),
                      paddingVertical: r.moderate(4),
                      alignSelf: 'flex-start',
                      marginBottom: r.moderate(10),
                    },
                  ]}>
                  <Text
                    style={[styles.promoPillText, { fontSize: r.scaledFont(11) }]}
                    maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                    {item.type.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[styles.promoTitle, { fontSize: r.scaledFont(22), marginBottom: r.moderate(8) }]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                  numberOfLines={3}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.promoDesc, { fontSize: r.scaledFont(13), marginBottom: r.moderate(12) }]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                  numberOfLines={4}>
                  {item.description}
                </Text>
                <Pressable
                  onPress={onCreateTrip}
                  style={[
                    styles.promoCta,
                    {
                      paddingHorizontal: r.moderate(18),
                      paddingVertical: r.moderate(8),
                      borderRadius: r.moderate(12),
                      alignSelf: 'flex-start',
                    },
                  ]}>
                  <Text
                    style={[styles.promoCtaText, { fontSize: r.scaledFont(14) }]}
                    maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                    numberOfLines={1}>
                    {item.buttonText}
                  </Text>
                </Pressable>
              </View>
              {winW >= 520 ? (
                <Image
                  source={{ uri: `https://source.unsplash.com/350x220/?${item.imageQuery}` }}
                  style={[
                    styles.promoImg,
                    {
                      width: r.moderate(140),
                      height: r.moderate(100),
                      borderRadius: r.moderate(12),
                      marginLeft: r.moderate(12),
                    },
                  ]}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
            </View>
          </View>
        )}
      />
      <View style={[styles.dotsRow, { bottom: r.moderate(10) }]} pointerEvents="none">
        {PROMO_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: r.moderate(8),
                height: r.moderate(8),
                borderRadius: r.moderate(4),
                marginHorizontal: r.moderate(4),
                backgroundColor: i === index ? colors.white : 'rgba(255,255,255,0.45)',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function TripsScreen({ user, onCreateTrip, onOpenTrip, onOpenProfile, onOpenNotifications }: Props) {
  const r = useResponsive();
  const { width: winW } = useWindowDimensions();
  const profileLabel = user.firstName?.trim() || 'Profile';
  const [category, setCategory] = useState<TripCategory>('Ongoing');
  const [trips, setTrips] = useState<Trip[]>(() => peekWarmTrips(user.id) ?? []);
  const [loading, setLoading] = useState(() => peekWarmTrips(user.id) == null);
  const [refreshing, setRefreshing] = useState(false);

  const slideWidth = Math.max(280, winW - r.gutter * 2);
  const numColumns = winW >= 720 ? 2 : 1;
  const cardGap = r.moderate(numColumns === 2 ? 12 : 16);

  const runHydrate = useCallback(
    async (mode: 'initial' | 'manual') => {
      if (mode === 'manual') setRefreshing(true);
      else if (!peekWarmTrips(user.id)) setLoading(true);
      try {
        await hydrateTripsList(user.id, {
          onUpdate: (list, meta) => {
            setTrips(list);
            if (mode === 'initial' && (meta.pass === 'disk' || meta.pass === 'remote')) {
              setLoading(false);
            }
          },
        });
      } catch {
        if (mode === 'initial') {
          setTrips([]);
          setLoading(false);
        }
      } finally {
        if (mode === 'manual') setRefreshing(false);
        setLoading(false);
      }
    },
    [user.id],
  );

  useEffect(() => {
    void runHydrate('initial');
  }, [runHydrate]);

  useEffect(() => {
    void ensureWelcomeNotifications(user.id, user.firstName);
  }, [user.firstName, user.id]);

  const filtered = useMemo(
    () => filterTripsByCategory(trips, category),
    [trips, category],
  );

  const onDeleteTrip = useCallback(
    (trip: Trip) => {
      const doDelete = async () => {
        const next = trips.filter((t) => t.id !== trip.id);
        setTrips(next);
        try {
          await removeTrip(user.id, trip.id);
        } catch {
          Alert.alert('Delete failed', 'Could not delete trip right now. Please try again.');
          void runHydrate('initial');
        }
      };

      if (Platform.OS === 'web') {
        const ok =
          typeof globalThis !== 'undefined' &&
          typeof globalThis.confirm === 'function'
            ? globalThis.confirm(`Remove "${tripTitle(trip)}"?`)
            : true;
        if (ok) {
          void doDelete();
        }
        return;
      }

      Alert.alert('Delete trip', `Remove “${tripTitle(trip)}”?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void doDelete();
          },
        },
      ]);
    },
    [runHydrate, trips, user.id],
  );

  const listHeader = useMemo(
    () => (
      <View style={{ paddingBottom: r.moderate(8) }}>
        <PromoCarousel slideWidth={slideWidth} r={r} winW={winW} onCreateTrip={onCreateTrip} />

        <View style={[styles.sectionHead, { paddingVertical: r.moderate(24), marginTop: r.moderate(12) }]}>
          <Text
            style={[styles.h1, { fontSize: r.scaledFont(28), marginBottom: r.moderate(8) }]}
            maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
            <Text style={styles.h1Dark}>Your Global Journey, </Text>
            <Text style={styles.h1Blue}>Perfectly Cataloged.</Text>
          </Text>
          <Text
            style={[styles.sub, { fontSize: r.scaledFont(15), marginBottom: r.moderate(20) }]}
            maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
            Organize your past escapes and upcoming horizons with{' '}
            <Text style={styles.subStrong}>uncompromising clarity and professional detail.</Text>
          </Text>

          <View style={[styles.tabWrap, { marginTop: r.moderate(8) }]}>
            <View
              style={[
                styles.tabBar,
                {
                  padding: r.moderate(4),
                  borderRadius: r.moderate(12),
                  gap: r.moderate(4),
                },
              ]}>
              {TABS.map((tab) => {
                const active = tab === category;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setCategory(tab)}
                    style={[
                      styles.tabBtn,
                      {
                        paddingVertical: r.moderate(12),
                        paddingHorizontal: r.moderate(20),
                        borderRadius: r.moderate(10),
                        backgroundColor: active ? colors.tabActive : 'transparent',
                        shadowOpacity: active ? 0.22 : 0,
                        shadowRadius: active ? r.moderate(7) : 0,
                        shadowOffset: { width: 0, height: 3 },
                        shadowColor: '#059669',
                        elevation: active ? 3 : 0,
                      },
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}>
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          fontSize: r.scaledFont(14),
                          color: active ? colors.white : colors.tabInactive,
                          fontWeight: active ? '600' : '500',
                        },
                      ]}
                      maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                      numberOfLines={1}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    ),
    [category, onCreateTrip, r, slideWidth, winW],
  );

  const renderTrip = useCallback(
    ({ item }: { item: Trip }) => (
      <View
        style={[
          styles.cardWrap,
          numColumns === 2
            ? { width: `${100 / numColumns}%` as `${number}%`, paddingHorizontal: cardGap / 2 }
            : { width: '100%' as `${number}%` },
        ]}>
        <View style={[styles.card, { borderRadius: r.moderate(16) }]}>
          <Pressable
            onPress={() => onOpenTrip(item)}
            style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
            accessibilityRole="button"
            accessibilityHint="Opens itinerary">
            <View style={[styles.cardHero, { height: r.moderate(176) }]}>
              <Image
                source={{ uri: tripImageUri(item.destination) }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.cardHeroFade} />
              <View style={[styles.cardHeroTitle, { padding: r.moderate(16) }]}>
                <Text
                  style={[styles.cardTitle, { fontSize: r.scaledFont(18) }]}
                  maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                  numberOfLines={2}>
                  {tripTitle(item)}
                </Text>
              </View>
            </View>
            <View style={{ padding: r.moderate(20), paddingBottom: r.moderate(12) }}>
              <Text
                style={[styles.cardDates, { fontSize: r.scaledFont(15), marginBottom: r.moderate(8) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                numberOfLines={2}>
                {formatGb(new Date(item.startDate))} – {formatGb(new Date(item.endDate))}
              </Text>
              <Text
                style={[styles.cardDesc, { fontSize: r.scaledFont(13) }]}
                maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
                numberOfLines={2}>
                {tripDescription(item)}
              </Text>
            </View>
          </Pressable>
          <View style={[styles.cardFooter, { paddingHorizontal: r.moderate(20), paddingBottom: r.moderate(16) }]}>
            <Text
              style={[styles.cardTag, { fontSize: r.scaledFont(11) }]}
              maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
              {category.toUpperCase()}
            </Text>
            <Pressable
              onPress={() => onDeleteTrip(item)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Delete trip">
              <Text style={[styles.delete, { fontSize: r.scaledFont(14) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [cardGap, category, numColumns, onDeleteTrip, onOpenTrip, r],
  );

  const empty = useMemo(
    () => (
      <View
        style={[
          styles.empty,
          {
            marginTop: r.moderate(24),
            padding: r.moderate(24),
            borderRadius: r.moderate(20),
          },
        ]}>
        <View
          style={[
            styles.emptyIcon,
            {
              width: r.moderate(64),
              height: r.moderate(64),
              borderRadius: r.moderate(16),
              marginBottom: r.moderate(16),
            },
          ]}>
          <Text style={{ fontSize: r.scaledFont(28) }} accessibilityLabel="">
            ✈
          </Text>
        </View>
        <Text
          style={[styles.emptyTitle, { fontSize: r.scaledFont(20), marginBottom: r.moderate(6) }]}
          maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
          The world is waiting.
        </Text>
        <Text
          style={[styles.emptyBody, { fontSize: r.scaledFont(14), maxWidth: r.contentMaxWidth }]}
          maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
          You haven&apos;t added any trips to this category yet. Start mapping your next adventure today.
        </Text>
      </View>
    ),
    [r],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.nav, { paddingVertical: r.moderate(12), paddingHorizontal: r.gutter, gap: r.moderate(8) }]}>
        <Text
          style={[styles.logo, { fontSize: r.scaledFont(20) }]}
          maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}
          numberOfLines={1}>
          TripXto
        </Text>
        <View style={styles.tripsActive}>
          <Text style={[styles.tripsActiveText, { fontSize: r.scaledFont(12) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
            Trips
          </Text>
        </View>
      </View>

      <FlatList
        data={loading ? [] : filtered}
        key={numColumns}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!loading && filtered.length === 0 ? empty : null}
        renderItem={renderTrip}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void runHydrate('manual')} />
        }
        contentContainerStyle={{
          paddingHorizontal: r.gutter,
          paddingBottom: r.moderate(96),
        }}
        columnWrapperStyle={numColumns === 2 ? { marginHorizontal: -cardGap / 2 } : undefined}
        showsVerticalScrollIndicator={false}
      />

      <MainBottomNav
        active="home"
        profileLabel={profileLabel}
        onHome={() => setCategory('Ongoing')}
        onAddTrip={onCreateTrip}
        onAlerts={onOpenNotifications}
        onProfile={onOpenProfile}
        bottomPadding={r.moderate(10)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
    minHeight: 0,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
    minWidth: 0,
  },
  logo: {
    fontWeight: '800',
    color: colors.blue600,
    flexShrink: 1,
  },
  tripsActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.blue600,
    paddingBottom: 2,
  },
  tripsActiveText: {
    fontWeight: '600',
    color: colors.blue600,
  },
  promoShell: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  promoSlide: {
    position: 'relative',
    minHeight: 200,
    justifyContent: 'center',
  },
  promoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  promoPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
  },
  promoPillText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  promoTitle: {
    color: colors.white,
    fontWeight: '600',
  },
  promoDesc: {
    color: 'rgba(255,255,255,0.88)',
  },
  promoCta: {
    backgroundColor: colors.white,
  },
  promoCtaText: {
    color: colors.gray900,
    fontWeight: '600',
  },
  promoImg: {},
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dot: {},
  sectionHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
    alignItems: 'center',
  },
  h1: {
    textAlign: 'center',
    fontWeight: '900',
  },
  h1Dark: {
    color: colors.slate900,
  },
  h1Blue: {
    color: colors.blue600,
  },
  sub: {
    textAlign: 'center',
    color: colors.gray500,
    fontWeight: '300',
    paddingHorizontal: 4,
  },
  subStrong: {
    color: colors.slate900,
    fontWeight: '500',
  },
  tabWrap: {
    width: '100%',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(207, 201, 201, 0.24)',
    maxWidth: '100%',
  },
  tabBtn: {
    minWidth: 0,
  },
  tabLabel: {
    textAlign: 'center',
  },
  cardWrap: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHero: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeroFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardHeroTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTitle: {
    color: colors.white,
    fontWeight: '600',
  },
  cardDates: {
    color: colors.blue600,
    fontWeight: '600',
  },
  cardDesc: {
    color: colors.gray700,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray100,
    paddingTop: 12,
    marginTop: 0,
  },
  cardTag: {
    color: colors.gray400,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  delete: {
    color: colors.red500,
    fontWeight: '600',
  },
  empty: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray100,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  emptyIcon: {
    backgroundColor: colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.gray900,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.gray500,
    fontWeight: '300',
    textAlign: 'center',
  },
});
