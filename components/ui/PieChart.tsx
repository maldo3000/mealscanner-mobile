import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps extends ViewProps {
  data: PieChartData[];
  size?: number;
  strokeWidth?: number;
}

function createArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return ['M', centerX, centerY, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function PieChart({ data, size = 200, strokeWidth = 20, style }: PieChartProps) {
  // For a donut chart, inner radius creates the hole
  const outerRadius = (size - strokeWidth) / 2;
  const innerRadius = Math.max(outerRadius - strokeWidth / 2, outerRadius * 0.3); // Ensure inner radius is reasonable
  const center = size / 2;

  // Filter out zero values and calculate total
  const filteredData = data.filter((item) => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || filteredData.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={outerRadius} fill="rgba(255, 255, 255, 0.05)" />
        </Svg>
      </View>
    );
  }

  let currentAngle = 0;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <G>
          {filteredData.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            // Create donut segment path
            const outerStart = polarToCartesian(center, center, outerRadius, startAngle);
            const outerEnd = polarToCartesian(center, center, outerRadius, endAngle);
            const innerEnd = polarToCartesian(center, center, innerRadius, endAngle);
            const innerStart = polarToCartesian(center, center, innerRadius, startAngle);
            
            const largeArcFlag = angle > 180 ? '1' : '0';
            
            const path = [
              'M', outerStart.x, outerStart.y,
              'A', outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
              'L', innerEnd.x, innerEnd.y,
              'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
              'Z'
            ].join(' ');

            currentAngle += angle;

            return (
              <Path
                key={`${item.label}-${index}`}
                d={path}
                fill={item.color}
                stroke="transparent"
                strokeWidth={0}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

