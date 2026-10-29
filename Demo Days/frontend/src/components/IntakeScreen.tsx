import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { StartInterviewPayload, UserProfile } from '../types';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { RoadmapAssistantChat } from './RoadmapAssistantChat';

interface IntakeScreenProps {
  user?: UserProfile | null;
  onStart: (payload: StartInterviewPayload) => Promise<void>;
  isLoading: boolean;
  onUpdateUser?: (updated: Partial<UserProfile>) => Promise<void>;
  onNavigateToProfile?: () => void;
}

export const IntakeScreen: React.FC<IntakeScreenProps> = ({ user, onStart, isLoading, onUpdateUser, onNavigateToProfile }) => {
  const [activeTab, setActiveTab] = useState<'ROADMAP' | 'CUSTOM_DRILL'>('ROADMAP');
  const [candidateName, setCandidateName] = useState(user?.name || '');

  const handleNameBlur = () => {
    const trimmed = candidateName.trim();
    if (trimmed && trimmed !== user?.name && onUpdateUser) {
      onUpdateUser({ name: trimmed });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.topContainer}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <TextInput
              style={styles.candidateNameInput}
              value={candidateName}
              onChangeText={setCandidateName}
              onBlur={handleNameBlur}
              placeholder="Your Name"
              placeholderTextColor={theme.colors.textSubtle}
            />
          </View>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={onNavigateToProfile}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={18} color={theme.colors.textDark} />
            </View>
            <View style={styles.limeDot} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Section Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ROADMAP' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ROADMAP')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="map-outline"
              size={16}
              color={activeTab === 'ROADMAP' ? theme.colors.textWhite : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'ROADMAP' && styles.tabButtonTextActive,
              ]}
            >
              Roadmap
            </Text>
            {activeTab === 'ROADMAP' && <View style={styles.tabLimeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'CUSTOM_DRILL' && styles.tabButtonActive]}
            onPress={() => setActiveTab('CUSTOM_DRILL')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={16}
              color={activeTab === 'CUSTOM_DRILL' ? theme.colors.textWhite : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'CUSTOM_DRILL' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Stuck with roadmap?
            </Text>
            {activeTab === 'CUSTOM_DRILL' && <View style={styles.tabLimeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB 1: INTERACTIVE ROADMAP (Default Hero Experience) */}
      {activeTab === 'ROADMAP' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <InteractiveRoadmap
            user={user}
            onStartDrill={onStart}
            isDrillLoading={isLoading}
          />
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* TAB 2: STUCK WITH ROADMAP? (AI Mentor Chat) */}
      {activeTab === 'CUSTOM_DRILL' && (
        <View style={styles.chatSectionWrapper}>
          <RoadmapAssistantChat user={user} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topContainer: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 4,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  chatSectionWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 85,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  candidateNameInput: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.textDark,
    padding: 0,
    margin: 0,
  },
  topRightProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    letterSpacing: 0.5,
  },
  proLabel: {
    color: theme.colors.accentLime,
    fontSize: 11,
    fontWeight: '900',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1.5,
    borderColor: theme.colors.pillBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accentLime,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pillLight,
    padding: 4,
    borderRadius: theme.radius.pill,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.cardDark,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: -0.2,
  },
  tabButtonTextActive: {
    color: theme.colors.textWhite,
  },
  tabLimeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentLime,
  },
});
