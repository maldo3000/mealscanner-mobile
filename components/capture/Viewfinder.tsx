import React from 'react';
import { StyleSheet, View } from 'react-native';
import { neonGreen } from '@/constants/Colors';

export function Viewfinder(): React.ReactElement {
  return (
    <View style={styles.viewfinder}>
      <View style={styles.viewfinderRow}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
      </View>
      <View style={styles.viewfinderRow}>
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewfinder: {
    width: 280,
    height: 280,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  viewfinderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  corner: {
    width: 40,
    height: 40,
    borderColor: neonGreen,
  },
  topLeft: {
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
});



