import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainBottomNav } from '../components/MainBottomNav';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications/notificationsStore';
import type { AuthUser } from '../services/auth/sessionStore';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';

type Props = {
  user: AuthUser;
  onHome: () => void;
  onAddTrip: () => void;
  onProfile: () => void;
};

export function NotificationsScreen({ user, onHome, onAddTrip, onProfile }: Props) {
  const r = useResponsive();
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    const data = await listNotifications(user.id);
    setItems(data);
  }, [user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onMarkOneRead = useCallback(
    async (id: string) => {
      await markNotificationRead(user.id, id);
      await refresh();
    },
    [refresh, user.id],
  );

  const onMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead(user.id);
    await refresh();
  }, [refresh, user.id]);

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  const sections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);
    const todayItems: AppNotification[] = [];
    const earlierItems: AppNotification[] = [];
    for (const item of items) {
      const d = new Date(item.createdAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      if (key === todayKey) todayItems.push(item);
      else earlierItems.push(item);
    }
    const out: Array<{ title: string; data: AppNotification[] }> = [];
    if (todayItems.length) out.push({ title: 'Today', data: todayItems });
    if (earlierItems.length) out.push({ title: 'Earlier', data: earlierItems });
    return out;
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={{ paddingHorizontal: r.gutter, paddingTop: r.moderate(14), paddingBottom: r.moderate(10) }}>
        <Text style={[styles.title, { fontSize: r.scaledFont(24) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
          Notifications
        </Text>
        <View style={styles.topRow}>
          <Text style={[styles.unreadText, { fontSize: r.scaledFont(12) }]}>
            {unreadCount} unread
          </Text>
          <Pressable onPress={() => void onMarkAllRead()} accessibilityRole="button">
            <Text style={[styles.markAll, { fontSize: r.scaledFont(12) }]}>Mark all as read</Text>
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: r.gutter,
          paddingBottom: r.moderate(96),
          gap: r.moderate(10),
        }}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { padding: r.moderate(16) }]}>
            <Text style={[styles.emptyTitle, { fontSize: r.scaledFont(16) }]}>No notifications yet</Text>
            <Text style={[styles.emptyBody, { fontSize: r.scaledFont(13), marginTop: r.moderate(6) }]}>
              Create a trip to receive smart travel updates.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { fontSize: r.scaledFont(13), marginTop: r.moderate(8) }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => void onMarkOneRead(item.id)} accessibilityRole="button">
            <View style={[styles.card, { padding: r.moderate(14), borderRadius: r.moderate(12) }]}>
              <View style={styles.cardHead}>
                {!item.readAt ? <View style={styles.unreadDot} /> : <View style={styles.dotSpacer} />}
                <Text style={[styles.cardTitle, { fontSize: r.scaledFont(14) }]}>{item.title}</Text>
              </View>
              <Text style={[styles.cardBody, { fontSize: r.scaledFont(13), marginTop: r.moderate(4) }]}>{item.body}</Text>
              <Text style={[styles.cardTime, { fontSize: r.scaledFont(11), marginTop: r.moderate(8) }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <MainBottomNav
        active="alerts"
        profileLabel={user.firstName?.trim() || 'Profile'}
        onHome={onHome}
        onAddTrip={onAddTrip}
        onAlerts={() => {}}
        onProfile={onProfile}
        bottomPadding={r.moderate(10)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontWeight: '800',
    color: colors.slate900,
  },
  topRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadText: {
    color: colors.gray600,
    fontWeight: '600',
  },
  markAll: {
    color: colors.blue600,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.gray600,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyBox: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.gray200,
  },
  emptyTitle: {
    color: colors.gray900,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.gray600,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.gray200,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.blue600,
    marginRight: 8,
  },
  dotSpacer: {
    width: 9,
    marginRight: 8,
  },
  cardTitle: {
    color: colors.slate900,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.gray700,
  },
  cardTime: {
    color: colors.gray500,
  },
});
