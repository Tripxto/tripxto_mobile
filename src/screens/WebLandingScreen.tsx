import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../theme/colors';
import type { AuthUser } from '../services/auth/sessionStore';

type Props = {
  user: AuthUser | null;
  onOpenLogin: () => void;
  onContinueToApp: () => void;
};

/**
 * Web: full static marketing site from `public/marketing.html` (copy of `project/index.html`).
 * No second toolbar here — the iframe already includes nav + Login links.
 * When a session exists, only a small floating CTA opens the React app.
 */
export function WebLandingScreen({ user, onOpenLogin, onContinueToApp }: Props) {
  const iframe = useMemo(() => {
    if (Platform.OS !== 'web') return null;
    return React.createElement('iframe', {
      title: 'TripXto',
      src: '/marketing.html',
      style: {
        border: 'none',
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 0,
      },
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMsg = (evt: MessageEvent) => {
      const data = evt.data as { source?: string; target?: string } | null;
      if (!data || data.source !== 'tripxto-marketing') return;
      if (data.target === 'login' || data.target === 'create') {
        onOpenLogin();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onOpenLogin]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.iframeWrap}>{iframe}</View>
      {user ? (
        <TouchableOpacity
          onPress={onContinueToApp}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Open my trips">
          <Text style={styles.fabText}>Open my trips</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onOpenLogin}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Open app login">
          <Text style={styles.fabText}>Open app login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    minHeight: '100vh',
  },
  iframeWrap: {
    flex: 1,
    minHeight: 0,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: colors.blue600,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  fabText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
