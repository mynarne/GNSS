// src/screens/MainScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  SafeAreaView, Dimensions, Pressable 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TravelMapScreen from './TravelMapScreen';

const THEME_COLOR = '#87CEEB'; // 개인지도 & SOLO 뱃지 컬러
const GROUP_COLOR = '#A8E6CF'; // 그룹지도 & GROUP 뱃지 컬러 (연두색)
const WHITE = '#FFFFFF';
const BG_COLOR = '#F8FBFC';

type AppMode = 'personal' | 'group' | 'hiking';

const MainScreen = () => {
  const [appMode, setAppMode] = useState<AppMode>('personal');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  
  // 고정된 그룹 ID 관리 (최대 3개)
  const [pinnedIds, setPinnedIds] = useState<number[]>([1]);

  // 행님의 감성이 듬뿍 담긴 멘트 추출 함수
  const getAppPhrase = () => {
    if (appMode === 'personal') return "오직 당신만을 위한 기록의 공간,\n오늘의 발자취를 남겨보세요.";
    if (appMode === 'group') return "함께 나눈 추억은 지워지지 않아요.\n우리들만의 소중한 기록.";
    return "한 걸음씩 채워가는 정복의 즐거움,\n정상을 향한 여정을 기록하세요.";
  };

  // 그룹방 더미 데이터 (추후 백엔드 API와 뽀뽀할 녀석들)
  const [groupRooms, setGroupRooms] = useState([
    { id: 1, name: '누렁 (가족 여행방)', memberCount: 4, lastUpdate: '2시간 전' },
    { id: 2, name: '제주도 원정대', memberCount: 6, lastUpdate: '어제' },
    { id: 3, name: '동기 모임', memberCount: 10, lastUpdate: '3일 전' },
    { id: 4, name: '회사 워크샵', memberCount: 15, lastUpdate: '일주일 전' },
  ]);

  // 등산 일지 더미 데이터
  const hikingLogs = [
    { id: 101, name: '한라산 백록담 정복', type: 'SOLO', date: '2026.05.10' },
    { id: 102, name: '북한산 주말 등반', type: 'GROUP', date: '2026.05.01' },
    { id: 103, name: '지리산 종주', type: 'SOLO', date: '2026.04.15' },
  ];

  // 즐겨찾기(고정) 토글 로직
  const togglePin = (id: number) => {
    if (pinnedIds.includes(id)) {
      setPinnedIds(pinnedIds.filter(pid => pid !== id));
    } else {
      if (pinnedIds.length >= 3) {
        // 상남자는 3개까지만 딱 집중하는 법!
        return;
      }
      setPinnedIds([...pinnedIds, id]);
    }
  };

  // 고정된 아이템을 최상단으로 올리는 정렬 로직
  const sortedGroups = [...groupRooms].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  // 방 선택 시 지도 화면으로 전환
  if (selectedRoom) {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.mapHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRoom(null)}>
            <Ionicons name="chevron-back" size={28} color="#333" />
            <Text style={styles.backTitle}>{selectedRoom.name}</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <TravelMapScreen viewMode={appMode} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 상단 모드 전환 탭바 */}
      <View style={styles.tabBar}>
        {['personal', 'group', 'hiking'].map((mode) => (
          <TouchableOpacity 
            key={mode}
            style={[styles.tabItem, appMode === mode && styles.activeTabItem]}
            onPress={() => setAppMode(mode as AppMode)}
          >
            <Text style={[styles.tabText, appMode === mode && styles.activeTabText]}>
              {mode === 'personal' ? '개인' : mode === 'group' ? '그룹' : '등산'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. 행님 취향 저격 감성 문구 영역 */}
        <View style={styles.phraseContainer}>
          <Text style={styles.phraseText}>{getAppPhrase()}</Text>
        </View>

        {/* 3. 개인 모드: 직관적인 맵 카드와 요약 */}
        {appMode === 'personal' && (
          <View style={styles.personalSection}>
            <TouchableOpacity 
              style={styles.mainMapCard} 
              onPress={() => setSelectedRoom({ name: '나의 개인지도' })}
            >
              <Ionicons name="map" size={40} color={WHITE} />
              <Text style={styles.mainMapCardText}>개인지도 열기</Text>
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={24} color={WHITE} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.recentSummary}>
              <Text style={styles.listHeader}>최근 내 발자취</Text>
              <View style={styles.emptySummary}>
                <Text style={styles.emptyText}>최근 기록된 발자취가 없습니다.</Text>
              </View>
            </View>
          </View>
        )}

        {/* 4. 그룹 모드: 셋로그 스타일의 쾌적한 리스트 */}
        {appMode === 'group' && (
          <View style={styles.listSection}>
            <Text style={styles.listHeader}>참여 중인 그룹</Text>
            {sortedGroups.map((room) => (
              <TouchableOpacity key={room.id} style={styles.itemCard} onPress={() => setSelectedRoom(room)}>
                <View style={styles.itemMain}>
                  <View style={styles.titleRow}>
                    {pinnedIds.includes(room.id) && (
                      <Ionicons name="pin" size={16} color={THEME_COLOR} style={{ marginRight: 5 }} />
                    )}
                    <Text style={styles.itemName}>{room.name}</Text>
                  </View>
                  <Text style={styles.itemSub}>업데이트: {room.lastUpdate}</Text>
                </View>
                
                <View style={styles.itemRight}>
                  <View style={styles.countBadge}>
                    <Ionicons name="people" size={12} color="#666" />
                    <Text style={styles.countText}>{room.memberCount}</Text>
                  </View>
                  <Pressable style={styles.pinAction} onPress={() => togglePin(room.id)}>
                    <Ionicons 
                      name={pinnedIds.includes(room.id) ? "star" : "star-outline"} 
                      size={20} 
                      color={pinnedIds.includes(room.id) ? "#FFD700" : "#CCC"} 
                    />
                  </Pressable>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 5. 등산 모드: 행님이 기획하신 SOLO/GROUP 뱃지 시스템 */}
        {appMode === 'hiking' && (
          <View style={styles.listSection}>
            <Text style={styles.listHeader}>나의 등산 일지</Text>
            {hikingLogs.map((log) => (
              <TouchableOpacity key={log.id} style={styles.itemCard} onPress={() => setSelectedRoom(log)}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{log.name}</Text>
                  <Text style={styles.itemSub}>{log.date}</Text>
                </View>
                
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: log.type === 'SOLO' ? THEME_COLOR : GROUP_COLOR }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: log.type === 'SOLO' ? WHITE : '#2C3E50' }
                  ]}>
                    {log.type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  
  // 상단 탭바 스타일 (미니멀)
  tabBar: { 
    flexDirection: 'row', backgroundColor: WHITE, paddingVertical: 12, 
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' 
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20 },
  activeTabItem: { backgroundColor: '#F0F8FF' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#BBB' },
  activeTabText: { color: THEME_COLOR, fontWeight: 'bold' },

  scrollContent: { padding: 25 },
  
  // 감성 멘트 스타일
  phraseContainer: { marginBottom: 30 },
  phraseText: { fontSize: 20, fontWeight: '700', color: '#333', lineHeight: 28 },

  // 개인 모드 하이라이트 카드
  mainMapCard: { 
    backgroundColor: THEME_COLOR, borderRadius: 24, padding: 30, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 35,
    elevation: 8, shadowColor: THEME_COLOR, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15
  },
  mainMapCardText: { color: WHITE, fontSize: 22, fontWeight: 'bold', marginLeft: 20 },
  cardArrow: { position: 'absolute', right: 25 },

  // 리스트 아이템 공통 스타일
  listHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  itemCard: { 
    flexDirection: 'row', backgroundColor: WHITE, borderRadius: 20, padding: 20, 
    marginBottom: 15, alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05
  },
  itemMain: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  itemSub: { fontSize: 13, color: '#999' },
  
  itemRight: { alignItems: 'flex-end' },
  countBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  countText: { fontSize: 12, fontWeight: '700', color: '#666', marginLeft: 4 },
  pinAction: { padding: 4 },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '800' },

  recentSummary: { marginTop: 10 },
  emptySummary: { backgroundColor: '#F0F0F0', borderRadius: 20, padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  emptyText: { color: '#AAA' },

  // 지도 헤더 (뒤로가기)
  mapHeader: { backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  backTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 }
});

export default MainScreen;