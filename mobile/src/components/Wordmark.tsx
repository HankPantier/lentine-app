import { Image } from 'expo-image';

const LOGO = require('@/assets/images/logo-white.webp');
const ASPECT = 2560 / 662; // intrinsic ratio of the white wordmark

interface Props {
  /** Rendered width in px. Height is derived from the logo's aspect ratio. */
  width?: number;
}

/** The official Lentine Alexis white wordmark (for dark/navy backgrounds). */
export function Wordmark({ width = 180 }: Props) {
  return (
    <Image
      source={LOGO}
      contentFit="contain"
      style={{ width, height: width / ASPECT }}
      accessibilityLabel="Lentine Alexis"
    />
  );
}
