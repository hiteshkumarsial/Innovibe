import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      // Connects directly to backend API and authenticates candidate
      const user = await api.tokenLogin('student@gmail.com', 'Google Candidate');
      onLoginSuccess(user);
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Make sure FastAPI backend is running on port 8000');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const user = await api.tokenLogin('guest@raisethebar.ai', 'Guest Engineer');
      onLoginSuccess(user);
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Make sure FastAPI backend is running on port 8000');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.topHeader}>
        <View style={styles.miniLogo}>
          <View style={[styles.miniBar, { height: 12, backgroundColor: theme.colors.cardDark }]} />
          <View style={[styles.miniBar, { height: 18, backgroundColor: theme.colors.accentLime }]} />
          <View style={[styles.miniBar, { height: 24, backgroundColor: theme.colors.cardDark }]} />
          <View style={[styles.miniBar, { height: 14, backgroundColor: theme.colors.accentLime }]} />
        </View>
        <Text style={styles.topBrandName}>
          Raise<Text style={styles.limeText}>TheBar</Text>
        </Text>
      </View>

      {/* Main Center Content */}
      <View style={styles.centerSection}>
        {/* Neon Lime Tag */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>AI SCREENING & INTERVIEW GRILLING</Text>
        </View>

        {/* Hero Title */}
        <Text style={styles.heroTitle}>
          Defend your code.{'\n'}
          Beat the hiring bar.
        </Text>

        <Text style={styles.heroSubtitle}>
          The adaptive technical interviewer that probes your architecture, detects bluffing, and trains you for top-tier rounds.
        </Text>

        {/* 3 Value Pillars */}
        <View style={styles.pillarsContainer}>
          <View style={styles.pillarItem}>
            <View style={styles.pillarCheck}>
              <Feather name="check" size={12} color={theme.colors.cardDark} />
            </View>
            <Text style={styles.pillarItemText}>3-Deep probing on edge cases & scale</Text>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarCheck}>
              <Feather name="check" size={12} color={theme.colors.cardDark} />
            </View>
            <Text style={styles.pillarItemText}>Loophole Hunter exposes weak assumptions</Text>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarCheck}>
              <Feather name="check" size={12} color={theme.colors.cardDark} />
            </View>
            <Text style={styles.pillarItemText}>Actionable "Say This Instead" post-mortem</Text>
          </View>
        </View>

        {/* The 3D Layered Card for Auth */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardBackdrop2} />
          <View style={styles.cardBackdrop1} />

          <View style={styles.authCard}>
            <Text style={styles.authCardHeader}>GET STARTED</Text>
            <Text style={styles.authCardSub}>
              Sign in to save your interview diagnostics, track performance trends, and customize your hiring bar.
            </Text>

            {/* Google Button as designed */}
            <TouchableOpacity
              style={[styles.googleButton, isAuthenticating && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isAuthenticating}
              activeOpacity={0.85}
            >
              {isAuthenticating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.colors.textDark} size="small" />
                  <Text style={styles.loadingText}>Authenticating with server...</Text>
                </View>
              ) : (
                <View style={styles.googleButtonContent}>
                  <View style={styles.googleIconBadge}>
                    <FontAwesome5 name="google" size={16} color="#4285F4" />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Continue as Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestSignIn}
              disabled={isAuthenticating}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
              <Feather name="arrow-right" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.bottomFooter}>
        <Text style={styles.termsText}>
          By continuing, you agree to RaiseTheBar's Evaluation Terms.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLogo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 3,
  },
  miniBar: {
    width: 4,
    borderRadius: 2,
  },
  topBrandName: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.5,
  },
  limeText: {
    color: '#65a30d',
  },
  centerSection: {
    marginVertical: 'auto',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentLime,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    marginBottom: 12,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginBottom: 18,
  },
  pillarsContainer: {
    marginBottom: 24,
    gap: 8,
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillarCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarItemText: {
    fontSize: 13,
    color: theme.colors.textDark,
    fontWeight: '600',
  },
  cardWrapper: {
    position: 'relative',
    marginTop: 6,
  },
  cardBackdrop2: {
    position: 'absolute',
    bottom: -16,
    left: 20,
    right: 20,
    height: 36,
    backgroundColor: '#dbded4',
    borderRadius: theme.radius.cardLg,
  },
  cardBackdrop1: {
    position: 'absolute',
    bottom: -8,
    left: 10,
    right: 10,
    height: 36,
    backgroundColor: '#e6e9df',
    borderRadius: theme.radius.cardLg,
  },
  authCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.cardLg,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ecefe6',
  },
  authCardHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  authCardSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e5dc',
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  bottomFooter: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    textAlign: 'center',
  },
});
