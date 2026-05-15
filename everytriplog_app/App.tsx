// App.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Button, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { registerRootComponent } from 'expo';
// 바텀 시트와 말풍선 애니메이션이 제대로 작동하려면 최상단을 이 컴포넌트로 감싸야 합니다.
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import MainScreen from './src/screens/MainScreen';
import IntroAuthScreen from './src/screens/IntroAuthScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import MyPageScreen from './src/screens/MyPageScreen';

// 커뮤니티는 아직 기획 중이라 임시로 둡니다.
const DummyScreen = ({ name }: { name: string }) => (
  <View style={styles.center}><Text>{name} 화면 준비 중입니다.</Text></View>
);

const Tab = createBottomTabNavigator();
const THEME_COLOR = '#87CEEB'; // 우리 앱의 상징인 하늘색 테마

// 온보딩 화면: 유저가 여행가인지 등산가인지 처음 딱 한 번 물어봅니다.
const OnboardingScreen = ({ onSelect }: any) => (
  <View style={styles.center}>
    <Text style={styles.title}>주로 어떤 기록을 남기실 건가요?</Text>
    <View style={styles.buttonSpacing}>
      <Button title="🎒 세상의 모든 곳, 여행 기록" onPress={() => onSelect('travel')} color={THEME_COLOR} />
    </View>
    <Button title="⛰️ 정상에서의 짜릿함, 등산 정복" onPress={() => onSelect('hiking')} color="#bdc3c7" />
  </View>
);

// 하단 탭 내비게이션: 앱의 뼈대가 되는 메뉴 바입니다.
const MainTabNavigator = ({ defaultMode }: { defaultMode: 'travel' | 'hiking' | 'group' }) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: { backgroundColor: '#ffffff', borderTopWidth: 0, elevation: 10, height: 60, paddingBottom: 10 },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'map';
        if (route.name === '지도') iconName = focused ? 'map' : 'map-outline';
        else if (route.name === '계획표') iconName = focused ? 'calendar' : 'calendar-outline';
        else if (route.name === '커뮤니티') iconName = focused ? 'people' : 'people-outline';
        else if (route.name === '마이페이지') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: THEME_COLOR,
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    {/* 메인 지도 화면 */}
    <Tab.Screen name="지도" children={() => <MainScreen initialMode={defaultMode} />} />
    {/* 우리가 만든 진짜 계획표 화면 */}
    <Tab.Screen name="계획표" component={ScheduleScreen} />
    {/* 아직은 더미인 커뮤니티 화면 */}
    <Tab.Screen name="커뮤니티" children={() => <DummyScreen name="커뮤니티" />} />
    {/* 우리가 만든 진짜 마이페이지 화면 */}
    <Tab.Screen name="마이페이지" component={MyPageScreen} />
  </Tab.Navigator>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSelectedDefault, setHasSelectedDefault] = useState(false);
  const [defaultMode, setDefaultMode] = useState<'travel' | 'hiking' | 'group'>('travel');

  useEffect(() => {
    checkAppInitState();
  }, []);

  // 앱이 켜질 때 로그인 토큰과 설정된 모드가 있는지 확인합니다.
  const checkAppInitState = async () => {
    try {
      await AsyncStorage.clear();
      const userToken = await AsyncStorage.getItem('userToken');
      const savedMode = await AsyncStorage.getItem('defaultMode');

      if (userToken) setIsLoggedIn(true);
      if (savedMode) {
        setDefaultMode(savedMode as 'travel' | 'hiking' | 'group');
        setHasSelectedDefault(true);
      }
    } catch (error) {
      console.error('초기 상태 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중일 때 보여주는 화면입니다.
  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={THEME_COLOR} /></View>;

  // 로그인되지 않았다면 멋진 인트로 화면을 보여줍니다.
  if (!isLoggedIn) {
    return <IntroAuthScreen onLoginSuccess={() => {
      setIsLoggedIn(true);
      AsyncStorage.setItem('userToken', 'dummy-token');
    }} />;
  }

  // 로그인은 됐는데 선호 모드를 안 골랐다면 온보딩 화면을 보여줍니다.
  if (!hasSelectedDefault) {
    return (
      <OnboardingScreen 
        onSelect={(mode: 'travel' | 'hiking') => {
          setDefaultMode(mode);
          setHasSelectedDefault(true);
          AsyncStorage.setItem('defaultMode', mode);
        }} 
      />
    );
  }

  // 모든 준비가 끝나면 메인 탭 화면으로 들어갑니다! (에러 방지용 RootView 래핑)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <MainTabNavigator defaultMode={defaultMode} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  buttonSpacing: { marginBottom: 15 }
});

registerRootComponent(App);
export default App;