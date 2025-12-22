import { Text, type TextProps } from 'react-native';

import { TextStyles } from '@/constants/Typography';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Map legacy types to new TextStyles variants
  const getTextStyle = () => {
    switch (type) {
      case 'title':
        return TextStyles.h1;
      case 'subtitle':
        return TextStyles.h3;
      case 'defaultSemiBold':
        return TextStyles.bodyMedium;
      case 'link':
        return { ...TextStyles.body, color: '#0a7ea4' };
      case 'default':
      default:
        return TextStyles.body;
    }
  };

  return (
    <Text
      style={[
        getTextStyle(),
        { color: type === 'link' ? '#0a7ea4' : color },
        style,
      ]}
      {...rest}
    />
  );
}
