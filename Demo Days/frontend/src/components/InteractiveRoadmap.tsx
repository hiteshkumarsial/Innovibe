import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { RoadmapDTO, RoadmapPhaseDTO, UserProfile, StartInterviewPayload } from '../types';
import { api } from '../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface InteractiveRoadmapProps {
  user?: UserProfile | null;
  onStartDrill: (payload: StartInterviewPayload) => Promise<void>;
  isDrillLoading: boolean;
}

const LEVEL_TIERS = [
  { key: 'Level 1', label: 'Level 1', sublabel: 'Zero to Foundations' },
  { key: 'Level 2', label: 'Level 2', sublabel: 'Applied Systems' },
  { key: 'Level 3', label: 'Level 3', sublabel: 'Extreme Engineering' },
] as const;

export const InteractiveRoadmap: React.FC<InteractiveRoadmapProps> = ({
  user,
  onStartDrill,
  isDrillLoading,
}) => {
  const [level, setLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 1');
  const [roadmap, setRoadmap] = useState<RoadmapDTO | null>(null);

  // Load candidate's saved preferred level on mount
  useEffect(() => {
    const loadPreferredLevel = async () => {
      try {
        const saved = await AsyncStorage.getItem('@preferred_roadmap_level');
        if (saved === 'Level 1' || saved === 'Level 2' || saved === 'Level 3' || saved === 'Beginner' || saved === 'Intermediate' || saved === 'Advanced') {
          setLevel(saved === 'Beginner' ? 'Level 1' : saved === 'Intermediate' ? 'Level 2' : saved === 'Advanced' ? 'Level 3' : saved as any);
        }
      } catch (e) {
        // ignore
      }
    };
    loadPreferredLevel();
  }, []);

  const handleSelectLevel = async (newLevel: 'Level 1' | 'Level 2' | 'Level 3') => {
    setLevel(newLevel);
    try {
      await AsyncStorage.setItem('@preferred_roadmap_level', newLevel);
    } catch (e) {
      // ignore
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const INITIAL_BATCH_SIZE = 6;
  const [visiblePhaseCount, setVisiblePhaseCount] = useState<number>(INITIAL_BATCH_SIZE);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  // Pulse animation for gentle loading state
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let isMounted = true;
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulse();
    loadRoadmap(false);

    return () => {
      isMounted = false;
    };
  }, [level]);

  const loadRoadmap = async (forceRefresh = false) => {
    setIsLoading(true);
    setVisiblePhaseCount(INITIAL_BATCH_SIZE);
    fadeAnim.setValue(0);
    slideAnim.setValue(18);

    try {
      const targetRole = user?.target_role || 'Software Engineer (SDE-1)';
      const targetCompany = user?.interested_companies || 'Top Tech Product Tier';
      const techStack = user?.primary_stack ? [user.primary_stack] : ['Python', 'FastAPI', 'PostgreSQL', 'Redis'];

      const data = await api.fetchRoadmap({
        user_id: user?.id,
        role: targetRole,
        tech_stack: techStack,
        target_company: targetCompany,
        level,
        force_refresh: forceRefresh,
      });

      setRoadmap(data);
      if (data.phases.length > 0) {
        setExpandedPhaseId(data.phases[0].id); // Expand first phase by default
      }

      // Smooth progress bar animation
      Animated.timing(progressAnim, {
        toValue: data.progress_percentage / 100,
        duration: 700,
        useNativeDriver: false,
      }).start();

      // Smooth content entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      console.error('Roadmap fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (phaseId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPhaseId(expandedPhaseId === phaseId ? null : phaseId);
  };

  const handleToggleItem = async (phaseId: string, itemId: string, currentCompleted: boolean) => {
    if (!roadmap || togglingItemId) return;
    setTogglingItemId(itemId);

    const nextCompleted = !currentCompleted;

    // Optimistic UI update
    const updatedPhases = roadmap.phases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        checklist: phase.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: nextCompleted } : item
        ),
      };
    });

    let total = 0;
    let completedCount = 0;
    updatedPhases.forEach((p) => {
      p.checklist.forEach((c) => {
        total++;
        if (c.completed) completedCount++;
      });
    });

    const newPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    setRoadmap({
      ...roadmap,
      phases: updatedPhases,
      completed_items: completedCount,
      progress_percentage: newPct,
    });

    Animated.timing(progressAnim, {
      toValue: newPct / 100,
      duration: 350,
      useNativeDriver: false,
    }).start();

    try {
      await api.toggleRoadmapItem({
        user_id: user?.id || 'anon',
        roadmap_id: roadmap.id,
        phase_id: phaseId,
        item_id: itemId,
        completed: nextCompleted,
      });
    } catch (e) {
      console.warn('Sync checklist item failed, state retained in session');
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDrillPhase = (phase: RoadmapPhaseDTO) => {
    const drillTopic = phase.drill_topic || phase.title;
    const drillClaims = `I am practicing ${phase.title} for ${roadmap?.role || 'Backend Engineer'}. Topics: ${phase.key_topics.join(', ')}. Objective: ${phase.description}`;

    onStartDrill({
      candidate_name: user?.name || 'Candidate',
      target_role: `${roadmap?.role || 'Software Engineer'} (${phase.tag})`,
      archetype: 'PRODUCT_STARTUP',
      project_description: drillClaims,
      max_turns: 6,
    });
  };

  return (
    <View style={styles.container}>
      {/* Level Selector Pills */}
      <View style={styles.levelRow}>
        {LEVEL_TIERS.map((tier) => {
          const isActive = level === tier.key;
          return (
            <TouchableOpacity
              key={tier.key}
              style={[styles.levelPill, isActive && styles.levelPillActive]}
              onPress={() => handleSelectLevel(tier.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.levelPillText, isActive && styles.levelPillTextActive]}>
                {tier.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadRoadmap(true)}
          disabled={isLoading}
          activeOpacity={0.6}
        >
          <Feather name="refresh-cw" size={14} color={theme.colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* Gentle, non-attacking loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingPulseBadge, { opacity: pulseAnim }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={theme.colors.textDark} />
            <Text style={styles.loadingPulseText}>Roadmap Guide</Text>
          </Animated.View>
          <Text style={styles.loadingTitle}>Loading {level} Roadmap...</Text>
          <Text style={styles.loadingSubtitle}>
            Setting up milestones for {user?.target_role || 'SDE-1'} at {user?.interested_companies || 'Top Product Companies'}.
          </Text>
          <View style={styles.shimmerDeck}>
            <View style={styles.shimmerCard1} />
            <View style={styles.shimmerCard2} />
          </View>
        </View>
      ) : (
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Progress Tracker Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <View>
                <View style={styles.chipRow}>

                  <View style={styles.durationChip}>
                    <Feather name="layers" size={11} color={theme.colors.textDark} />
                    <Text style={styles.durationChipText}>
                      {level === 'Level 1' ? 'Zero to Foundations' : level === 'Level 2' ? 'Applied Systems' : 'Extreme Engineering'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.progressTitle}>
                  {roadmap?.progress_percentage}% Completed
                </Text>
              </View>

              <View style={styles.counterBadge}>
                <Text style={styles.counterNumber}>
                  {roadmap?.completed_items || 0}
                  <Text style={styles.counterTotal}> / {roadmap?.total_items || 0}</Text>
                </Text>
                <Text style={styles.counterLabel}>TASKS DONE</Text>
              </View>
            </View>

            {/* Dynamic Animated Lime Progress Bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {roadmap?.summary ? (
              <Text style={styles.summaryText}>{roadmap.summary}</Text>
            ) : null}
          </View>

          {/* Phase Cards with Lazy Loading */}
          <View style={styles.phasesList}>
            {roadmap?.phases.slice(0, visiblePhaseCount).map((phase, idx) => {
              const isExpanded = expandedPhaseId === phase.id;
              const completedTasks = phase.checklist.filter((c) => c.completed).length;
              const allDone = phase.checklist.length > 0 && completedTasks === phase.checklist.length;

              return (
                <View key={phase.id} style={styles.phaseCardWrapper}>
                  {/* Subtle 3D shadow layer */}
                  <View style={styles.phaseCardShadow} />

                  <View style={styles.phaseCard}>
                    {/* Phase Header (Press to expand) */}
                    <TouchableOpacity
                      style={styles.phaseHeader}
                      onPress={() => toggleExpand(phase.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.phaseHeaderLeft}>
                        <View style={[styles.phaseNumberBadge, allDone && styles.phaseNumberBadgeDone]}>
                          {allDone ? (
                            <Feather name="check" size={13} color={theme.colors.textDark} />
                          ) : (
                            <Text style={styles.phaseNumberText}>0{phase.phase_number}</Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.phaseTitle}>{phase.title}</Text>
                        </View>
                      </View>

                      <View style={styles.chevronWrapper}>
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.textSubtle}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <Text style={styles.phaseDescription}>{phase.description}</Text>


                        {/* Interactive Checklist */}
                        <View style={styles.checklistSection}>
                          {phase.checklist.map((item) => {
                            const isToggling = togglingItemId === item.id;
                            return (
                              <TouchableOpacity
                                key={item.id}
                                style={[styles.checkItem, item.completed && styles.checkItemCompleted]}
                                onPress={() => handleToggleItem(phase.id, item.id, item.completed)}
                                activeOpacity={0.6}
                              >
                                <View
                                  style={[
                                    styles.checkbox,
                                    item.completed && styles.checkboxActive,
                                  ]}
                                >
                                  {item.completed && (
                                    <Feather name="check" size={12} color={theme.colors.textDark} />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.checkItemText,
                                    item.completed && styles.checkItemTextCompleted,
                                  ]}
                                >
                                  {item.text}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Direct Grilling Button */}
                        <TouchableOpacity
                          style={[styles.drillButton, isDrillLoading && styles.buttonDisabled]}
                          onPress={() => handleDrillPhase(phase)}
                          disabled={isDrillLoading}
                          activeOpacity={0.8}
                        >
                          <View style={styles.drillButtonContent}>
                            <MaterialCommunityIcons
                              name="sword-cross"
                              size={16}
                              color={theme.colors.textWhite}
                            />
                            <Text style={styles.drillButtonText}>
                              {isDrillLoading ? 'Entering Grill Room...' : `Grill Me on Phase 0${phase.phase_number}`}
                            </Text>
                          </View>
                          {isDrillLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.accentLime} />
                          ) : (
                            <Feather name="arrow-right" size={16} color={theme.colors.textWhite} />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* High-Performance Lazy Loading Controls */}
            {roadmap?.phases && visiblePhaseCount < roadmap.phases.length && (
              <View style={styles.lazyLoadWrapper}>
                <TouchableOpacity
                  style={styles.lazyLoadButton}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setVisiblePhaseCount((prev) => Math.min(prev + 6, roadmap.phases.length));
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.lazyLoadIconCircle}>
                    <Feather name="chevron-down" size={15} color={theme.colors.textDark} />
                  </View>
                  <Text style={styles.lazyLoadText}>
                    Load Next 6 Phases ({roadmap.phases.length - visiblePhaseCount} remaining)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.showAllButton}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setVisiblePhaseCount(roadmap.phases.length);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showAllText}>View All {roadmap.phases.length} Phases</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  levelPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
  },
  levelPillActive: {
    backgroundColor: theme.colors.cardDark,
    borderColor: theme.colors.cardDark,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  levelPillTextActive: {
    color: theme.colors.textWhite,
  },

  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  durationChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  loadingContainer: {
    padding: 24,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    alignItems: 'center',
  },
  loadingPulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentLimeSubtle,
    marginBottom: 12,
    gap: 4,
  },
  loadingPulseText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  shimmerDeck: {
    width: '100%',
    gap: 8,
  },
  shimmerCard1: {
    height: 48,
    backgroundColor: '#f0f0ea',
    borderRadius: 14,
    width: '100%',
  },
  shimmerCard2: {
    height: 48,
    backgroundColor: '#f5f5f0',
    borderRadius: 14,
    width: '85%',
  },
  progressCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 3,
  },
  trackChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  counterBadge: {
    alignItems: 'flex-end',
  },
  counterNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  counterTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  counterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#ebece6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accentLime,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  phasesList: {
    gap: 12,
  },
  phaseCardWrapper: {
    position: 'relative',
  },
  phaseCardShadow: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -4,
    height: '100%',
    backgroundColor: '#e6e6dc',
    borderRadius: theme.radius.card,
    zIndex: -1,
  },
  phaseCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    overflow: 'hidden',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  phaseNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.pillLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
  },
  phaseNumberBadgeDone: {
    backgroundColor: theme.colors.accentLime,
    borderColor: theme.colors.accentLime,
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  phaseTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  phaseTag: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  phaseDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSubtle,
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  chevronWrapper: {
    paddingLeft: 8,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f2f2ec',
    paddingTop: 12,
  },
  phaseDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  topicChip: {
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  checklistSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  checkItemCompleted: {
    opacity: 0.85,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
  },
  checkboxActive: {
    backgroundColor: theme.colors.accentLime,
    borderColor: theme.colors.accentLime,
  },
  checkItemText: {
    fontSize: 13,
    color: theme.colors.textDark,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  checkItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSubtle,
  },
  drillButton: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  drillButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillButtonText: {
    color: theme.colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  lazyLoadWrapper: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  lazyLoadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardDark,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  lazyLoadIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accentLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lazyLoadText: {
    color: theme.colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },
  showAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  showAllText: {
    color: theme.colors.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
