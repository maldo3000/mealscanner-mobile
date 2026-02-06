// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house': 'home',
  'house.fill': 'home',
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'book': 'book',
  'book.fill': 'book',
  'gear': 'settings',
  
  // Actions
  'plus': 'add',
  'magnifyingglass': 'search',
  'square.and.arrow.up': 'upload',
  'cloud.download': 'cloud-download',
  'trash': 'delete',
  'pencil': 'edit',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.seal': 'verified',
  'xmark': 'close',
  'minus': 'remove',
  
  // Interface
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'keyboard-arrow-down',
  'line.3.horizontal.decrease': 'filter-list',
  'target': 'gps-fixed',
  'arrow.triangle.2.circlepath.camera': 'flip-camera-ios',
  'grid': 'grid-view',
  'list.bullet': 'view-list',
  'barcode': 'qr-code-scanner',
  
  // User & Info
  'person': 'person',
  'person.fill': 'person',
  'bell.fill': 'notifications',
  'info.circle': 'info',
  'lock.doc': 'privacy-tip',
  'chart.bar.fill': 'bar-chart',
  'clock': 'access-time',
  'hourglass': 'hourglass-empty',
  'star.fill': 'star',
  'heart.fill': 'favorite',
  'trophy.fill': 'emoji-events',
  
  // App-specific
  'fork.knife': 'restaurant',
  'brain.head.profile': 'psychology',
  'mic': 'mic',
  'flame': 'local-fire-department',
  'flame.fill': 'local-fire-department',
  'leaf.fill': 'eco',
  'bolt.fill': 'bolt',
  'drop.fill': 'water-drop',
  'figure.strengthtraining.traditional': 'fitness-center',
  'sparkles': 'auto-awesome',
  'pill': 'medication',
  'leaf.arrow.circlepath': 'cached',
  'candybar.fill': 'cookie',
  'shaker.fill': 'grain',
  
  // Legacy
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'rectangle.portrait.and.arrow.right': 'logout',
  
  // Log Again / Repeat
  'repeat': 'repeat',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
