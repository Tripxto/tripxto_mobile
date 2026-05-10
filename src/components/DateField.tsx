import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { TEXT_MAX_FONT_MULTIPLIER, useResponsive } from '../theme/responsive';
import { parseYmdLocal, toYmd } from '../utils/dateOnly';

type Props = {
  label: string;
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
  minimumDate?: Date;
  hideLabel?: boolean;
};

export function DateField({ label, valueYmd, onChangeYmd, minimumDate, hideLabel }: Props) {
  const r = useResponsive();
  const [open, setOpen] = useState(false);
  const d = parseYmdLocal(valueYmd);
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;

  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (selected) onChangeYmd(toYmd(selected));
  };

  const display = Number.isNaN(parseYmdLocal(valueYmd).getTime())
    ? 'Select date'
    : parseYmdLocal(valueYmd).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {!hideLabel ? (
        <Text
          style={[
            styles.label,
            { fontSize: r.scaledFont(11), marginBottom: r.moderate(4) },
          ]}
          maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
          {label}
        </Text>
      ) : null}
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value: valueYmd,
          min: minimumDate ? toYmd(minimumDate) : undefined,
          onChange: (e: { target: { value: string } }) => {
            const next = e.target.value;
            if (next) onChangeYmd(next);
          },
          'aria-label': `${label}, ${display}`,
          style: {
            width: '100%',
            backgroundColor: colors.slate50,
            border: `${StyleSheet.hairlineWidth}px solid ${colors.gray200}`,
            color: colors.slate800,
            fontWeight: 700,
            paddingTop: r.moderate(10),
            paddingBottom: r.moderate(10),
            paddingLeft: r.moderate(12),
            paddingRight: r.moderate(12),
            borderRadius: r.moderate(12),
            fontSize: `${r.scaledFont(14)}px`,
            boxSizing: 'border-box',
          },
        })
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.box,
            {
              paddingVertical: r.moderate(10),
              paddingHorizontal: r.moderate(12),
              borderRadius: r.moderate(12),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${display}`}>
          <Text style={[styles.boxText, { fontSize: r.scaledFont(14) }]} maxFontSizeMultiplier={TEXT_MAX_FONT_MULTIPLIER}>
            {display}
          </Text>
        </Pressable>
      )}
      {open && Platform.OS === 'ios' ? (
        <View style={styles.iosPick}>
          <DateTimePicker
            value={safe}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            onChange={onPick}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.doneBtn} accessibilityRole="button">
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={safe}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={onPick}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iosPick: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  doneBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  doneText: {
    color: colors.blue600,
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
    color: colors.gray500,
    fontWeight: '500',
  },
  box: {
    backgroundColor: colors.slate50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  boxText: {
    fontWeight: '700',
    color: colors.slate800,
  },
});
