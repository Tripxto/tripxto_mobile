import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  active: 'home' | 'add' | 'alerts' | 'profile';
  profileLabel: string;
  onHome: () => void;
  onAddTrip: () => void;
  onAlerts: () => void;
  onProfile: () => void;
  bottomPadding: number;
};

export function MainBottomNav({
  active,
  profileLabel,
  onHome,
  onAddTrip,
  onAlerts,
  onProfile,
  bottomPadding,
}: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomPadding, paddingTop: 8 }]}>
      <NavItem
        label="Alerts"
        icon="bell"
        active={active === 'alerts'}
        onPress={onAlerts}
        accessibilityLabel="Alerts"
      />
      <View style={styles.centerGroup}>
        <NavItem
          label="Home"
          icon="home-variant"
          active={active === 'home'}
          onPress={onHome}
          accessibilityLabel="Home"
        />
        <NavItem
          label="Add Trip"
          icon="plus-box"
          active={active === 'add'}
          onPress={onAddTrip}
          accessibilityLabel="Create trip"
        />
      </View>
      <NavItem
        label={profileLabel}
        icon="account-circle"
        active={active === 'profile'}
        onPress={onProfile}
        accessibilityLabel="Profile"
      />
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const tint = active ? colors.blue600 : colors.gray500;
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <MaterialCommunityIcons name={icon} size={24} color={tint} />
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
  },
  centerGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 22,
  },
  item: {
    minWidth: 72,
    maxWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    color: colors.gray500,
    fontWeight: '500',
    fontSize: 11,
  },
  labelActive: {
    color: colors.blue600,
    fontWeight: '700',
  },
});
