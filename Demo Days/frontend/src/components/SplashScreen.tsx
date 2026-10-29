import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
} from 'react-native';
import { theme } from '../theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animation values for the 5 dynamic bars
  const barAnim1 = useRef(new Animated.Value(24)).current;
  const barAnim2 = useRef(new Animated.Value(48)).current;
  const barAnim3 = useRef(new Animated.Value(72)).current;
  const barAnim4 = useRef(new Animated.Value(36)).current;
  const barAnim5 = useRef(new Animated.Value(60)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Fade & scale in the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse the bars continuously
    const animateBar = (animVal: Animated.Value, minH: number, maxH: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, {
            toValue: maxH,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(animVal, {
            toValue: minH,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    animateBar(barAnim1, 20, 65, 700);
    animateBar(barAnim2, 35, 90, 850);
    animateBar(barAnim3, 45, 110, 650);
    animateBar(barAnim4, 25, 80, 950);
    animateBar(barAnim5, 30, 75, 750);

    // Auto-transition after 2.4 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* The RaiseTheBar Signature Bars Logo */}
        <View style={styles.logoBadgeContainer}>
          <View style={styles.barsContainer}>
            {/* Bar 1 */}
            <Animated.View
              style={[
                styles.bar,
                { height: barAnim1, backgroundColor: theme.colors.cardDark },
              ]}
            />
            {/* Bar 2 (Lime Accent) */}
            <Animated.View
              style={[
                styles.bar,
                styles.barLime,
                { height: barAnim2, backgroundColor: theme.colors.accentLime },
              ]}
            />
            {/* Bar 3 (The Tall Raiser Bar) */}
            <Animated.View
              style={[
                styles.bar,
                { height: barAnim3, backgroundColor: theme.colors.cardDark },
              ]}
            />
            {/* Bar 4 (Lime Accent) */}
            <Animated.View
              style={[
                styles.bar,
                styles.barLime,
                { height: barAnim4, backgroundColor: theme.colors.accentLime },
              ]}
            />
            {/* Bar 5 */}
            <Animated.View
              style={[
                styles.bar,
                { height: barAnim5, backgroundColor: theme.colors.cardDark },
              ]}
            />
          </View>
        </View>

        {/* Project Brand Name */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>
            Raise<Text style={styles.brandTitleHighlight}>TheBar</Text>
          </Text>
          <View style={styles.taglinePill}>
            <View style={styles.greenDot} />
            <Text style={styles.taglineText}>HIGH-SIGNAL TECHNICAL INTERVIEW</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Loading Indicator */}
      <View style={styles.bottomFooter}>
        <Text style={styles.footerVersion}>v1.0 • PRO BAR RAISER ENGINE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    width: 140,
    height: 140,
    borderRadius: theme.radius.cardLg,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e8ebe2',
    marginBottom: 24,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 7,
    paddingBottom: 6,
  },
  bar: {
    width: 13,
    borderRadius: 7,
  },
  barLime: {
    borderWidth: 1.5,
    borderColor: theme.colors.cardDark,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -1,
    marginBottom: 8,
  },
  brandTitleHighlight: {
    color: '#65a30d', // Forest/olive lime contrasting tone
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    gap: 7,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.accentLime,
  },
  taglineText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 1.2,
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 36,
  },
  footerVersion: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    letterSpacing: 1.5,
  },
});
