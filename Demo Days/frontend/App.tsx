import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from './src/components/SplashScreen';
import { AuthScreen } from './src/components/AuthScreen';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import { IntakeScreen } from './src/components/IntakeScreen';
import { InterrogationScreen } from './src/components/InterrogationScreen';
import { DiagnosticScreen } from './src/components/DiagnosticScreen';
import { StatisticsScreen } from './src/components/StatisticsScreen';
import { ProfileScreen } from './src/components/ProfileScreen';
import { BottomNavBar, BottomNavTab } from './src/components/BottomNavBar';
import { api } from './src/services/api';
import { theme } from './src/theme';
import {
  StartInterviewPayload,
  StartInterviewResponse,
  TurnLogDTO,
  DiagnosticReportDTO,
  UserProfile,
} from './src/types';

type ScreenState = 'SPLASH' | 'AUTH' | 'ONBOARDING' | 'INTAKE' | 'INTERROGATION' | 'DIAGNOSTIC' | 'PROFILE' | 'STATISTICS';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('SPLASH');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Active Session State
  const [sessionId, setSessionId] = useState<string>('');
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [maxTurns, setMaxTurns] = useState<number>(8);
  const [latestQuestion, setLatestQuestion] = useState<string>('');
  const [interviewerReaction, setInterviewerReaction] = useState<string | null>(null);
  const [turns, setTurns] = useState<TurnLogDTO[]>([]);
  const [diagnostic, setDiagnostic] = useState<DiagnosticReportDTO | null>(null);

  // Splash Finish Handler - Restores existing device session or shows Auth for first-time devices
  const handleSplashFinish = async () => {
    try {
      const savedUserStr = await AsyncStorage.getItem('@user_profile');
      if (savedUserStr) {
        const savedUser: UserProfile = JSON.parse(savedUserStr);
        setUserProfile(savedUser);
        if (savedUser.onboarding_completed) {
          setScreen('INTAKE');
          return;
        } else {
          setScreen('ONBOARDING');
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to restore saved device session:', e);
    }
    // Only if first time opening on this device:
    setScreen('AUTH');
  };

  // Auth Success Handler -> Persist profile to device and route appropriately
  const handleLoginSuccess = async (user: UserProfile) => {
    setUserProfile(user);
    await AsyncStorage.setItem('@user_profile', JSON.stringify(user));
    if (user.onboarding_completed) {
      setScreen('INTAKE');
    } else {
      setScreen('ONBOARDING');
    }
  };

  // Onboarding Finish Handler -> Save completed profile & enter Dashboard
  const handleOnboardingComplete = async (updatedUser: UserProfile) => {
    setUserProfile(updatedUser);
    await AsyncStorage.setItem('@user_profile', JSON.stringify(updatedUser));
    setScreen('INTAKE');
  };

  // Handle in-place profile updates (e.g. candidate edits name on Dashboard)
  const handleUpdateUser = async (updated: Partial<UserProfile>) => {
    if (!userProfile) return;
    const merged = { ...userProfile, ...updated };
    setUserProfile(merged);
    await AsyncStorage.setItem('@user_profile', JSON.stringify(merged));
    if (userProfile.id && updated.name) {
      try {
        await api.updateProfile(userProfile.id, { name: updated.name });
      } catch (e) {
        console.warn('Failed to update remote profile:', e);
      }
    }
  };

  // Handle Start Interview
  const handleStartInterview = async (payload: StartInterviewPayload) => {
    setIsLoading(true);
    try {
      const res: StartInterviewResponse = await api.startInterview({
        ...payload,
        user_id: userProfile?.id,
        candidate_name: userProfile?.name || payload.candidate_name || 'Candidate',
      });
      setSessionId(res.session_id);
      setCurrentTurn(res.current_turn);
      setMaxTurns(res.max_turns);
      setLatestQuestion(res.opening_question);
      setTurns([
        {
          turn_number: 1,
          question: res.opening_question,
          user_answer: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setScreen('INTERROGATION');
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Could not connect to FastAPI server at localhost:8000');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Submit Answer
  const handleSendAnswer = async (answer: string) => {
    if (!sessionId) return;
    setIsLoading(true);

    // Optimistically update previous turn with user's answer
    setTurns((prev) =>
      prev.map((t) => (t.turn_number === currentTurn ? { ...t, user_answer: answer } : t))
    );

    try {
      const res = await api.submitAnswer(sessionId, answer);

      if (res.is_completed) {
        const detail = await api.getInterviewDetail(sessionId);
        if (detail.diagnostic) {
          setDiagnostic(detail.diagnostic);
          setScreen('DIAGNOSTIC');
        }
      } else {
        // Next Turn
        setCurrentTurn(res.current_turn);
        setLatestQuestion(res.next_question || 'Continue your explanation.');
        setInterviewerReaction(res.interviewer_reaction || null);
        setTurns((prev) => [
          ...prev,
          {
            turn_number: res.current_turn,
            question: res.next_question || '',
            user_answer: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to communicate with interview engine');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Finish Early
  const handleFinishEarly = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const detail = await api.finishInterview(sessionId);
      if (detail.diagnostic) {
        setDiagnostic(detail.diagnostic);
        setScreen('DIAGNOSTIC');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not conclude interview session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setSessionId('');
    setCurrentTurn(1);
    setLatestQuestion('');
    setTurns([]);
    setDiagnostic(null);
    setScreen('INTAKE');
  };

  // Map ScreenState to active BottomNavTab
  const getActiveTab = (): BottomNavTab => {
    switch (screen) {
      case 'STATISTICS':
      case 'DIAGNOSTIC':
        return 'STATISTICS';
      case 'INTERROGATION':
        return 'INTERVIEW';
      case 'PROFILE':
        return 'PROFILE';
      case 'INTAKE':
      default:
        return 'DASHBOARD';
    }
  };

  // Handle switching between the 4 Bottom Nav sections
  const handleSelectTab = (tab: BottomNavTab) => {
    switch (tab) {
      case 'DASHBOARD':
        setScreen('INTAKE');
        break;
      case 'STATISTICS':
        setScreen('STATISTICS');
        break;
      case 'INTERVIEW':
        if (sessionId) {
          setScreen('INTERROGATION');
        } else {
          handleStartInterview({
            user_id: userProfile?.id,
            candidate_name: userProfile?.name || 'Candidate',
            target_role: userProfile?.target_role || 'Software Engineer',
            archetype: 'PRODUCT_STARTUP',
            project_description: `Technical interview drill for ${userProfile?.target_role || 'Software Engineer'} targeting ${userProfile?.interested_companies || 'Top Tech Companies'}. Testing architectural depth, trade-offs, and failure recovery.`,
            max_turns: 6,
          });
        }
        break;
      case 'PROFILE':
        setScreen('PROFILE');
        break;
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar style="dark" />

      {/* Screen 1: Splash Screen */}
      {screen === 'SPLASH' && <SplashScreen onFinish={handleSplashFinish} />}

      {/* Screen 2: Google Auth Screen */}
      {screen === 'AUTH' && <AuthScreen onLoginSuccess={handleLoginSuccess} />}

      {/* Screen 3: Onboarding Screen */}
      {screen === 'ONBOARDING' && userProfile && (
        <OnboardingScreen user={userProfile} onComplete={handleOnboardingComplete} />
      )}

      {/* Screen 4: Intake / Setup Screen (The Dashboard) */}
      {screen === 'INTAKE' && (
        <IntakeScreen
          user={userProfile}
          onStart={handleStartInterview}
          isLoading={isLoading}
          onUpdateUser={handleUpdateUser}
          onNavigateToProfile={() => setScreen('PROFILE')}
        />
      )}

      {/* Screen 5: Live Interrogation Room */}
      {screen === 'INTERROGATION' && (
        <InterrogationScreen
          currentTurn={currentTurn}
          maxTurns={maxTurns}
          turns={turns}
          latestQuestion={latestQuestion}
          interviewerReaction={interviewerReaction}
          onSendAnswer={handleSendAnswer}
          onFinishEarly={handleFinishEarly}
          isLoading={isLoading}
        />
      )}

      {/* Screen 6: Dynamic Engineering Statistics Dashboard */}
      {screen === 'STATISTICS' && (
        <StatisticsScreen
          user={userProfile}
          onStartDrill={handleStartInterview}
          isLoading={isLoading}
          onNavigateToRoadmap={() => setScreen('INTAKE')}
          onNavigateToProfile={() => setScreen('PROFILE')}
        />
      )}

      {/* Screen 6b: Skill & Performance Diagnostic Report */}
      {screen === 'DIAGNOSTIC' && (
        <DiagnosticScreen
          diagnostic={
            diagnostic || {
              hire_decision: 'Completed',
              seniority_signal: 'Evaluated',
              rambling_index: 'Low',
              raw_markdown_report: '',
              created_at: new Date().toISOString(),
              overall_score: 75,
              section_scores: [],
              what_went_right: [],
              what_went_wrong: [],
              say_this_instead: [],
            }
          }
          user={userProfile}
          onRestart={handleRestart}
          onViewStatistics={() => setScreen('STATISTICS')}
          onBackToRoadmap={() => {
            handleRestart();
            setScreen('INTAKE');
          }}
        />
      )}

      {/* Screen 7: Profile Screen */}
      {screen === 'PROFILE' && (
        <ProfileScreen
          user={userProfile}
          onEditProfile={() => setScreen('ONBOARDING')}
          onSignOut={async () => {
            await AsyncStorage.removeItem('@user_profile');
            setUserProfile(null);
            setScreen('AUTH');
          }}
        />
      )}

      {/* Floating Bottom Navigation Bar (Visible only inside authenticated screens) */}
      {screen !== 'SPLASH' && screen !== 'AUTH' && screen !== 'ONBOARDING' && (
        <BottomNavBar
          activeTab={getActiveTab()}
          onSelectTab={handleSelectTab}
          hasActiveSession={!!sessionId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
