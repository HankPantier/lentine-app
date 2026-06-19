import { View } from 'react-native';
import { colors } from '@/theme/tokens';

interface Props {
  current: number; // 0-based index of the active step
  total: number;
  dark?: boolean;
}

/** Step indicator: the active dot stretches; the rest are small. */
export function ProgressDots({ current, total, dark = false }: Props) {
  const inactive = dark ? 'rgba(255,255,255,0.28)' : colors.gray;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        return (
          <View
            key={i}
            style={{
              width: isActive ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isActive ? colors.blueLight : inactive,
            }}
          />
        );
      })}
    </View>
  );
}
