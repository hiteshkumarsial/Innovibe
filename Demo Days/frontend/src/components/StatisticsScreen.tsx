import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { UserProfile, UserStatisticsDTO, StartInterviewPayload, PendingPhaseDrillDTO } from '../types';
import { api } from '../services/api';

interface StatisticsScreenProps {
  user?: UserProfile | null;
  onStartDrill: (payload: StartInterviewPayload) => Promise<void>;
  isLoading?: boolean;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
}

const LEVEL_OPTIONS = ['Level 1', 'Level 2', 'Level 3'] as const;
const LEVEL_LABELS: Record<string, string> = { Beginner: 'Level 1', Intermediate: 'Level 2', Advanced: 'Level 3' };

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({
  user,
  onStartDrill,
  isLoading = false,
  onNavigateToRoadmap,
  onNavigateToProfile,
}) => {
  const [stats, setStats] = useState<UserStatisticsDTO | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 1');
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const initAndFetch = async () => {
      let initialLevel: string | undefined = undefined;
      try {
        const saved = await AsyncStorage.getItem('@preferred_roadmap_level');
        if (saved) {
          const norm = saved.includes('1') || saved.toLowerCase() === 'beginner' ? 'Level 1' : saved.includes('2') || saved.toLowerCase() === 'intermediate' ? 'Level 2' : 'Level 3';
          initialLevel = norm;
          if (isMounted) setSelectedLevel(norm);
        }
      } catch (e) {
        // ignore
      }
      fetchStatistics(false, initialLevel);
    };
    initAndFetch();
    return () => { isMounted = false; };
  }, [user]);

  const fetchStatistics = async (showRefreshIndicator = false, levelToFetch?: string) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsFetching(true);
    }
    try {
      const targetLvl = levelToFetch !== undefined ? levelToFetch : selectedLevel;
      const data = await api.getUserStatistics(user?.id, targetLvl);
      setStats(data);
      if (data.active_level) {
        const norm = data.active_level.includes('1') || data.active_level.toLowerCase() === 'beginner' ? 'Level 1' : data.active_level.includes('2') || data.active_level.toLowerCase() === 'intermediate' ? 'Level 2' : 'Level 3';
        setSelectedLevel(norm);
      }
    } catch (err) {
      console.warn('Failed to load user statistics:', err);
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  };

  const handleSelectTierChip = (tier: 'Level 1' | 'Level 2' | 'Level 3') => {
    setSelectedLevel(tier);
    AsyncStorage.setItem('@preferred_roadmap_level', tier).catch(() => {});
    fetchStatistics(false, tier);
  };

  const handleLaunchDrill = (pending: PendingPhaseDrillDTO) => {
    if (isLoading) return;
    onStartDrill({
      candidate_name: user?.name || stats?.candidate_name || 'Candidate',
      target_role: `${stats?.target_role || 'Software Engineer'} (${pending.tag})`,
      archetype: 'PRODUCT_STARTUP',
      project_description: pending.drill_claims,
      max_turns: 6,
    });
  };

  // Section A: Drills yet to be completed whose phase has been completed
  const readyForDrillPhases = (stats?.pending_drills || []).filter(
    (p) => p.status === 'PENDING_DRILL' || (p.completed_tasks === p.total_tasks && p.total_tasks > 0 && !p.has_been_drilled)
  );

  // Section B: Incomplete phase list which the user has left
  const incompletePhases = (stats?.pending_drills || []).filter(
    (p) => p.status !== 'PENDING_DRILL' && p.completed_tasks < p.total_tasks
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchStatistics(true)}
            tintColor={theme.colors.cardDark}
            colors={[theme.colors.accentLime, theme.colors.cardDark]}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.candidateName}>{user?.name || stats?.candidate_name || 'Engineer'}</Text>
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

        {/* Big Display Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>
            Progress & Drills <Text style={styles.titleCount}>({selectedLevel})</Text>
          </Text>
        </View>

        {/* Level Switcher Chips */}
        <View style={styles.tierSelectorRow}>
          {LEVEL_OPTIONS.map((tier) => {
            const isActive = selectedLevel === tier;
            const tierStats = stats?.tier_mastery?.find((t) => t.level.toLowerCase() === tier.toLowerCase());
            return (
              <TouchableOpacity
                key={tier}
                style={[styles.tierPill, isActive && styles.tierPillActive]}
                onPress={() => handleSelectTierChip(tier)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierPillText, isActive && styles.tierPillTextActive]}>
                  {tier}
                </Text>
                {tierStats && (
                  <View style={[styles.tierProgressBadge, isActive && styles.tierProgressBadgeActive]}>
                    <Text style={[styles.tierProgressText, isActive && styles.tierProgressTextActive]}>
                      {tierStats.percentage}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isFetching && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.cardDark} />
            <Text style={styles.loadingText}>Loading your progress & statistics...</Text>
          </View>
        ) : (
          <>
            {/* Top Stat Overview Grid (4 Cards) */}
            <View style={styles.statsGrid}>
              {/* Card 1: Overall Progress */}
              <View style={styles.statCard}>
                <View style={styles.statIconBadge}>
                  <MaterialCommunityIcons name="target" size={16} color={theme.colors.textDark} />
                </View>
                <Text style={styles.statBigValue}>{stats?.overall_progress_percentage ?? 0}%</Text>
                <Text style={styles.statLabel}>ROADMAP MASTERY</Text>
                <View style={styles.statProgressBar}>
                  <View
                    style={[
                      styles.statProgressBarFill,
                      { width: `${Math.min(stats?.overall_progress_percentage ?? 0, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.statSubText}>
                  {stats?.total_tasks_completed ?? 0} of {stats?.total_tasks_count ?? 40} tasks done
                </Text>
              </View>

              {/* Card 2: Phases Completed */}
              <View style={styles.statCard}>
                <View style={styles.statIconBadge}>
                  <MaterialCommunityIcons name="flag-checkered" size={16} color={theme.colors.textDark} />
                </View>
                <Text style={styles.statBigValue}>
                  {stats?.phases_completed_count ?? 0}
                  <Text style={styles.statUnitText}>/{stats?.total_phases_count ?? 10}</Text>
                </Text>
                <Text style={styles.statLabel}>PHASES FINISHED</Text>
                <View style={styles.statProgressBar}>
                  <View
                    style={[
                      styles.statProgressBarFill,
                      {
                        width: `${Math.min(
                          ((stats?.phases_completed_count ?? 0) / (stats?.total_phases_count || 1)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.statSubText}>
                  {stats?.total_phases_count ? stats.total_phases_count - stats.phases_completed_count : 0} phases remaining
                </Text>
              </View>

              {/* Card 3: Pending Defense */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: (stats?.completed_ungrilled_count ?? 0) > 0 ? theme.colors.accentLime : '#ebece6' }]}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={16} color={theme.colors.textDark} />
                </View>
                <Text style={[styles.statBigValue, (stats?.completed_ungrilled_count ?? 0) > 0 && { color: theme.colors.textDark }]}>
                  {stats?.completed_ungrilled_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>PENDING DRILLS</Text>
                <Text style={[styles.statSubText, { marginTop: 14 }]}>
                  {(stats?.completed_ungrilled_count ?? 0) > 0
                    ? 'Completed phases ready to drill'
                    : 'All completed phases drilled'}
                </Text>
              </View>

              {/* Card 4: Total Drills Completed */}
              <View style={styles.statCard}>
                <View style={styles.statIconBadge}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color={theme.colors.textDark} />
                </View>
                <Text style={styles.statBigValue}>{stats?.drilled_phases_count ?? 0}</Text>
                <Text style={styles.statLabel}>DRILLS COMPLETED</Text>
                <Text style={[styles.statSubText, { marginTop: 14 }]}>
                  Practice sessions completed
                </Text>
              </View>
            </View>

            {/* SECTION 2: LAST 7 DAYS DYNAMIC BAR GRAPH */}
            <View style={styles.blackChartCard}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={styles.chartSubHeader}>DAILY MILESTONE VELOCITY</Text>
                  <Text style={styles.chartHeaderTitle}>Last 7 Days Activity</Text>
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Milestones Done</Text>
                </View>
              </View>

              {/* The 7 Vertical Bars */}
              <View style={styles.chartPillarsRow}>
                {stats?.daily_bars?.map((bar, idx) => {
                  const isSelected = selectedBarIdx === idx;
                  const hasActivity = bar.activity_count > 0;
                  return (
                    <TouchableOpacity
                      key={bar.date}
                      style={styles.pillarColumn}
                      onPress={() => setSelectedBarIdx(isSelected ? null : idx)}
                      activeOpacity={0.8}
                    >
                      {/* Floating Count Badge above Bar */}
                      <View style={styles.countBadgeWrapper}>
                        {bar.tasks_done > 0 ? (
                          <Text style={styles.barCountPositive}>+{bar.tasks_done}</Text>
                        ) : (
                          <Text style={styles.barCountZero}>·</Text>
                        )}
                      </View>

                      {/* Bar Track & Fill */}
                      <View style={styles.barTrackContainer}>
                        <View
                          style={[
                            styles.pillarBar,
                            { height: `${bar.height_pct}%` },
                            hasActivity ? styles.pillarBarActive : styles.pillarBarResting,
                            isSelected && styles.pillarBarSelected,
                          ]}
                        />
                      </View>

                      {/* Day Label */}
                      <Text style={[styles.pillarLabel, bar.is_today && styles.pillarLabelToday, isSelected && styles.pillarLabelSelected]}>
                        {bar.day}
                      </Text>

                      {bar.is_today && <View style={styles.todayIndicatorDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tapped Day Tooltip Callout */}
              {selectedBarIdx !== null && stats?.daily_bars[selectedBarIdx] && (
                <View style={styles.selectedDayCallout}>
                  <Text style={styles.calloutTitle}>
                    {stats.daily_bars[selectedBarIdx].day} ({stats.daily_bars[selectedBarIdx].date}):
                  </Text>
                  <Text style={styles.calloutBody}>
                    {stats.daily_bars[selectedBarIdx].tasks_done} roadmap tasks verified • {stats.daily_bars[selectedBarIdx].turns_taken} interview questions defended
                  </Text>
                </View>
              )}

              {/* Summary Footer Pill */}
              <View style={styles.chartFooterRow}>
                <View style={styles.velocityTagPill}>
                  <Feather name="trending-up" size={13} color={theme.colors.accentLime} />
                  <Text style={styles.velocityTagText}>
                    {stats?.weekly_tasks_count ?? 0} Tasks Crushed This Week
                  </Text>
                </View>
                <View style={styles.peakTag}>
                  <Text style={styles.peakTagText}>Peak: {stats?.peak_day_name || 'Wed'}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 3: PICK WHERE YOU LEFT */}
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="bookmark-check-outline" size={20} color={theme.colors.textDark} />
                  <Text style={styles.sectionMainTitle}>Pick where you left</Text>
                </View>
              </View>

              {/* Ready for Drill Phases (Phase Complete, Drill Pending) */}
              {readyForDrillPhases.map((phase) => (
                <View key={phase.phase_id} style={styles.pendingCardWrapper}>
                  <View style={styles.pendingCardShadow} />
                  <View style={styles.pendingCard}>
                    {/* Header Row */}
                    <View style={styles.pendingHeaderRow}>
                      <View style={styles.phaseTagBadge}>
                        <Text style={styles.phaseTagText}>
                          PHASE 0{phase.phase_number}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.pendingTitle}>{phase.title}</Text>

                    {/* Progress Row (100%) */}
                    <View style={styles.pendingProgressRow}>
                      <View style={styles.pendingProgressBarTrack}>
                        <View style={[styles.pendingProgressBarFill, { width: '100%' }]} />
                      </View>
                      <Text style={styles.pendingProgressText}>
                        {phase.completed_tasks}/{phase.total_tasks} Tasks (100%)
                      </Text>
                    </View>

                    {/* Bottom Action Bar */}
                    <View style={styles.pendingFooter}>
                      <View style={styles.pendingHintWrapper}>
                        <Feather name="shield" size={12} color={theme.colors.textDark} />
                        <Text style={styles.pendingHintText}>
                          All tasks completed. Ready for drill.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.drillButton,
                          styles.drillButtonReady,
                          isLoading && styles.drillButtonDisabled,
                        ]}
                        onPress={() => handleLaunchDrill(phase)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.accentLime} />
                        ) : (
                          <>
                            <Text style={styles.drillButtonTextReady}>Start Drill</Text>
                            <Feather name="arrow-right" size={14} color={theme.colors.accentLime} />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Incomplete Phases */}
              {incompletePhases.length > 0 ? (
                incompletePhases.map((phase) => {
                  const hasStarted = phase.completed_tasks > 0;
                  return (
                    <View key={phase.phase_id} style={styles.pendingCardWrapper}>
                      <View style={styles.pendingCardShadow} />
                      <View style={styles.pendingCard}>
                        {/* Header Row */}
                        <View style={styles.pendingHeaderRow}>
                          <View style={styles.phaseTagBadge}>
                            <Text style={styles.phaseTagText}>
                              PHASE 0{phase.phase_number}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusAlertPill,
                              hasStarted ? styles.statusAlertInProgress : styles.statusAlertUntouched,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusAlertText,
                                hasStarted ? styles.statusAlertTextInProgress : styles.statusAlertTextUntouched,
                              ]}
                            >
                              {hasStarted ? `IN PROGRESS (${phase.completion_pct}%)` : 'NOT STARTED'}
                            </Text>
                          </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.pendingTitle}>{phase.title}</Text>

                        {/* Progress Bar & Tasks Done */}
                        <View style={styles.pendingProgressRow}>
                          <View style={styles.pendingProgressBarTrack}>
                            <View
                              style={[
                                styles.pendingProgressBarFill,
                                {
                                  width: `${Math.min(phase.completion_pct, 100)}%`,
                                  backgroundColor: hasStarted ? theme.colors.accentLime : '#d0d1ca',
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.pendingProgressText}>
                            {phase.completed_tasks}/{phase.total_tasks} Tasks ({phase.completion_pct}%)
                          </Text>
                        </View>

                        {/* Bottom Action Bar */}
                        <View style={styles.pendingFooter}>
                          <View style={styles.pendingHintWrapper}>
                            <Feather name="clock" size={12} color={theme.colors.textMuted} />
                            <Text style={styles.pendingHintText}>
                              {phase.total_tasks - phase.completed_tasks} tasks left to unlock drill.
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.drillButton, styles.resumeRoadmapButton]}
                            onPress={() => onNavigateToRoadmap?.()}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.resumeRoadmapButtonText}>
                              {hasStarted ? 'Continue' : 'Start Phase'}
                            </Text>
                            <Feather name="arrow-right" size={14} color={theme.colors.textDark} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : readyForDrillPhases.length === 0 ? (
                <View style={styles.emptySubSectionCard}>
                  <Feather name="award" size={16} color={theme.colors.accentLime} />
                  <Text style={styles.emptySubSectionText}>
                    Outstanding! You have completed all milestone tasks in this curriculum.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* SECTION 4: LATEST TECHNICAL DRILL EVALUATION (If available) */}
            {stats?.latest_diagnostic && (
              <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.textDark} />
                    <Text style={styles.sectionMainTitle}>Latest Drill Evaluation</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Technical feedback and score metrics from your most recent practice drill.
                  </Text>
                </View>

                <View style={styles.diagnosticCard}>
                  <View style={styles.diagnosticHeaderRow}>
                    <View style={styles.hireBadge}>
                      <Text style={styles.hireBadgeText}>
                        Score: {stats.latest_diagnostic.overall_score || 75}%
                      </Text>
                    </View>
                    <View style={styles.seniorityPill}>
                      <Text style={styles.seniorityPillText}>
                        {stats.latest_diagnostic.overall_score && stats.latest_diagnostic.overall_score >= 80 ? 'Advanced Mastery' : 'Technical Readiness'}
                      </Text>
                    </View>
                  </View>

                  {stats.latest_diagnostic.what_went_right && stats.latest_diagnostic.what_went_right.length > 0 ? (
                    <Text style={styles.diagnosticReportPreview} numberOfLines={3}>
                      {stats.latest_diagnostic.what_went_right.join(' • ')}
                    </Text>
                  ) : null}

                  <View style={styles.diagnosticFooterRow}>
                    <Text style={styles.diagnosticDateText}>
                      Recorded: {new Date(stats.latest_diagnostic.created_at).toLocaleDateString()}
                    </Text>
                    <View style={styles.ramblingPill}>
                      <Text style={styles.ramblingText}>Verified Evaluation</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Bottom Clearance */}
            <View style={{ height: 110 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accentLime,
    borderWidth: 2,
    borderColor: theme.colors.backgroundCard,
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
  candidateName: {
    fontSize: 20,
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
    letterSpacing: 0.5,
  },
  proLabel: {
    color: theme.colors.accentLime,
    fontSize: 11,
    fontWeight: '900',
  },
  titleSection: {
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  titleCount: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  tierSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
    gap: 6,
  },
  tierPillActive: {
    backgroundColor: theme.colors.cardDark,
    borderColor: theme.colors.cardDark,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tierPillTextActive: {
    color: theme.colors.textWhite,
  },
  tierProgressBadge: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierProgressBadgeActive: {
    backgroundColor: 'rgba(212, 255, 50, 0.25)',
  },
  tierProgressText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  tierProgressTextActive: {
    color: theme.colors.accentLime,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ebece6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statBigValue: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.5,
  },
  statUnitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statProgressBar: {
    height: 4,
    backgroundColor: '#ebece6',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
  },
  statProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accentLime,
    borderRadius: 2,
  },
  statSubText: {
    fontSize: 10.5,
    color: theme.colors.textSubtle,
    fontWeight: '600',
  },
  blackChartCard: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.cardLg,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartSubHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentLime,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  chartHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentLime,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e3dd',
  },
  chartPillarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pillarColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  countBadgeWrapper: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barCountPositive: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
  },
  barCountZero: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.2)',
  },
  barTrackContainer: {
    width: 22,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginVertical: 4,
  },
  pillarBar: {
    width: '100%',
    borderRadius: 8,
  },
  pillarBarActive: {
    backgroundColor: theme.colors.accentLime,
  },
  pillarBarResting: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pillarBarSelected: {
    borderWidth: 2,
    borderColor: theme.colors.textWhite,
  },
  pillarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8c919d',
    marginTop: 4,
  },
  pillarLabelToday: {
    color: theme.colors.textWhite,
    fontWeight: '800',
  },
  pillarLabelSelected: {
    color: theme.colors.accentLime,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accentLime,
    marginTop: 2,
  },
  selectedDayCallout: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  calloutTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
  },
  calloutBody: {
    fontSize: 11,
    color: theme.colors.textWhite,
    marginTop: 2,
  },
  chartFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  velocityTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  velocityTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  peakTag: {
    backgroundColor: 'rgba(212, 255, 50, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  peakTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
  },
  sectionWrapper: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  pendingCardWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  pendingCardShadow: {
    position: 'absolute',
    top: 3,
    left: 2,
    right: -2,
    bottom: -3,
    backgroundColor: '#dbdcd4',
    borderRadius: theme.radius.card,
  },
  pendingCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    padding: 16,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseTagBadge: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  statusAlertPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusAlertReady: {
    backgroundColor: theme.colors.cardDark,
  },
  statusAlertInProgress: {
    backgroundColor: '#ebece6',
  },
  statusAlertText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusAlertTextReady: {
    color: theme.colors.accentLime,
  },
  statusAlertTextInProgress: {
    color: theme.colors.textMuted,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginBottom: 10,
  },
  pendingProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pendingProgressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#ebece6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pendingProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accentLime,
    borderRadius: 3,
  },
  pendingProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  pendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0ea',
  },
  pendingHintWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 10,
  },
  pendingHintText: {
    fontSize: 10.5,
    color: theme.colors.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  drillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  drillButtonReady: {
    backgroundColor: theme.colors.cardDark,
  },
  drillButtonPractice: {
    backgroundColor: '#ebece6',
  },
  drillButtonDisabled: {
    opacity: 0.5,
  },
  drillButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  drillButtonTextReady: {
    color: theme.colors.textWhite,
  },
  drillButtonTextPractice: {
    color: theme.colors.textDark,
  },
  subSectionContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    borderRadius: theme.radius.card,
    padding: 14,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subSectionTitleGroup: {
    flexDirection: 'column',
    gap: 2,
  },
  subSectionCategoryLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
  },
  subSectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  subSectionDescription: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginBottom: 12,
  },
  readyBadge: {
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
    letterSpacing: 0.5,
  },
  inProgressBadge: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  inProgressBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 0.5,
  },
  statusAlertUntouched: {
    backgroundColor: '#f2f3ee',
  },
  statusAlertTextUntouched: {
    color: '#8b8d85',
  },
  resumeRoadmapButton: {
    backgroundColor: '#ebece6',
    borderWidth: 1,
    borderColor: '#dbdcd4',
  },
  resumeRoadmapButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  emptySubSectionCard: {
    backgroundColor: '#fafaf8',
    borderWidth: 1,
    borderColor: '#ebece6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptySubSectionText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  emptyPendingCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    borderRadius: theme.radius.card,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyPendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 255, 50, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyPendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  emptyPendingSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  diagnosticCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    padding: 16,
    gap: 10,
  },
  diagnosticHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hireBadge: {
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hireBadgeText: {
    color: theme.colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  seniorityPill: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seniorityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  diagnosticReportPreview: {
    fontSize: 12,
    color: theme.colors.textDark,
    lineHeight: 18,
  },
  diagnosticFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0ea',
  },
  diagnosticDateText: {
    fontSize: 10.5,
    color: theme.colors.textSubtle,
    fontWeight: '600',
  },
  ramblingPill: {
    backgroundColor: '#f3f4ef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ramblingText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});
