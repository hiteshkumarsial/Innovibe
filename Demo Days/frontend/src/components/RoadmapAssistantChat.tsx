import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_followups?: string[];
  created_at: string;
}

interface TierProgressItem {
  level: string;
  progress_percentage: number;
  completed_items: number;
  total_items: number;
}

interface RoadmapContextData {
  candidate_name: string;
  target_role: string;
  target_company: string;
  level: string;
  progress_percentage: number;
  completed_items: number;
  total_items: number;
  current_phase_number: number;
  current_phase_title: string;
  current_phase_topics: string[];
  current_phase_uncompleted_tasks: string[];
  suggested_prompts: string[];
  available_tiers?: TierProgressItem[];
}

interface RoadmapAssistantChatProps {
  user?: UserProfile | null;
}

export const RoadmapAssistantChat: React.FC<RoadmapAssistantChatProps> = ({ user }) => {
  const [context, setContext] = useState<RoadmapContextData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadContext('Beginner');
  }, [user]);

  const loadContext = async (levelToLoad?: string) => {
    setIsLoadingContext(true);
    try {
      const lvl = levelToLoad || selectedLevel;
      const data: RoadmapContextData = await api.getRoadmapContext(user?.id, lvl);
      setContext(data);
      if (data.level) {
        setSelectedLevel(data.level as any);
      }

      // Load stored persistent chat history from SQLite database
      const historyRes = await api.getRoadmapChatHistory(user?.id, lvl);
      if (historyRes.messages && historyRes.messages.length > 0) {
        const mappedMessages: ChatMessage[] = historyRes.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          suggested_followups: m.suggested_followups,
          created_at: m.created_at,
        }));
        setMessages(mappedMessages);
      } else {
        // Welcoming greeting tailored to candidate's selected tier and active phase
        const initialGreeting: ChatMessage = {
          id: `msg-init-${lvl}-${Date.now()}`,
          role: 'assistant',
          content: `Hey ${data.candidate_name || 'Engineer'}! 👋\n\nI'm your Senior Roadmap Mentor. I'm focusing on your ${data.level} roadmap for ${data.target_role} at ${data.target_company}.\n\nYou are currently on Phase 0${data.current_phase_number}: ${data.current_phase_title} with ${data.completed_items} of ${data.total_items} milestones completed (${data.progress_percentage}% done).\n\nWhat is the specific obstacle or doubt holding you back right now?`,
          suggested_followups: data.suggested_prompts || [],
          created_at: new Date().toISOString(),
        };
        setMessages([initialGreeting]);
      }
    } catch (err) {
      console.warn('Failed to load roadmap context and chat history:', err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.clearRoadmapChatHistory(user?.id, selectedLevel);
      if (context) {
        const initialGreeting: ChatMessage = {
          id: `msg-init-${selectedLevel}-${Date.now()}`,
          role: 'assistant',
          content: `Hey ${context.candidate_name || 'Engineer'}! 👋\n\nI'm your Senior Roadmap Mentor. I'm focusing on your ${context.level} roadmap for ${context.target_role} at ${context.target_company}.\n\nYou are currently on Phase 0${context.current_phase_number}: ${context.current_phase_title} with ${context.completed_items} of ${context.total_items} milestones completed (${context.progress_percentage}% done).\n\nWhat is the specific obstacle or doubt holding you back right now?`,
          suggested_followups: context.suggested_prompts || [],
          created_at: new Date().toISOString(),
        };
        setMessages([initialGreeting]);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.warn('Failed to clear chat history:', err);
    }
  };

  const confirmClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      `Clear stored conversation for ${selectedLevel} roadmap?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: handleClearChat },
      ]
    );
  };

  const handleSelectTier = (tier: string) => {
    setIsDropdownOpen(false);
    if (tier !== selectedLevel) {
      setSelectedLevel(tier as any);
      loadContext(tier);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build history for context
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendRoadmapChat({
        user_id: user?.id,
        level: selectedLevel,
        message: text,
        chat_history: chatHistory,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'Here is the guidance for your roadmap milestone.',
        suggested_followups: res.suggested_followups || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble communicating with the mentor server. Please verify your connection.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const renderInline = (raw: string) => {
    // Regex splits by bold **...**, inline code `...`, or italic *...*
    const segments = raw.split(/(\*\*[\s\S]*?\*\*|`[^`]+?`|\*[^*]+?\*)/g);
    return segments.map((seg, i) => {
      if (!seg) return null;
      if (seg.startsWith('**') && seg.endsWith('**') && seg.length >= 4) {
        return (
          <Text key={i} style={styles.boldText}>
            {seg.slice(2, -2)}
          </Text>
        );
      }
      if (seg.startsWith('`') && seg.endsWith('`') && seg.length >= 2) {
        return (
          <Text key={i} style={styles.inlineCodeText}>
            {seg.slice(1, -1)}
          </Text>
        );
      }
      if (seg.startsWith('*') && seg.endsWith('*') && seg.length >= 2) {
        return (
          <Text key={i} style={styles.italicText}>
            {seg.slice(1, -1)}
          </Text>
        );
      }
      // Strip any stray asterisks so no asterisks are ever visible in the chat text
      const cleanSeg = seg.replace(/\*/g, '');
      return <Text key={i}>{cleanSeg}</Text>;
    });
  };

  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <View style={styles.markdownContainer}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={idx} style={{ height: 6 }} />;
          }

          // Bullet item (e.g. "* " or "- ")
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const cleanBullet = trimmed.replace(/^[*•-]\s*/, '');
            return (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{renderInline(cleanBullet)}</Text>
              </View>
            );
          }

          // Numbered item (e.g. "1. ")
          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^\d+/)?.[0] || '1';
            const cleanText = trimmed.replace(/^\d+\.\s*/, '');
            return (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.numberedBadge}>{num}.</Text>
                <Text style={styles.bulletText}>{renderInline(cleanText)}</Text>
              </View>
            );
          }

          return (
            <Text key={idx} style={styles.messageParagraph}>
              {renderInline(trimmed)}
            </Text>
          );
        })}
      </View>
    );
  };

  // Get current active tier's progress percentage for dropdown button
  const currentTierProgress = context?.available_tiers?.find(
    (t) => t.level.toLowerCase() === selectedLevel.toLowerCase()
  )?.progress_percentage ?? context?.progress_percentage ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Tier Selector Dropdown Header */}
      <View style={styles.dropdownContainer}>
        <View style={styles.dropdownHeaderRow}>
          <Text style={styles.dropdownHeaderLabel}>REFERENCED ROADMAP:</Text>
          <View style={styles.dropdownAndActionsRow}>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownTriggerLeft}>
                <View style={styles.dropdownActiveDot} />
                <Text style={styles.dropdownTriggerText}>
                  {selectedLevel === "Beginner" ? "Level 1" : selectedLevel === "Intermediate" ? "Level 2" : "Level 3"} (Progress - {currentTierProgress}%)
                </Text>
              </View>
              <Feather
                name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={theme.colors.textDark}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearChatBtn}
              onPress={confirmClearChat}
              activeOpacity={0.7}
            >
              <Feather name="rotate-ccw" size={13} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Menu Options */}
        {isDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {(context?.available_tiers || [
              { level: 'Beginner', progress_percentage: 0, completed_items: 0, total_items: 40 },
              { level: 'Intermediate', progress_percentage: 0, completed_items: 0, total_items: 120 },
              { level: 'Advanced', progress_percentage: 0, completed_items: 0, total_items: 120 },
            ]).map((t) => {
              const isSelected = t.level.toLowerCase() === selectedLevel.toLowerCase();
              return (
                <TouchableOpacity
                  key={t.level}
                  style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                  onPress={() => handleSelectTier(t.level)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuItemDot, isSelected && styles.menuItemDotActive]} />
                    <Text style={[styles.menuItemText, isSelected && styles.menuItemTextActive]}>
                      {t.level === "Beginner" ? "Level 1" : t.level === "Intermediate" ? "Level 2" : "Level 3"} (Progress - {t.progress_percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.menuItemBadge, isSelected && styles.menuItemBadgeActive]}>
                    <Text style={[styles.menuItemBadgeText, isSelected && styles.menuItemBadgeTextActive]}>
                      {t.completed_items}/{t.total_items} done
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Real-time Status Card */}
      {context && (
        <View style={styles.statusBarCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusRoleWrapper}>
              <View style={styles.activePulseCircle} />
              <Text style={styles.statusRoleText}>
                {context.target_role} • {context.level}
              </Text>
            </View>
            <View style={styles.statusProgressBadge}>
              <Text style={styles.statusProgressText}>
                {context.completed_items}/{context.total_items} TASKS ({context.progress_percentage}%)
              </Text>
            </View>
          </View>

          <View style={styles.activePhaseRow}>
            <Text style={styles.activePhaseLabel}>ACTIVE PHASE 0{context.current_phase_number}:</Text>
            <Text style={styles.activePhaseTitle} numberOfLines={1}>
              {context.current_phase_title}
            </Text>
          </View>
        </View>
      )}

      {/* Chat Messages Stream */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isLoadingContext ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color={theme.colors.cardDark} />
            <Text style={styles.loadingText}>Loading {selectedLevel} roadmap progress...</Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLatestAssistant = !isUser && index === messages.length - 1;

            return (
              <View
                key={msg.id}
                style={[styles.messageBubbleWrapper, isUser ? styles.bubbleUserWrapper : styles.bubbleAssistantWrapper]}
              >
                {!isUser && (
                  <View style={styles.avatarMini}>
                    <MaterialCommunityIcons name="compass-outline" size={14} color={theme.colors.textDark} />
                  </View>
                )}

                <View style={[styles.bubbleCard, isUser ? styles.bubbleUserCard : styles.bubbleAssistantCard]}>
                  {isUser ? (
                    <Text style={styles.bubbleUserText}>{msg.content}</Text>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}

                  {/* Pre-made Prompt Chips under assistant message */}
                  {isLatestAssistant && msg.suggested_followups && msg.suggested_followups.length > 0 && (
                    <View style={styles.suggestedPromptsSection}>
                      <Text style={styles.suggestedSectionHeader}>CHOOSE A QUICK TOPIC OR TYPE BELOW:</Text>
                      <View style={styles.chipsContainer}>
                        {msg.suggested_followups.map((prompt, pIdx) => (
                          <TouchableOpacity
                            key={pIdx}
                            style={styles.promptChip}
                            onPress={() => handleSendMessage(prompt)}
                            disabled={isSending}
                            activeOpacity={0.7}
                          >
                            <Feather name="corner-down-right" size={11} color={theme.colors.textDark} />
                            <Text style={styles.promptChipText}>{prompt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {isSending && (
          <View style={styles.typingIndicatorRow}>
            <View style={styles.avatarMini}>
              <MaterialCommunityIcons name="compass-outline" size={14} color={theme.colors.textDark} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={theme.colors.cardDark} />
              <Text style={styles.typingText}>Preparing recommendations...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Custom Prompt Input Bar */}
      <View style={styles.inputBarContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Ask about ${selectedLevel} milestones, resources, or doubts...`}
          placeholderTextColor={theme.colors.textSubtle}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={theme.colors.accentLime} />
          ) : (
            <Feather name="arrow-up" size={18} color={theme.colors.textWhite} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: 10,
    zIndex: 20,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  dropdownAndActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearChatBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1.5,
    borderColor: theme.colors.pillBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.pillLight,
    borderWidth: 1.5,
    borderColor: theme.colors.pillBorder,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.accentLime,
  },
  dropdownTriggerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    borderRadius: 14,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  dropdownMenuItemActive: {
    backgroundColor: theme.colors.cardDark,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.pillBorder,
  },
  menuItemDotActive: {
    backgroundColor: theme.colors.accentLime,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  menuItemTextActive: {
    color: theme.colors.textWhite,
  },
  menuItemBadge: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuItemBadgeActive: {
    backgroundColor: 'rgba(212, 255, 50, 0.2)',
  },
  menuItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  menuItemBadgeTextActive: {
    color: theme.colors.accentLime,
  },
  statusBarCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRoleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentLime,
  },
  statusRoleText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  statusProgressBadge: {
    backgroundColor: '#ebece6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  activePhaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePhaseLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  activePhaseTitle: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingBottom: 20,
    gap: 12,
  },
  loadingWrapper: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleAssistantWrapper: {
    justifyContent: 'flex-start',
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.accentLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleCard: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleUserCard: {
    backgroundColor: theme.colors.cardDark,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleAssistantCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bubbleUserText: {
    color: theme.colors.textWhite,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  markdownContainer: {
    gap: 4,
  },
  messageParagraph: {
    color: theme.colors.textDark,
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  boldText: {
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  italicText: {
    fontStyle: 'italic',
  },
  inlineCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#e6e7df',
    color: theme.colors.textDark,
    fontSize: 11.5,
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.textDark,
    marginTop: 7,
  },
  numberedBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textDark,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: theme.colors.textDark,
    lineHeight: 18,
  },
  suggestedPromptsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ebece6',
  },
  suggestedSectionHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsContainer: {
    gap: 6,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4ef',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e3dd',
    gap: 6,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textDark,
    flexShrink: 1,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebece6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 80,
    fontSize: 12.5,
    color: theme.colors.textDark,
    paddingVertical: 6,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
