import { type DimensionValue, View } from 'react-native';

interface Props {
  color?: string;
  width?: DimensionValue;
  marginVertical?: number;
}

/** Hairline divider / accent rule. */
export function Rule({ color = 'rgba(0,0,51,0.12)', width = '100%', marginVertical = 0 }: Props) {
  return <View style={{ height: 1, width, backgroundColor: color, marginVertical }} />;
}
