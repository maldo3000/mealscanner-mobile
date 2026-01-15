import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import { neonGreen, textMuted, glassBorder } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

interface RulerSliderProps {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  unit: string;
  step?: number;
  formatValue?: (value: number) => string;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 8; // Slightly smaller for more precision
const SNAP_INTERVAL = ITEM_WIDTH;

export function RulerSlider({ min, max, value, onValueChange, unit, step = 1, formatValue }: RulerSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const totalSteps = (max - min) / step;
  const contentPadding = width / 2;

  // Initial scroll position
  useEffect(() => {
    const initialOffset = (value - min) / step * ITEM_WIDTH;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: initialOffset, animated: false });
    }, 100);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const newValue = Math.round(offset / ITEM_WIDTH) * step + min;
    if (newValue !== value && newValue >= min && newValue <= max) {
      onValueChange(newValue);
    }
  };

  const renderRuler = () => {
    const items = [];
    for (let i = 0; i <= totalSteps; i++) {
      const currentValue = min + i * step;
      // Show labels every 10 units to prevent overlap
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
              }
            ]} 
          />
        </View>
      );
    }
    return items;
  };

  // Render labels separately below the ruler to prevent overlap
  const renderLabels = () => {
    const labels = [];
    for (let i = 0; i <= totalSteps; i++) {
      const currentValue = min + i * step;
      if (currentValue % 20 === 0) { // Labels every 20 units
        const position = i * ITEM_WIDTH;
        labels.push(
          <Text 
            key={currentValue} 
            style={[styles.rulerLabel, { left: position + contentPadding - 20 }]}
          >
            {currentValue}
          </Text>
        );
      }
    }
    return labels;
  };

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
          >
            <View style={styles.rulerTrack}>
              {renderRuler()}
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
  rulerLabel: {
    position: 'absolute',
    top: 45,
    width: 40,
    textAlign: 'center',
    color: textMuted,
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  indicator: {
    position: 'absolute',
    left: width / 2 - 1.5,
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
