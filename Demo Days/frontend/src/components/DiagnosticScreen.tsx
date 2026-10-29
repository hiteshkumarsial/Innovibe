import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { DiagnosticReportDTO, UserProfile } from '../types';

interface DiagnosticScreenProps {
  diagnostic: DiagnosticReportDTO;
  user?: UserProfile | null;
  onRestart: () => void;
  onViewStatistics?: () => void;
  onBackToRoadmap?: () => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  diagnostic,
  user,
  onRestart,
  onViewStatistics,
  onBackToRoadmap,
}) => {
  const score = diagnostic.overall_score ?? 75;

  const handleReturnToRoadmap = () => {
    if (onBackToRoadmap) {
      onBackToRoadmap();
    } else {
      onRestart();
    }
  };

  const handleGoToStats = () => {
    if (onViewStatistics) {
      onViewStatistics();
    } else {
      onRestart();
    }
  };

  const sectionScores = diagnostic.section_scores || [];
  const strengths = diagnostic.what_went_right || [];
  const growthAreas = diagnostic.what_went_wrong || [];
  const modelAnswers = diagnostic.say_this_instead || [];

  return (
    <View style={styles.container}>
      {/* Top Header matching App Design */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleReturnToRoadmap}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={17} color={theme.colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>EVALUATION COMPLETE</Text>
          <Text style={styles.headerTitle}>Performance Report</Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText} numberOfLines={1}>
            {user?.target_role || 'SDE-1'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 1. HERO READINESS CARD ================= */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTopLeft}>
                <View style={styles.tagChipLime}>
                  <Feather name="award" size={11} color={theme.colors.textDark} />
                  <Text style={styles.tagChipLimeText}>TECHNICAL BENCHMARK</Text>
                </View>
                <Text style={styles.heroTitle}>Overall Readiness</Text>
              </View>

              <View style={styles.scorePillDark}>
                <Text style={styles.scorePillNumber}>{score}%</Text>
                <Text style={styles.scorePillLabel}>SCORE</Text>
              </View>
            </View>

            {/* Custom Electric Lime Progress Bar Track */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, score))}%` }]} />
            </View>

            {/* 3 Metric Tiles matching App Statistics */}
            <View style={styles.metricTilesRow}>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileValue}>{sectionScores.length || 5}</Text>
                <Text style={styles.metricTileLabel}>DIMENSIONS</Text>
              </View>

              <View style={styles.metricTileDivider} />

              <View style={styles.metricTile}>
                <Text style={styles.metricTileValue}>{strengths.length}</Text>
                <Text style={styles.metricTileLabel}>STRENGTHS</Text>
              </View>

              <View style={styles.metricTileDivider} />

              <View style={styles.metricTile}>
                <Text style={styles.metricTileValue}>{growthAreas.length}</Text>
                <Text style={styles.metricTileLabel}>GROWTH TARGETS</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= 2. SECTION BREAKDOWN CARD ================= */}
        {sectionScores.length > 0 && (
          <View style={styles.cardWrapper}>
            <View style={styles.cardShadow} />
            <View style={styles.standardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconCircle}>
                    <Feather name="bar-chart-2" size={15} color={theme.colors.textDark} />
                  </View>
                  <View>
                    <Text style={styles.cardEyebrow}>CORE COMPETENCIES</Text>
                    <Text style={styles.cardHeading}>Section Breakdown</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderBadge}>
                  <Text style={styles.cardHeaderBadgeText}>5 AREAS</Text>
                </View>
              </View>

              <View style={styles.sectionScoresList}>
                {sectionScores.map((sec, idx) => {
                  const max = sec.max_score || 20;
                  const pct = Math.min(100, Math.max(0, Math.round((sec.score / max) * 100)));

                  return (
                    <View key={idx} style={styles.sectionScoreItem}>
                      <View style={styles.sectionScoreHeader}>
                        <Text style={styles.sectionNameText}>{sec.name}</Text>
                        <View style={styles.sectionScorePill}>
                          <Text style={styles.sectionScorePillText}>
                            {sec.score} / {max}
                          </Text>
                        </View>
                      </View>

                      {/* Clean Electric Lime Progress Bar */}
                      <View style={styles.miniProgressTrack}>
                        <View style={[styles.miniProgressFill, { width: `${pct}%` }]} />
                      </View>

                      {sec.feedback ? (
                        <Text style={styles.sectionFeedbackText}>{sec.feedback}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ================= 3. OBSERVED STRENGTHS CARD ================= */}
        {strengths.length > 0 && (
          <View style={styles.cardWrapper}>
            <View style={styles.cardShadow} />
            <View style={styles.standardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconCircle}>
                    <Feather name="check" size={15} color={theme.colors.textDark} />
                  </View>
                  <View>
                    <Text style={styles.cardEyebrow}>VERIFIED SIGNALS</Text>
                    <Text style={styles.cardHeading}>Observed Strengths</Text>
                  </View>
                </View>

                <View style={styles.tagChipLime}>
                  <Text style={styles.tagChipLimeText}>CONFIRMED</Text>
                </View>
              </View>

              <View style={styles.bulletsList}>
                {strengths.map((item, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.limeBulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= 4. AREAS TO STRENGTHEN CARD ================= */}
        {growthAreas.length > 0 && (
          <View style={styles.cardWrapper}>
            <View style={styles.cardShadow} />
            <View style={styles.standardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconCircle}>
                    <Feather name="target" size={15} color={theme.colors.textDark} />
                  </View>
                  <View>
                    <Text style={styles.cardEyebrow}>EXPANSION TARGETS</Text>
                    <Text style={styles.cardHeading}>Areas to Strengthen</Text>
                  </View>
                </View>

                <View style={styles.tagChipDark}>
                  <Text style={styles.tagChipDarkText}>PRACTICE</Text>
                </View>
              </View>

              <View style={styles.bulletsList}>
                {growthAreas.map((item, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.darkBulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= 5. HIGH-SIGNAL MODEL DEFENSE (MATTE CARBON CARD) ================= */}
        {modelAnswers.length > 0 && (
          <View style={styles.cardWrapper}>
            <View style={styles.cardShadowDark} />
            <View style={styles.carbonModelCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.modelIconBadge}>
                    <Feather name="message-square" size={14} color={theme.colors.accentLime} />
                  </View>
                  <View>
                    <Text style={styles.modelEyebrow}>STAFF-LEVEL BENCHMARK</Text>
                    <Text style={styles.modelMainHeading}>How Senior Engineers Answer</Text>
                  </View>
                </View>

                <View style={styles.modelHeaderBadge}>
                  <Text style={styles.modelHeaderBadgeText}>MODEL</Text>
                </View>
              </View>

              {modelAnswers.map((item, idx) => (
                <View key={idx} style={styles.modelBlock}>
                  {/* The Probe Asked */}
                  <View style={styles.probeContainer}>
                    <View style={styles.probeTagRow}>
                      <Text style={styles.probeTagText}>INTERVIEW PROBE</Text>
                    </View>
                    <Text style={styles.probeContentText}>{item.question}</Text>
                  </View>

                  {/* Ideal Defense */}
                  <View style={styles.defenseContainer}>
                    <View style={styles.defenseHeaderRow}>
                      <Feather name="shield" size={12} color={theme.colors.accentLime} />
                      <Text style={styles.defenseHeaderText}>RECOMMENDED DEFENSE</Text>
                    </View>
                    <Text style={styles.defenseBodyText}>{item.ideal_answer}</Text>
                  </View>

                  {/* Key Signals Expected */}
                  {item.key_points && item.key_points.length > 0 && (
                    <View style={styles.signalsContainer}>
                      <Text style={styles.signalsEyebrow}>KEY SIGNALS EVALUATORS LOOK FOR:</Text>
                      <View style={styles.signalsChipsRow}>
                        {item.key_points.map((pt, pIdx) => (
                          <View key={pIdx} style={styles.signalChipPill}>
                            <View style={styles.signalLimePoint} />
                            <Text style={styles.signalChipText}>{pt}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= 6. ACTION FOOTER ================= */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.primaryLimeButton}
            onPress={onRestart}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="sword-cross" size={16} color={theme.colors.textDark} />
            <Text style={styles.primaryLimeButtonText}>Practice Another Technical Drill</Text>
            <Feather name="arrow-right" size={16} color={theme.colors.textDark} />
          </TouchableOpacity>

          {onViewStatistics && (
            <TouchableOpacity
              style={styles.secondaryDarkButton}
              onPress={handleGoToStats}
              activeOpacity={0.7}
            >
              <Feather name="bar-chart-2" size={15} color={theme.colors.textWhite} />
              <Text style={styles.secondaryDarkButtonText}>View Engineering Statistics</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ghostRoadmapButton}
            onPress={handleReturnToRoadmap}
            activeOpacity={0.6}
          >
            <Feather name="map" size={14} color={theme.colors.textMuted} />
            <Text style={styles.ghostRoadmapButtonText}>Return to Learning Roadmap</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Bone canvas #f4f4f0
  },
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 48 : 38,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e2',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    maxWidth: 120,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },

  /* ================= 3D CARD WRAPPERS ================= */
  cardWrapper: {
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -4,
    height: '100%',
    backgroundColor: '#e6e6dc',
    borderRadius: theme.radius.card,
    zIndex: -1,
  },
  cardShadowDark: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -4,
    height: '100%',
    backgroundColor: '#0a0b0d',
    borderRadius: theme.radius.card,
    zIndex: -1,
  },

  /* ================= HERO CARD ================= */
  heroCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    padding: 18,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTopLeft: {
    gap: 4,
  },
  tagChipLime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tagChipLimeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  scorePillDark: {
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 64,
  },
  scorePillNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.accentLime,
  },
  scorePillLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#ebece6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accentLime,
    borderRadius: 4,
  },
  metricTilesRow: {
    flexDirection: 'row',
    backgroundColor: '#f7f7f3',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ededec',
  },
  metricTile: {
    alignItems: 'center',
    flex: 1,
  },
  metricTileValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.textDark,
  },
  metricTileLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  metricTileDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e3dd',
  },

  /* ================= STANDARD WHITE CARD ================= */
  standardCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e8e8e2',
    padding: 18,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: -0.2,
  },
  cardHeaderBadge: {
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardHeaderBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 0.4,
  },
  tagChipDark: {
    backgroundColor: theme.colors.cardDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipDarkText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
    letterSpacing: 0.4,
  },

  /* ================= SECTION SCORES LIST ================= */
  sectionScoresList: {
    gap: 14,
  },
  sectionScoreItem: {
    gap: 4,
  },
  sectionScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionNameText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textDark,
    flex: 1,
  },
  sectionScorePill: {
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.pillBorder,
  },
  sectionScorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  miniProgressTrack: {
    height: 6,
    backgroundColor: '#ebece6',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accentLime,
    borderRadius: 3,
  },
  sectionFeedbackText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },

  /* ================= BULLETS LIST ================= */
  bulletsList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  limeBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.accentLime,
    borderWidth: 1.5,
    borderColor: theme.colors.textDark,
    marginTop: 5,
  },
  darkBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.cardDark,
    marginTop: 5,
  },
  bulletText: {
    fontSize: 12,
    color: theme.colors.textDark,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
  },

  /* ================= CARBON MODEL CARD ================= */
  carbonModelCard: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.card,
    padding: 18,
    gap: 14,
  },
  modelIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1d1f25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
    letterSpacing: 0.6,
  },
  modelMainHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textWhite,
    letterSpacing: -0.2,
  },
  modelHeaderBadge: {
    backgroundColor: 'rgba(212, 255, 50, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 50, 0.3)',
  },
  modelHeaderBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: theme.colors.accentLime,
    letterSpacing: 0.5,
  },
  modelBlock: {
    backgroundColor: '#191b21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262932',
    padding: 14,
    gap: 12,
  },
  probeContainer: {
    gap: 4,
  },
  probeTagRow: {
    flexDirection: 'row',
  },
  probeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.accentLime,
    backgroundColor: '#20232b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.4,
  },
  probeContentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textWhite,
    lineHeight: 17,
    marginTop: 2,
  },
  defenseContainer: {
    backgroundColor: '#121316',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242730',
    padding: 12,
    gap: 6,
  },
  defenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defenseHeaderText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.accentLime,
    letterSpacing: 0.5,
  },
  defenseBodyText: {
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 17,
    fontWeight: '500',
  },
  signalsContainer: {
    gap: 6,
  },
  signalsEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 0.4,
  },
  signalsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  signalChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20232b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  signalLimePoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accentLime,
  },
  signalChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#cbd5e1',
  },

  /* ================= ACTION FOOTER ================= */
  footerContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryLimeButton: {
    backgroundColor: theme.colors.accentLime,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    shadowColor: theme.colors.accentLime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryLimeButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: 0.2,
  },
  secondaryDarkButton: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  secondaryDarkButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  ghostRoadmapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  ghostRoadmapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
