import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainBottomNav } from '../components/MainBottomNav';
import type { AuthUser } from '../services/auth/sessionStore';
import { updateSessionProfileNames } from '../services/auth/sessionStore';
import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';

type Props = {
  user: AuthUser;
  onHome: () => void;
  onAddTrip: () => void;
  onNotifications: () => void;
  onSignOut: () => void;
  onProfileUpdated: (next: AuthUser) => void;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || '-'}</Text>
      </View>
    </View>
  );
}

export function ProfileScreen({ user, onHome, onAddTrip, onNotifications, onSignOut, onProfileUpdated }: Props) {
  const r = useResponsive();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saving, setSaving] = useState(false);

  const onSave = useCallback(async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f) {
      Alert.alert('Profile', 'First name is required.');
      return;
    }
    setSaving(true);
    try {
      const next = await updateSessionProfileNames(f, l);
      if (!next) {
        Alert.alert('Profile', 'Could not save profile. Please sign in again.');
        return;
      }
      onProfileUpdated(next);
      Alert.alert('Profile', 'Profile updated.');
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, onProfileUpdated]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: r.gutter,
          paddingVertical: r.moderate(20),
          paddingBottom: r.moderate(96),
        }}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: r.scaledFont(24) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
          Profile
        </Text>

        <View style={[styles.card, { marginTop: r.moderate(14), padding: r.moderate(16), borderRadius: r.moderate(14) }]}>
          <View style={styles.field}>
            <Text style={styles.label}>First Name</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="First name" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Last name" />
          </View>

          <ReadOnlyField label="Phone" value={user.phoneE164} />
          <ReadOnlyField label="Email" value={user.email} />
          <ReadOnlyField label="Pincode" value={user.pincode} />
          <ReadOnlyField label="City" value={user.city} />
          <ReadOnlyField label="State" value={user.state} />
          <ReadOnlyField label="Country" value={user.country} />
          <ReadOnlyField label="Status" value={user.status} />
          <ReadOnlyField label="Phone Verified" value={user.phoneVerified ? 'Yes' : 'No'} />

          <Pressable onPress={() => void onSave()} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.65 }]}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>

          <Pressable onPress={onSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutTxt}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <MainBottomNav
        active="profile"
        profileLabel={user.firstName?.trim() || 'Profile'}
        onHome={onHome}
        onAddTrip={onAddTrip}
        onAlerts={onNotifications}
        onProfile={() => {}}
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
    color: colors.slate900,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.gray200,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray600,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.gray900,
  },
  readOnlyBox: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.gray100,
  },
  readOnlyText: {
    color: colors.gray700,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: colors.blue600,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  saveTxt: {
    color: colors.white,
    fontWeight: '700',
  },
  signOutBtn: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.red500,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutTxt: {
    color: colors.red600,
    fontWeight: '700',
  },
});
