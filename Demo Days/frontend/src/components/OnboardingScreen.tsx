import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface OnboardingScreenProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

const TOTAL_STEPS = 5;

// Intelligent default role-to-stack mapping (instant zero-delay fallback)
const ROLE_DEFAULTS: Record<string, string[]> = {
  'Backend SDE-1': ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Kafka', 'System Design', 'Git'],
  'Full-Stack Developer': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Express', 'Docker', 'Tailwind CSS', 'REST APIs'],
  'Frontend Engineer': ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux', 'Web Performance', 'HTML5/CSS3', 'GraphQL'],
  'AI / ML Engineer': ['Python', 'PyTorch', 'LangChain', 'Vector DBs', 'Hugging Face', 'FastAPI', 'Pandas', 'MLOps'],
  'DevOps / Cloud': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD Actions', 'Linux', 'Nginx', 'Prometheus'],
  'Android / Mobile': ['React Native', 'Expo', 'TypeScript', 'Kotlin', 'Redux', 'Android SDK', 'REST APIs', 'Jetpack Compose'],
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ user, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [candidateName, setCandidateName] = useState(user.name || '');
  const [dob, setDob] = useState(user.dob || '');

  // Step 2: Role
  const [targetRole, setTargetRole] = useState(user.target_role || 'Backend SDE-1');
  const [customRole, setCustomRole] = useState('');

  // Step 3: Guessed Tech Stacks
  const [suggestedStacks, setSuggestedStacks] = useState<string[]>(ROLE_DEFAULTS['Backend SDE-1']);
  const [selectedStacks, setSelectedStacks] = useState<string[]>(ROLE_DEFAULTS['Backend SDE-1']);
  const [customStackInput, setCustomStackInput] = useState('');

  // Step 4: Expected LPA
  const [expectedLpa, setExpectedLpa] = useState(user.expected_lpa || '18 - 25 LPA');
  const [customLpa, setCustomLpa] = useState('');

  // Step 5: Target Companies & Experience
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'Google',
    'Uber',
    'Zepto',
  ]);
  const [customCompany, setCustomCompany] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Final Year Student');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Smooth Step Animation Transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Whenever Target Role changes, intelligently guess the tech stack
  useEffect(() => {
    const activeRole = targetRole || customRole;
    if (!activeRole) return;

    // Check fast local dictionary first
    let matched = false;
    for (const [roleKey, stackList] of Object.entries(ROLE_DEFAULTS)) {
      if (roleKey.toLowerCase().includes(activeRole.toLowerCase()) || activeRole.toLowerCase().includes(roleKey.toLowerCase())) {
        setSuggestedStacks(stackList);
        setSelectedStacks(stackList);
        matched = true;
        break;
      }
    }

    // Also ask backend for any specialized or expanded stacks
    api.getRecommendedTechStacks(activeRole).then((stacks) => {
      if (stacks && stacks.length > 0) {
        setSuggestedStacks(stacks);
        if (!matched) setSelectedStacks(stacks);
      }
    });
  }, [targetRole, customRole]);

  const triggerStepTransition = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: nextStep > currentStep ? -20 : 20,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(nextStep > currentStep ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const validateCurrentStep = (): boolean => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!candidateName.trim()) {
        setErrorMessage('Please enter your full name to set up your profile.');
        return false;
      }
    } else if (currentStep === 2) {
      const activeRole = targetRole.trim() || customRole.trim();
      if (!activeRole) {
        setErrorMessage('Please select a target engineering role or type your specialization.');
        return false;
      }
    } else if (currentStep === 3) {
      if (selectedStacks.length === 0) {
        setErrorMessage('Please select at least one technology stack or skill to continue.');
        return false;
      }
    } else if (currentStep === 4) {
      const activeLpa = expectedLpa.trim() || customLpa.trim();
      if (!activeLpa) {
        setErrorMessage('Please select or specify your target compensation package goal.');
        return false;
      }
    } else if (currentStep === 5) {
      if (selectedCompanies.length === 0 && !customCompany.trim()) {
        setErrorMessage('Please select at least one company you want to prepare for.');
        return false;
      }
      if (!experienceLevel.trim()) {
        setErrorMessage('Please select your current preparation stage to continue.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setErrorMessage(null);
    if (currentStep < TOTAL_STEPS) {
      triggerStepTransition(currentStep + 1);
    } else {
      handleFinalSubmission();
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      triggerStepTransition(currentStep - 1);
    }
  };

  // Stack Selection Helpers
  const toggleStack = (tech: string) => {
    if (selectedStacks.includes(tech)) {
      setSelectedStacks(selectedStacks.filter((t) => t !== tech));
    } else {
      setSelectedStacks([...selectedStacks, tech]);
    }
  };

  const handleSelectAllStacks = () => {
    setSelectedStacks([...suggestedStacks]);
  };

  const handleDeselectAllStacks = () => {
    setSelectedStacks([]);
  };

  const handleAddCustomStack = () => {
    if (!customStackInput.trim()) return;
    const trimmed = customStackInput.trim();
    if (!suggestedStacks.includes(trimmed)) {
      setSuggestedStacks([...suggestedStacks, trimmed]);
    }
    if (!selectedStacks.includes(trimmed)) {
      setSelectedStacks([...selectedStacks, trimmed]);
    }
    setCustomStackInput('');
  };

  const toggleCompany = (comp: string) => {
    if (selectedCompanies.includes(comp)) {
      setSelectedCompanies(selectedCompanies.filter((c) => c !== comp));
    } else {
      setSelectedCompanies([...selectedCompanies, comp]);
    }
  };

  const handleAddCustomCompany = () => {
    if (!customCompany.trim()) return;
    const trimmed = customCompany.trim();
    if (!selectedCompanies.includes(trimmed)) {
      setSelectedCompanies([...selectedCompanies, trimmed]);
    }
    setCustomCompany('');
  };

  const handleFinalSubmission = async () => {
    const finalRole = targetRole.trim() || customRole.trim();
    const finalLpa = expectedLpa.trim() || customLpa.trim();
    const finalCompanies = selectedCompanies.join(', ');
    const finalStack = selectedStacks.join(', ');

    if (!candidateName.trim()) {
      setErrorMessage('Full name is required before completing onboarding.');
      return;
    }
    if (!finalRole) {
      setErrorMessage('Target engineering role is required before completing onboarding.');
      return;
    }
    if (selectedStacks.length === 0) {
      setErrorMessage('At least one technical skill or stack must be selected.');
      return;
    }
    if (!finalLpa) {
      setErrorMessage('Expected compensation package is required.');
      return;
    }
    if (selectedCompanies.length === 0 && !customCompany.trim()) {
      setErrorMessage('At least one target company must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (user.id) {
        const updated = await api.completeOnboarding({
          user_id: user.id,
          name: candidateName.trim(),
          dob: dob.trim(),
          target_role: finalRole,
          expected_lpa: finalLpa,
          interested_companies: finalCompanies || 'General Tech',
          experience_level: experienceLevel,
          primary_stack: finalStack || 'General CS Fundamentals',
        });
        onComplete(updated);
      } else {
        onComplete({
          ...user,
          name: candidateName.trim(),
          dob: dob.trim(),
          target_role: finalRole,
          expected_lpa: finalLpa,
          interested_companies: selectedCompanies.join(', '),
          experience_level: experienceLevel,
          primary_stack: selectedStacks.join(', '),
          onboarding_completed: true,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save profile details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles = [
    'Backend SDE-1',
    'Full-Stack Developer',
    'Frontend Engineer',
    'AI / ML Engineer',
    'DevOps / Cloud',
    'Android / Mobile',
  ];

  const lpaTiers = ['6 - 10 LPA', '12 - 18 LPA', '18 - 25 LPA', '28 - 40 LPA', '45+ LPA'];
  const popularCompanies = ['Google', 'Amazon', 'Uber', 'Atlassian', 'Zepto', 'Cred', 'Swiggy', 'Microsoft'];
  const experienceTiers = ['Pre-Final Year Student', 'Final Year Student', 'Fresher Graduate', '1 - 2 YOE Engineer'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header with Neo-brutalist Step Indicator */}
        <View style={styles.topHeader}>
          <View style={styles.miniLogo}>
            <View style={[styles.miniBar, { height: 12, backgroundColor: theme.colors.cardDark }]} />
            <View style={[styles.miniBar, { height: 18, backgroundColor: theme.colors.accentLime }]} />
            <View style={[styles.miniBar, { height: 24, backgroundColor: theme.colors.cardDark }]} />
            <View style={[styles.miniBar, { height: 14, backgroundColor: theme.colors.accentLime }]} />
          </View>

          {/* Segmented Step Pills */}
          <View style={styles.stepIndicatorRow}>
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <View
                key={stepNum}
                style={[
                  styles.stepPillIndicator,
                  stepNum === currentStep && styles.stepPillActive,
                  stepNum < currentStep && styles.stepPillCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    stepNum === currentStep && styles.stepPillTextActive,
                    stepNum < currentStep && styles.stepPillTextCompleted,
                  ]}
                >
                  0{stepNum}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Dynamic Animated Question Container */}
        <Animated.View
          style={[
            styles.animatedQuestionCard,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* ================= STEP 1: IDENTITY & DOB ================= */}
          {currentStep === 1 && (
            <View style={styles.questionBlock}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>STEP 1 • CANDIDATE IDENTITY</Text>
              </View>
              <Text style={styles.questionTitle}>Confirm your identity</Text>
              <Text style={styles.questionSub}>
                Your name and date of birth are saved to your Bar Raiser performance records.
              </Text>

              <View style={styles.whiteCardBox}>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>FULL NAME *</Text>
                  <TextInput
                    style={[styles.textInput, (!candidateName.trim() && errorMessage) ? styles.textInputError : null]}
                    value={candidateName}
                    onChangeText={(txt) => {
                      setCandidateName(txt);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. Akash Sharma"
                    placeholderTextColor={theme.colors.textSubtle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH (DOB)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.textSubtle}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ================= STEP 2: JOB TARGET ================= */}
          {currentStep === 2 && (
            <View style={styles.questionBlock}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>STEP 2 • TARGET ROLE</Text>
              </View>
              <Text style={styles.questionTitle}>What role are you targeting?</Text>
              <Text style={styles.questionSub}>
                The Bar Raiser will adjust the interrogation depth to match this specific role.
              </Text>

              <View style={styles.chipsContainer}>
                {availableRoles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.chipButton, targetRole === role && styles.chipActiveDark]}
                    onPress={() => {
                      setTargetRole(role);
                      setCustomRole('');
                    }}
                  >
                    <Text style={[styles.chipText, targetRole === role && styles.chipTextWhite]}>
                      {role}
                    </Text>
                    {targetRole === role && <Feather name="check" size={14} color={theme.colors.accentLime} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customInputWrap}>
                <Text style={styles.fieldLabel}>OR CUSTOM SPECIALIZATION</Text>
                <TextInput
                  style={styles.textInput}
                  value={customRole}
                  onChangeText={(txt) => {
                    setCustomRole(txt);
                    if (txt) setTargetRole(txt);
                  }}
                  placeholder="e.g. Distributed Systems Engineer..."
                  placeholderTextColor={theme.colors.textSubtle}
                />
              </View>
            </View>
          )}

          {/* ================= STEP 3: INTELLIGENT TECH STACK GUESSER ================= */}
          {currentStep === 3 && (
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>Verify your technical stack</Text>
              <Text style={styles.questionSub}>
                Selected for <Text style={{ fontWeight: '800', color: theme.colors.textDark }}>{targetRole || customRole}</Text>. You will be evaluated on these tools.
              </Text>

              {/* Action Toolbar: Select All / Deselect All */}
              <View style={styles.stackToolbarRow}>
                <Text style={styles.selectedCountText}>
                  {selectedStacks.length} of {suggestedStacks.length} selected
                </Text>

                <View style={styles.stackActionBtns}>
                  <TouchableOpacity style={styles.miniActionBtn} onPress={handleSelectAllStacks}>
                    <Text style={styles.miniActionText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniActionBtn} onPress={handleDeselectAllStacks}>
                    <Text style={styles.miniActionText}>Deselect All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Interactive Stacks Chips */}
              <View style={styles.chipsContainer}>
                {suggestedStacks.map((tech) => {
                  const isSelected = selectedStacks.includes(tech);
                  return (
                    <TouchableOpacity
                      key={tech}
                      style={[styles.chipButton, isSelected && styles.chipActiveLime]}
                      onPress={() => toggleStack(tech)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextDark]}>
                        {tech}
                      </Text>
                      {isSelected ? (
                        <Feather name="check" size={13} color={theme.colors.textDark} />
                      ) : (
                        <Feather name="plus" size={13} color={theme.colors.textSubtle} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Add Custom Tech Input */}
              <View style={styles.addCustomRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={customStackInput}
                  onChangeText={setCustomStackInput}
                  placeholder="Add custom technology (e.g. GraphQL, RabbitMQ)..."
                  placeholderTextColor={theme.colors.textSubtle}
                  onSubmitEditing={handleAddCustomStack}
                />
                <TouchableOpacity style={styles.addTechBtn} onPress={handleAddCustomStack}>
                  <Feather name="plus" size={18} color={theme.colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 4: EXPECTED LPA ================= */}
          {currentStep === 4 && (
            <View style={styles.questionBlock}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>STEP 4 • COMPENSATION GOAL</Text>
              </View>
              <Text style={styles.questionTitle}>What is your target package?</Text>
              <Text style={styles.questionSub}>
                Compensation tier determines the difficulty bar and complexity of system failure scenarios.
              </Text>

              <View style={styles.chipsContainer}>
                {lpaTiers.map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[styles.chipButton, expectedLpa === tier && styles.chipActiveLime]}
                    onPress={() => {
                      setExpectedLpa(tier);
                      setCustomLpa('');
                    }}
                  >
                    <Text style={[styles.chipText, expectedLpa === tier && styles.chipTextDark]}>
                      {tier}
                    </Text>
                    {expectedLpa === tier && <Feather name="check" size={13} color={theme.colors.textDark} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customInputWrap}>
                <Text style={styles.fieldLabel}>OR EXACT CUSTOM TARGET</Text>
                <TextInput
                  style={styles.textInput}
                  value={customLpa}
                  onChangeText={(txt) => {
                    setCustomLpa(txt);
                    if (txt) setExpectedLpa(txt);
                  }}
                  placeholder="e.g. 24 LPA + ESOPs..."
                  placeholderTextColor={theme.colors.textSubtle}
                />
              </View>
            </View>
          )}

          {/* ================= STEP 5: COMPANIES & EXPERIENCE ================= */}
          {currentStep === 5 && (
            <View style={styles.questionBlock}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>STEP 5 • DREAM COMPANIES</Text>
              </View>
              <Text style={styles.questionTitle}>Where are you interviewing?</Text>
              <Text style={styles.questionSub}>
                Select the companies you want company-specific grilling archetypes for.
              </Text>

              <View style={styles.chipsContainer}>
                {popularCompanies.map((comp) => {
                  const isSelected = selectedCompanies.includes(comp);
                  return (
                    <TouchableOpacity
                      key={comp}
                      style={[styles.chipButton, isSelected && styles.chipActiveDark]}
                      onPress={() => toggleCompany(comp)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextWhite]}>
                        {comp}
                      </Text>
                      {isSelected && <Feather name="check" size={13} color={theme.colors.accentLime} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Add Custom Company */}
              <View style={styles.addCustomRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={customCompany}
                  onChangeText={setCustomCompany}
                  placeholder="Add another company (e.g. Razorpay, Coinbase)..."
                  placeholderTextColor={theme.colors.textSubtle}
                  onSubmitEditing={handleAddCustomCompany}
                />
                <TouchableOpacity style={styles.addTechBtn} onPress={handleAddCustomCompany}>
                  <Feather name="plus" size={18} color={theme.colors.textWhite} />
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 18 }}>
                <Text style={styles.fieldLabel}>CURRENT PREPARATION STAGE</Text>
                <View style={styles.chipsContainer}>
                  {experienceTiers.map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[styles.chipButton, experienceLevel === tier && styles.chipActiveDark]}
                      onPress={() => setExperienceLevel(tier)}
                    >
                      <Text style={[styles.chipText, experienceLevel === tier && styles.chipTextWhite]}>
                        {tier}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Sleek App-Themed Prompter Card */}
        {errorMessage ? (
          <View style={styles.appPrompterWrapper}>
            <View style={styles.appPrompterCard}>
              <View style={styles.prompterIconBadge}>
                <Feather name="info" size={13} color={theme.colors.accentLime} />
              </View>
              <View style={styles.prompterTextContainer}>
                <View style={styles.prompterEyebrowRow}>
                  <View style={styles.prompterLimeDot} />
                  <Text style={styles.prompterEyebrow}>REQUIRED TO CONTINUE</Text>
                </View>
                <Text style={styles.prompterMessageText}>{errorMessage}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setErrorMessage(null)}
                style={styles.prompterCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={14} color={theme.colors.textSubtle} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Navigation Buttons Row: Back & Next */}
        <View style={styles.navigationRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Feather name="arrow-left" size={18} color={theme.colors.textDark} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.textWhite} />
            ) : (
              <View style={styles.nextBtnContent}>
                <Text style={styles.nextButtonText}>
                  {currentStep === TOTAL_STEPS ? 'Launch Dashboard' : 'Next Step'}
                </Text>
                <Feather name="arrow-right" size={18} color={theme.colors.textWhite} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 24,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepPillIndicator: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.pillLight,
  },
  stepPillActive: {
    backgroundColor: theme.colors.cardDark,
  },
  stepPillCompleted: {
    backgroundColor: theme.colors.accentLime,
  },
  stepPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSubtle,
  },
  stepPillTextActive: {
    color: theme.colors.textWhite,
  },
  stepPillTextCompleted: {
    color: theme.colors.textDark,
  },
  animatedQuestionCard: {
    minHeight: 400,
  },
  questionBlock: {
    marginBottom: 20,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    marginBottom: 10,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 1.2,
  },
  sectionBadgeLime: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentLime,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 6,
    marginBottom: 10,
  },
  sectionBadgeLimeText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: 1.2,
  },
  questionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textDark,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  questionSub: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  whiteCardBox: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e5dc',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: '#f8f8f6',
    borderWidth: 1,
    borderColor: '#e2e5dc',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textDark,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: '#e2e5dc',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  },
  chipActiveDark: {
    backgroundColor: theme.colors.cardDark,
    borderColor: theme.colors.cardDark,
  },
  chipActiveLime: {
    backgroundColor: theme.colors.accentLime,
    borderColor: theme.colors.accentLime,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  chipTextWhite: {
    color: theme.colors.textWhite,
  },
  chipTextDark: {
    color: theme.colors.textDark,
  },
  customInputWrap: {
    marginTop: 12,
    gap: 6,
  },
  stackToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  stackActionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  miniActionBtn: {
    backgroundColor: theme.colors.pillLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  miniActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  addCustomRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  addTechBtn: {
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appPrompterWrapper: {
    marginBottom: 16,
  },
  appPrompterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardDark,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#262932',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  prompterIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 255, 50, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 50, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompterTextContainer: {
    flex: 1,
    gap: 2,
  },
  prompterEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  prompterLimeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.accentLime,
  },
  prompterEyebrow: {
    fontSize: 9.5,
    fontWeight: '900',
    color: theme.colors.accentLime,
    letterSpacing: 0.6,
  },
  prompterMessageText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textWhite,
    lineHeight: 16,
  },
  prompterCloseButton: {
    padding: 4,
  },
  textInputError: {
    borderColor: theme.colors.cardDark,
    borderWidth: 2,
  },
  chipsContainerError: {
    borderWidth: 1.5,
    borderColor: '#dcded6',
    borderRadius: 14,
    padding: 6,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: '#e2e5dc',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  nextButton: {
    flex: 1,
    backgroundColor: theme.colors.cardDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  nextBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
