import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export type BottomNavTab = 'DASHBOARD' | 'STATISTICS' | 'INTERVIEW' | 'PROFILE';

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
  hasActiveSession?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  hasActiveSession = false,
}) => {
  return (
    <View style={styles.navContainer} pointerEvents="box-none">
      <View style={styles.navPill}>
        {/* Section 1: Dashboard */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'DASHBOARD' && styles.tabItemActive]}
          onPress={() => onSelectTab('DASHBOARD')}
          activeOpacity={0.7}
        >
          <Feather
            name="grid"
            size={18}
            color={activeTab === 'DASHBOARD' ? theme.colors.accentLime : theme.colors.textDark}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'DASHBOARD' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        {/* Section 2: Statistics */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'STATISTICS' && styles.tabItemActive]}
          onPress={() => onSelectTab('STATISTICS')}
          activeOpacity={0.7}
        >
          <Feather
            name="bar-chart-2"
            size={18}
            color={activeTab === 'STATISTICS' ? theme.colors.accentLime : theme.colors.textDark}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'STATISTICS' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Statistics
          </Text>
        </TouchableOpacity>

        {/* Section 3: Interview */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'INTERVIEW' && styles.tabItemActive]}
          onPress={() => onSelectTab('INTERVIEW')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={19}
            color={activeTab === 'INTERVIEW' ? theme.colors.accentLime : theme.colors.textDark}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'INTERVIEW' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Interview
          </Text>
        </TouchableOpacity>

        {/* Section 4: Profile */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PROFILE' && styles.tabItemActive]}
          onPress={() => onSelectTab('PROFILE')}
          activeOpacity={0.7}
        >
          <Feather
            name="user"
            size={18}
            color={activeTab === 'PROFILE' ? theme.colors.accentLime : theme.colors.textDark}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'PROFILE' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#e2e3dd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 24,
    marginHorizontal: 2,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: theme.colors.cardDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: theme.colors.textWhite,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: theme.colors.textDark,
    fontWeight: '600',
  },
});
