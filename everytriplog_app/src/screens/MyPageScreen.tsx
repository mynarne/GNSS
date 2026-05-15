// src/screens/MyPageScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_COLOR = '#87CEEB';
const WHITE = '#FFFFFF';
const BG_COLOR = '#F8FBFC';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:5001';

const MyPageScreen = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트가 켜질 때 백엔드에서 내 정보를 가져옵니다.
  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    try {
      // 로그인할 때 저장해둔 토큰(user_id)을 꺼냅니다.
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error("토큰이 없습니다.");
        setIsLoading(false);
        return;
      }

      // 백엔드 /auth/me API로 요청을 보냅니다.
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.status === 'success') {
        setUserInfo(result.data);
      } else {
        console.error("데이터 로드 실패:", result.message);
      }
    } catch (error) {
      console.error("통신 에러:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    // 실제 운영 환경에서는 전역 상태를 업데이트하여 앱을 재시작 효과를 줍니다.
    alert("로그아웃 되었습니다. (앱을 다시 켜주세요)"); 
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>행님 정보 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더 영역 (설정 버튼 추가) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => alert('설정 페이지로 이동합니다.')}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. 프로필 정보 영역 */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {userInfo?.profile_url ? (
              // 백엔드에서 주는 주소를 활용해 이미지를 띄웁니다.
              <Image source={{ uri: `${API_URL}/${userInfo.profile_url}` }} style={styles.profileImage} />
            ) : (
              // 사진이 없으면 기본 아이콘 표시
              <Ionicons name="person-circle" size={80} color="#CCC" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nicknameText}>{userInfo?.nickname || '이름 없음'} <Text style={styles.usernameText}>({userInfo?.username || '본명'})</Text></Text>
            <Text style={styles.emailText}>{userInfo?.email || '이메일 정보 없음'}</Text>
          </View>
          
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 2. 획득한 칭호(배지) 영역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 칭호</Text>
          <View style={styles.badgeCard}>
            <View style={styles.badgeIcon}>
              <Ionicons name="medal" size={30} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.badgeName}>초보 탐험가</Text>
              <Text style={styles.badgeDesc}>첫 발자취를 남긴 자</Text>
            </View>
          </View>
        </View>

        {/* 3. 내 발자취 요약 영역 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>내 발자취 요약</Text>
            <TouchableOpacity>
              <Text style={styles.moreText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.emptyLogCard}>
            <Ionicons name="footsteps" size={40} color="#DDD" />
            <Text style={styles.emptyLogText}>아직 기록된 발자취가 없습니다.</Text>
            <Text style={styles.emptyLogSubText}>첫 여행을 떠나볼까요?</Text>
          </View>
        </View>

        {/* 4. 로그아웃 버튼 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_COLOR },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  settingsButton: { padding: 5 },
  
  scrollContent: { padding: 20 },

  // 프로필 카드 스타일
  profileCard: { backgroundColor: WHITE, borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  profileImageContainer: { marginBottom: 15 },
  profileImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EEE' },
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  nicknameText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  usernameText: { fontSize: 16, fontWeight: 'normal', color: '#888' },
  emailText: { fontSize: 14, color: '#666' },
  editProfileButton: { backgroundColor: '#F0F8FF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: THEME_COLOR },
  editProfileText: { color: THEME_COLOR, fontWeight: 'bold', fontSize: 14 },

  section: { marginBottom: 30 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  moreText: { color: '#999', fontSize: 14, textDecorationLine: 'underline', marginBottom: 10 },

  // 배지 카드 스타일
  badgeCard: { flexDirection: 'row', backgroundColor: WHITE, padding: 20, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  badgeIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  badgeName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  badgeDesc: { fontSize: 13, color: '#888' },

  // 발자취 요약 (빈 상태)
  emptyLogCard: { backgroundColor: WHITE, padding: 40, borderRadius: 16, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  emptyLogText: { fontSize: 16, color: '#666', fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  emptyLogSubText: { fontSize: 14, color: '#999' },

  // 로그아웃 버튼
  logoutButton: { backgroundColor: '#FFF0F0', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  logoutButtonText: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 16 }
});

export default MyPageScreen;