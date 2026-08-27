import { View } from 'react-native';

/**
 * A small line-art padlock drawn from primitives — no icon-font dependency, and crisp at any
 * scale unlike the bitmap 🔒 emoji it replaces. An open-bottomed arch (the shackle) sits on a
 * rounded-rectangle body; `size` is the body width in px.
 */
export function LockGlyph({ color, size = 11 }: { color: string; size?: number }) {
  const stroke = size >= 16 ? 1.5 : 1;
  const bodyW = size;
  const bodyH = Math.round(size * 0.64);
  const shackleW = Math.round(size * 0.56);
  const shackleH = Math.round(size * 0.5);
  return (
    <View style={{ width: bodyW, alignItems: 'center' }}>
      {/* Shackle: an arch — open at the bottom so its legs meet the body's top edge. */}
      <View
        style={{
          width: shackleW,
          height: shackleH,
          borderColor: color,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderTopLeftRadius: shackleW,
          borderTopRightRadius: shackleW,
          marginBottom: -stroke,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderColor: color,
          borderWidth: stroke,
          borderRadius: Math.max(1.5, size * 0.16),
        }}
      />
    </View>
  );
}
