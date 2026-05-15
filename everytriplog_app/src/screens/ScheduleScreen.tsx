// src/screens/ScheduleScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 앱 전체 공통 테마 컬러
const THEME_COLOR = '#87CEEB';
const WHITE = '#FFFFFF';

// 더미 계획 데이터 (나중에 백엔드 TravelPlan 모델과 연동합니다)
const DUMMY_PLANS = [
  { id: '1', title: '2026 여름 제주 정복기', date: '2026.07.15 - 07.20', type: 'travel', status: 'D-62' },
  { id: '2', title: '설악산 대청봉 일출 산행', date: '2026.06.05', type: 'hiking', status: 'D-22' },
  { id: '3', title: '부산 식도락 여행', date: '2026.08.10 - 08.12', type: 'travel', status: 'D-88' },
];

const ScheduleScreen = () => {
  // 계획 카드 렌더링 함수
  const renderPlanItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.planCard}>
      <View style={styles.iconContainer}>
        {/* 여행과 등산 아이콘을 구분하여 표시합니다 */}
        <Ionicons 
          name={item.type === 'travel' ? 'airplane' : 'mountain'} 
          size={24} 
          color={THEME_COLOR} 
        />
      </View>
      
      <View style={styles.planInfo}>
        <Text style={styles.planTitle}>{item.title}</Text>
        <Text style={styles.planDate}>{item.date}</Text>
      </View>

      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 계획표</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={WHITE} />
        </TouchableOpacity>
      </View>

      {/* 계획 리스트 영역 */}
      <View style={styles.content}>
        <Text style={styles.subTitle}>다가오는 일정</Text>
        <FlatList
          data={DUMMY_PLANS}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanItem}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 계획된 일정이 없슈!</Text>
              <Text style={styles.emptySubText}>새로운 여행을 계획해볼까유?</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // 헤더 스타일
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, backgroundColor: WHITE,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  addButton: { 
    backgroundColor: THEME_COLOR, width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' 
  },

  // 콘텐츠 영역 스타일
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  subTitle: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 15 },
  listPadding: { paddingBottom: 30 },

  // 계획 카드 스타일
  planCard: {
    flexDirection: 'row', backgroundColor: WHITE, borderRadius: 15, padding: 20,
    marginBottom: 15, alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05
  },
  iconContainer: { 
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8f4f8',
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  planDate: { fontSize: 13, color: '#999' },
  
  // D-Day 배지 스타일
  statusBadge: { backgroundColor: '#f1f3f5', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12 },
  statusText: { color: THEME_COLOR, fontWeight: 'bold', fontSize: 12 },

  // 데이터 없을 때 화면 스타일
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#ccc', marginTop: 5 }
});

export default ScheduleScreen;