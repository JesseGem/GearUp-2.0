import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

type BrandLogoProps = {
  appearance?: 'light' | 'dark';
  markOnly?: boolean;
  width?: number;
};

const LOGO_ASSETS = {
  lightWordmark: require('../../assets/GearUp-Wordmark-Light-on-Dark.png'),
  darkWordmark: require('../../assets/GearUp-Wordmark-Dark-on-Light.png'),
  lightMark: require('../../assets/GearUp-Icon-White.png'),
  darkMark: require('../../assets/GearUp-Icon.png'),
};

const WORDMARK_ASPECT_RATIO = 256 / 80;

export default function BrandLogo({ appearance = 'light', markOnly = false, width = 180 }: BrandLogoProps) {
  const source = markOnly
    ? appearance === 'dark' ? LOGO_ASSETS.darkMark : LOGO_ASSETS.lightMark
    : appearance === 'dark' ? LOGO_ASSETS.darkWordmark : LOGO_ASSETS.lightWordmark;

  return (
    <View style={{ width, aspectRatio: markOnly ? 1 : WORDMARK_ASPECT_RATIO }}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        accessible
        accessibilityLabel="GearUp"
      />
    </View>
  );
}
