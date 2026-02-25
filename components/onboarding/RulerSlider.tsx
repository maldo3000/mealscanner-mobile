import { glassBorder, neonGreen, textMuted } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

interface RulerSliderProps {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  unit: string;
  step?: number;
  formatValue?: (value: number) => string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = 14; // Wider ticks for better precision and touch targeting
const SNAP_INTERVAL = ITEM_WIDTH;

export function RulerSlider({ min, max, value, onValueChange, unit, step = 1, formatValue }: RulerSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const contentPadding = SCREEN_WIDTH / 2;

  // Use refs to avoid stale closures during rapid scroll events
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  valueRef.current = value;
  onValueChangeRef.current = onValueChange;

  const totalSteps = Math.round((max - min) / step);

  // Sync scroll position on mount and when the range changes (e.g. unit switch via key remount)
  useEffect(() => {
    const initialOffset = ((value - min) / step) * ITEM_WIDTH;
    // Use two rAFs to ensure layout is fully measured before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ x: initialOffset, animated: false });
      });
    });
  }, [min, max]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const rawValue = (offset / ITEM_WIDTH) * step + min;
    const snapped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));

    if (clamped !== valueRef.current) {
      valueRef.current = clamped;
      onValueChangeRef.current(clamped);
    }
  }, [min, max, step]);

  // Memoize the ruler tick marks — they only change when the range changes,
  // not on every scroll frame
  const rulerTicks = useMemo(() => {
    const items = [];
    for (let i = 0; i <= totalSteps; i++) {
      const currentValue = min + i * step;
      const isMajor = currentValue % 10 === 0;
      const isMedium = currentValue % 5 === 0 && !isMajor;

      items.push(
        <View key={i} style={[styles.rulerItem, { width: ITEM_WIDTH }]}>
          <View
            style={[
              styles.rulerLine,
              {
                height: isMajor ? 28 : isMedium ? 18 : 10,
                backgroundColor: isMajor ? neonGreen : isMedium ? 'rgba(74, 222, 128, 0.4)' : glassBorder,
                width: isMajor ? 2 : 1,
              },
            ]}
          />
        </View>,
      );
    }
    return items;
  }, [min, max, step, totalSteps]);

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <View style={styles.container}>
      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{displayValue}</Text>
        {!formatValue && <Text style={styles.unitText}>{unit}</Text>}
      </View>

      <View style={styles.rulerWrapper}>
        <View style={styles.rulerContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={SNAP_INTERVAL}
            contentContainerStyle={{ paddingHorizontal: contentPadding }}
            decelerationRate="fast"
            bounces={false}
          >
            <View style={styles.rulerTrack}>
              {rulerTicks}
            </View>
          </ScrollView>
          {/* Center indicator */}
          <View style={styles.indicator} pointerEvents="none" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 32,
    color: neonGreen,
    fontFamily: 'Telegraf_800UltraBold',
    includeFontPadding: false,
  },
  unitText: {
    ...TextStyles.body,
    color: textMuted,
    marginLeft: 6,
    fontSize: 16,
  },
  rulerWrapper: {
    height: 40,
  },
  rulerContainer: {
    height: 40,
    justifyContent: 'center',
  },
  rulerTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
  },
  rulerItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 32,
  },
  rulerLine: {
    borderRadius: 1,
  },
  indicator: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1.5,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: neonGreen,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});
