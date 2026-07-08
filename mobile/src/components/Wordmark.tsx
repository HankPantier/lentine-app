import { Image } from 'expo-image';

const LOGO = require('@/assets/images/logo-white.webp');
const ASPECT = 2560 / 662; // intrinsic ratio of the white wordmark

interface Props {
  /** Rendered width in px. Height is derived from the logo's aspect ratio. */
  width?: number;
  /** Tint for light backgrounds (the only asset is white) — e.g. colors.blue on taupe screens. */
  tint?: string;
}

/** The official Lentine Alexis wordmark (white asset; pass `tint` on light backgrounds). */
export function Wordmark({ width = 180, tint }: Props) {
  return (
    <Image
      source={LOGO}
      contentFit="contain"
      tintColor={tint}
      style={{ width, height: width / ASPECT }}
      accessibilityLabel="Lentine Alexis"
    />
  );
}
