import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { UserProfile } from '../types';

interface ProfileScreenProps {
  user?: UserProfile | null;
  onEditProfile: () => void;
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onEditProfile,
  onSignOut,
}) => {
  const [activeLevel, setActiveLevel] = useState<string>('Level 1');

  useEffect(() => {
    AsyncStorage.getItem('@preferred_roadmap_level').then((saved) => {
      if (saved) {
        const norm =
          saved.includes('1') || saved.toLowerCase() === 'beginner'
            ? 'Level 1'
            : saved.includes('2') || saved.toLowerCase() === 'intermediate'
            ? 'Level 2'
            : 'Level 3';
        setActiveLevel(norm);
      }
    }).catch(() => {});
  }, []);

  const stackList = user?.primary_stack
    ? user.primary_stack.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis'];

  const companyList = user?.interested_companies
    ? user.interested_companies.split(',').map((c) => c.trim()).filter(Boolean)
    : ['Google', 'Uber', 'Zepto', 'Meta'];

  const getInitials = (name?: string): string => {
    if (!name) return 'ENG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your engineering profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Top Navigation / Dossier Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Engineering Profile</Text>
        </View>
      </View>

      {/* 1. Main Hero Identity Card (3D Layered) */}
      <View style={styles.cardWrapper}>
        <View style={styles.cardShadow} />
        <View style={styles.card}>
          {/* Avatar & Identification */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
              <View style={styles.activeDot} />
            </View>
            <Text style={styles.userName}>{user?.name || 'Candidate Engineer'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'engineer@raisethebar.ai'}</Text>

            <View style={styles.rolePill}>
              <MaterialCommunityIcons name="briefcase-outline" size={13} color={theme.colors.textDark} />
              <Text style={styles.rolePillText}>
                {user?.target_role || 'Software Engineer'}
              </Text>
            </View>
          </View>

          {/* Key Metrics Row (3-Column Bauhaus Split) */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>TARGET LPA</Text>
              <Text style={styles.metricValue}>{user?.expected_lpa || '18-25 LPA'}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>EXPERIENCE</Text>
              <Text style={styles.metricValue}>{user?.experience_level || 'Fresher'}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>CURRICULUM</Text>
              <Text style={styles.metricValueLime}>{activeLevel}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Technical Stack Dossier */}
      <View style={styles.cardWrapper}>
        <View style={styles.cardShadow} />
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Feather name="code" size={14} color={theme.colors.textDark} />
            </View>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Confirmed Tech Stack</Text>
            </View>
          </View>

          <View style={styles.tagsGrid}>
            {stackList.map((tech, idx) => (
              <View key={idx} style={styles.stackTag}>
                <View style={styles.stackDot} />
                <Text style={styles.stackTagText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 3. Target Companies & Rubric Calibration */}
      <View style={styles.cardWrapper}>
        <View style={styles.cardShadow} />
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Feather name="crosshair" size={14} color={theme.colors.textDark} />
            </View>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Target Organizations</Text>
            </View>
          </View>

          <View style={styles.companyGrid}>
            {companyList.map((comp, idx) => (
              <View key={idx} style={styles.companyTag}>
                <Feather name="target" size={12} color={theme.colors.accentLime} />
                <Text style={styles.companyTagText}>{comp}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 4. Action Controls */}
      <View style={styles.actionsSection}>
        {/* Edit Profile Button (Primary Neo-Brutalist) */}
        <View style={styles.actionButtonWrapper}>
          <View style={styles.actionButtonShadow} />
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onEditProfile}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={15} color={theme.colors.accentLime} />
            <Text style={styles.primaryActionButtonText}>Edit Preferences & Onboarding</Text>
            <Feather name="arrow-right" size={15} color={theme.colors.accentLime} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button (Sleek Clean Bauhaus) */}
        <View style={styles.actionButtonWrapper}>
          <View style={styles.actionButtonShadow} />
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleSignOutPress}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={15} color={theme.colors.textDark} />
            <Text style={styles.secondaryActionButtonText}>Sign Out of Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  proBadge: {
    backgroundColor: theme.colors.cardDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 4,
  },
  proBadgeText: {
    color: theme.colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  proLabel: {
    color: theme.colors.accentLime,
    fontSize: 11,
    fontWeight: '900',
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  cardShadow: {
    position: 'absolute',
    top: 3,
    left: 2,
    right: -2,
    bottom: -3,
    backgroundColor: '#dbdcd4',
    borderRadius: theme.radius.card,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.cardDark,
    borderWidth: 2,
    borderColor: theme.colors.textDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.accentLime,
    letterSpacing: 1,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.accentLime,
    borderWidth: 2.5,
    borderColor: theme.colors.backgroundCard,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12.5,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 10,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebece6',
    borderWidth: 1,
    borderColor: '#dcded6',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  rolePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#fafaf8',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ebece6',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#ebece6',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  metricValueLime: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textDark,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#ebece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  stackTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf8',
    borderWidth: 1.2,
    borderColor: '#e2e3dd',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  stackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentLime,
  },
  stackTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  companyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  companyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 8,
    gap: 6,
  },
  companyTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  actionsSection: {
    marginTop: 6,
    gap: 12,
  },
  actionButtonWrapper: {
    position: 'relative',
  },
  actionButtonShadow: {
    position: 'absolute',
    top: 3,
    left: 2,
    right: -2,
    bottom: -3,
    backgroundColor: '#dbdcd4',
    borderRadius: theme.radius.pill,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 8,
  },
  primaryActionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    borderRadius: theme.radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 8,
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
});
