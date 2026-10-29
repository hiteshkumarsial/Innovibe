import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { TurnLogDTO } from '../types';

interface InterrogationScreenProps {
  currentTurn: number;
  maxTurns: number;
  turns: TurnLogDTO[];
  latestQuestion: string;
  interviewerReaction?: string | null;
  onSendAnswer: (answer: string) => Promise<void>;
  onFinishEarly: () => Promise<void>;
  isLoading: boolean;
}

export const InterrogationScreen: React.FC<InterrogationScreenProps> = ({
  currentTurn,
  maxTurns,
  turns,
  latestQuestion,
  interviewerReaction,
  onSendAnswer,
  onFinishEarly,
  isLoading,
}) => {
  const [answerText, setAnswerText] = useState('');
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [turns, latestQuestion, isLoading]);

  const handleSend = () => {
    if (!answerText.trim() || isLoading) return;
    const txt = answerText.trim();
    setAnswerText('');
    onSendAnswer(txt);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <View style={styles.turnBadge}>
            <Text style={styles.turnBadgeText}>Turn {currentTurn} of {maxTurns}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.finishEarlyBtn}
          onPress={onFinishEarly}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.accentLime} />
          ) : (
            <>
              <MaterialCommunityIcons name="check-decagram-outline" size={14} color={theme.colors.accentLime} />
              <Text style={styles.finishEarlyText}>Finish & Evaluate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Conversation Stream */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Render past turns */}
        {turns.map((t) => (
          <View key={t.turn_number} style={styles.turnBlock}>
            {/* Question inside the Black Card */}
            <View style={styles.blackQuestionCard}>
              <View style={styles.cardHeaderPill}>
                <View style={styles.greenPulse} />
                <Text style={styles.cardHeaderPillText}>BAR RAISER PROBE (TURN {t.turn_number})</Text>
              </View>
              <Text style={styles.blackCardQuestionText}>{t.question}</Text>

              {/* Decorative pillar dots inspired by the design */}
              <View style={styles.pillarRow}>
                {['Scale', 'Tradeoff', 'Failure', 'DB', 'Cache', 'Auth'].map((item, idx) => (
                  <View key={idx} style={[styles.pillarPill, idx <= t.turn_number && styles.pillarPillActive]}>
                    <Text style={[styles.pillarText, idx <= t.turn_number && styles.pillarTextActive]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Answer inside the White Card */}
            {t.user_answer && (
              <View style={styles.whiteAnswerCard}>
                <View style={styles.answerHeader}>
                  <Text style={styles.answerAuthor}>CANDIDATE DEFENSE</Text>
                  <Feather name="check-circle" size={14} color={theme.colors.success} />
                </View>
                <Text style={styles.whiteCardAnswerText}>{t.user_answer}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Current Active Question (if not yet in turns list) */}
        {latestQuestion && (!turns.length || turns[turns.length - 1].question !== latestQuestion) && (
          <View style={styles.turnBlock}>
            <View style={styles.blackQuestionCard}>
              <View style={styles.cardHeaderPill}>
                <View style={styles.greenPulse} />
                <Text style={styles.cardHeaderPillText}>ACTIVE PROBE (TURN {currentTurn})</Text>
              </View>
              <Text style={styles.blackCardQuestionText}>{latestQuestion}</Text>

              <View style={styles.pillarRow}>
                {['Scale', 'Tradeoff', 'Failure', 'DB', 'Cache', 'Auth'].map((item, idx) => (
                  <View key={idx} style={[styles.pillarPill, idx <= currentTurn && styles.pillarPillActive]}>
                    <Text style={[styles.pillarText, idx <= currentTurn && styles.pillarTextActive]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* The Electric Lime Card from Design (Loophole Hunter Reaction) */}
        {interviewerReaction && (
          <View style={styles.limeReactionCard}>
            <View style={styles.limeCardHeader}>
              <View style={styles.limeBlackPill}>
                <Text style={styles.limeBlackPillText}>Loophole Note</Text>
              </View>
              <View style={styles.limeScoreBadge}>
                <Text style={styles.limeScoreText}>Signal -0.5</Text>
              </View>
            </View>
            <Text style={styles.limeReactionText}>"{interviewerReaction}"</Text>
          </View>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={theme.colors.textDark} />
            <Text style={styles.loadingCardText}>The Bar Raiser is testing your architectural limits...</Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Pill Input Tray */}
      <View style={styles.floatingInputWrapper}>
        <View style={styles.floatingInputCard}>
          <TextInput
            style={styles.floatingTextInput}
            value={answerText}
            onChangeText={setAnswerText}
            placeholder="Defend your decision (state metrics, bottlenecks, trade-offs)..."
            placeholderTextColor={theme.colors.textSubtle}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.floatingSendBtn,
              (!answerText.trim() || isLoading) && styles.disabledSend,
            ]}
            onPress={handleSend}
            disabled={!answerText.trim() || isLoading}
          >
            <Feather name="arrow-up" size={20} color={theme.colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6df',
  },
  headerMuted: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
  },
  turnBadge: {
    backgroundColor: theme.colors.accentLime,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    marginTop: 4,
  },
  turnBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.textDark,
  },
  finishEarlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  finishEarlyText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.accentLime,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  turnBlock: {
    marginBottom: 20,
  },
  // The Black Card from the design
  blackQuestionCard: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.cardLg,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 12,
  },
  cardHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#202227',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    marginBottom: 12,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentLime,
  },
  cardHeaderPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentLime,
    letterSpacing: 0.8,
  },
  blackCardQuestionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: theme.colors.textWhite,
    marginBottom: 18,
  },
  pillarRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#25272e',
    paddingTop: 14,
  },
  pillarPill: {
    flex: 1,
    backgroundColor: '#1e2026',
    borderRadius: 14,
    paddingVertical: 5,
    alignItems: 'center',
  },
  pillarPillActive: {
    backgroundColor: theme.colors.accentLime,
  },
  pillarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#636674',
  },
  pillarTextActive: {
    color: theme.colors.textDark,
  },
  // The White Card for user defense
  whiteAnswerCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    padding: 18,
    alignSelf: 'flex-end',
    width: '94%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8ebe2',
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  answerAuthor: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 0.8,
  },
  whiteCardAnswerText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textDark,
    fontWeight: '500',
  },
  // The Electric Lime Card from design
  limeReactionCard: {
    backgroundColor: theme.colors.accentLime,
    borderRadius: theme.radius.card,
    padding: 18,
    marginVertical: 12,
    shadowColor: '#a3e635',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  limeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  limeBlackPill: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  limeBlackPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  limeScoreBadge: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  limeScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  limeReactionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e5dc',
  },
  loadingCardText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  floatingInputWrapper: {
    position: 'absolute',
    bottom: 84, // Sits above the floating BottomNavBar
    left: 18,
    right: 18,
  },
  floatingInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e5dc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    gap: 10,
  },
  floatingTextInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textDark,
    maxHeight: 80,
    paddingVertical: 6,
  },
  floatingSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledSend: {
    opacity: 0.3,
  },
});
