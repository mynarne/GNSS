// src/screens/TravelMapScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Alert, Image, ScrollView, TouchableOpacity, Text, Animated, Pressable } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps'; // Polyline 추가!
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_STYLE = [
  { "featureType": "water", "stylers": [{ "color": "#c9e8fa" }] },
  { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#b0ccf8" }, { "weight": 1.5 }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#808080" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "landscape", "stylers": [{ "color": "#f5f5f5" }] }
];

const TARGET_PEAK = {
  latitude: 33.361666,
  longitude: 126.529166,
  altitude: 1947,
  name: '한라산 백록담'
};

interface TravelMarker {
  id: number;
  coordinate: { latitude: number; longitude: number; };
  title: string;
}

interface PhotoItem {
  uri: string;
  isRepresentative: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  capturedAt?: string;
}

// 궤적 좌표용 인터페이스
interface Coordinate {
  latitude: number;
  longitude: number;
}

const TravelMapScreen = ({ viewMode }: { viewMode: 'personal' | 'group' | 'hiking' }) => {
  const [markers, setMarkers] = useState<TravelMarker[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[]>([]);
  
  // 궤적(선)을 그리기 위한 상태 관리
  const [trajectoryLine, setTrajectoryLine] = useState<Coordinate[]>([]);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:5001';
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    fetchSavedLocations();
    fetchMyTrajectory(); // 화면 로드 시 궤적 데이터도 함께 불러옵니다.
    startLocationTracking();

    // 화면이 켜질 때 폰에 쌓여있던 오프라인 데이터가 있는지 확인하고 동기화를 시도합니다.
    syncOfflineTrajectory();
  }, [viewMode]);

  // 1. 오프라인 상태일 때 폰(AsyncStorage)에 좌표를 임시 보관하는 함수
  const saveOfflineTrajectory = async (latitude: number, longitude: number) => {
    try {
      const existing = await AsyncStorage.getItem('offline_trajectory');
      const offlineData = existing ? JSON.parse(existing) : [];
      offlineData.push({ 
        latitude, 
        longitude, 
        timestamp: new Date().toISOString() 
      });
      await AsyncStorage.setItem('offline_trajectory', JSON.stringify(offlineData));
      console.log('인터넷 연결 끊김: 좌표를 로컬 저장소에 안전하게 보관했습니다.');
    } catch (error) {
      console.error('로컬 저장소 저장 중 오류 발생:', error);
    }
  };

  // 2. 인터넷이 연결되었을 때 로컬 저장소의 데이터를 서버로 한 번에 쏘는 함수
  const syncOfflineTrajectory = async () => {
    try {
      const existing = await AsyncStorage.getItem('offline_trajectory');
      if (!existing) return; // 보관된 데이터가 없으면 패스

      const offlineData = JSON.parse(existing);
      if (offlineData.length === 0) return;

      const token = await AsyncStorage.getItem('userToken');
      if (!token || !API_URL) return;

      // 폰에 쌓인 좌표들을 배열로 한 번에 백엔드로 전송합니다. (API는 추후 배열 전송 대응으로 약간 수정 필요)
      const response = await fetch(`${API_URL}/location/track/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coordinates: offlineData })
      });

      if (response.ok) {
        console.log(`오프라인 데이터 ${offlineData.length}건 동기화 성공!`);
        // 전송에 성공하면 로컬 창고를 깨끗하게 비웁니다.
        await AsyncStorage.removeItem('offline_trajectory');
        
        // 동기화 완료 후 궤적 선을 다시 그려줍니다.
        fetchMyTrajectory(); 
      }
    } catch (error) {
      console.log('아직 인터넷이 불안정하여 동기화를 보류합니다.');
    }
  };

  // 실시간 위치를 추적하고, 백엔드에 궤적을 저장합니다.
  // 3. 실시간 위치 추적 로직 (오프라인 저장 기능 결합)
  const startLocationTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, 
        distanceInterval: 10, 
      },
      async (location) => {
        setCurrentLoc(location);
        
        if (viewMode === 'hiking') {
          checkPeakProximity(location.coords.latitude, location.coords.longitude, location.coords.altitude);
        }

        // 실시간 좌표를 화면의 선 긋기 배열에 추가합니다.
        setTrajectoryLine(prev => [...prev, { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        }]);

        // 백엔드 전송 시도
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token && API_URL) {
            const response = await fetch(`${API_URL}/location/track`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              })
            });

            // 서버 전송에 실패했다면 (인터넷 끊김 등) 폰에 임시 보관합니다.
            if (!response.ok) {
              await saveOfflineTrajectory(location.coords.latitude, location.coords.longitude);
            }
          }
        } catch (error) {
          // fetch 에러(완전한 오프라인 상태)일 때도 폰에 임시 보관합니다.
          await saveOfflineTrajectory(location.coords.latitude, location.coords.longitude);
        }
      }
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkPeakProximity = (currentLat: number, currentLon: number, currentAlt: number | null) => {
    const distance = calculateDistance(currentLat, currentLon, TARGET_PEAK.latitude, TARGET_PEAK.longitude);
    if (distance <= 100) {
      let message = `고생하셨습니다! ${TARGET_PEAK.name} 정상이 코앞입니다!`;
      if (currentAlt) message += `\n현재 고도: 약 ${Math.round(currentAlt)}m`;
      Alert.alert('정상 도달 알림 🚩', message);
    }
  };

  const fetchSavedLocations = async () => {
    if (!API_URL) return;
    try {
      const response = await fetch(`${API_URL}/map/api/my-logs?mode=${viewMode}`);
      const text = await response.text();
      if (text.startsWith('<')) return; 
      const data = JSON.parse(text);
      if (response.ok) setMarkers(data);
    } catch (error) {
      console.log("기록된 데이터가 아직 없습니다.");
    }
  };

  // 백엔드에서 이전 궤적 데이터를 불러옵니다.
  const fetchMyTrajectory = async () => {
    if (!API_URL) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/location/my-trajectory`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setTrajectoryLine(result.data);
      }
    } catch (error) {
      console.log("궤적 데이터를 불러오지 못했습니다.");
    }
  };

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    Animated.spring(animation, { toValue, friction: 5, useNativeDriver: true }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const getSubButtonStyle = (index: number) => ({
    transform: [
      { scale: animation },
      { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -75 * (index + 1)] }) },
    ],
    opacity: animation,
  });

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted' || locStatus !== 'granted') {
      Alert.alert('권한 필요', '카메라와 위치 권한이 필요합니다.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5, 
      exif: true,
    });

    if (!result.canceled) {
      const capturedAt = result.assets[0].exif?.DateTimeOriginal || new Date().toISOString();
      const newPhoto: PhotoItem = {
        uri: result.assets[0].uri,
        isRepresentative: selectedPhotos.length === 0, 
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || 0,
        capturedAt: capturedAt
      };
      setSelectedPhotos(prev => [...prev, newPhoto]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true, 
      quality: 0.5, 
      exif: true,
    });

    if (!result.canceled) {
      const newPhotos: PhotoItem[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        isRepresentative: selectedPhotos.length === 0 && index === 0,
        latitude: asset.exif?.GPSLatitude,
        longitude: asset.exif?.GPSLongitude,
        altitude: asset.exif?.GPSAltitude || 0,
        capturedAt: asset.exif?.DateTimeOriginal
      }));
      setSelectedPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const setAsRepresentative = (index: number) => {
    const updated = selectedPhotos.map((p, i) => ({
      ...p,
      isRepresentative: i === index,
    }));
    setSelectedPhotos(updated);
  };

  const removePhoto = (index: number) => {
    const updated = selectedPhotos.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some(p => p.isRepresentative)) {
      updated[0].isRepresentative = true;
    }
    setSelectedPhotos(updated);
  };

  const uploadToMap = async () => {
    if (!API_URL) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      const repIndex = selectedPhotos.findIndex(p => p.isRepresentative);
      const repPhoto = selectedPhotos[repIndex !== -1 ? repIndex : 0];

      if (!repPhoto.latitude || !repPhoto.longitude) {
        Alert.alert('위치 정보 없음', '선택한 사진에 위치 정보가 없습니다.');
        return;
      }

      selectedPhotos.forEach((p, index) => {
        formData.append('photos', { uri: p.uri, name: `photo_${Date.now()}_${index}.jpg`, type: 'image/jpeg' } as any);
      });

      formData.append('representative_index', String(repIndex >= 0 ? repIndex : 0));
      formData.append('latitude', String(repPhoto.latitude));
      formData.append('longitude', String(repPhoto.longitude));
      
      if (viewMode === 'group') formData.append('group_id', '1');
      if (repPhoto.capturedAt) formData.append('captured_at', repPhoto.capturedAt);

      const response = await fetch(`${API_URL}/location/visit`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData 
      });
      const result = await response.json();
      
      if (response.ok) {
        const newMarker: TravelMarker = {
          id: result.log_id || Date.now(),
          coordinate: { latitude: result.coords.lat, longitude: result.coords.lon },
          title: "방문 기록 완료",
        };
        setMarkers(prev => [...prev, newMarker]);
        setSelectedPhotos([]); 
        Alert.alert('지도 기록 성공', `총 ${selectedPhotos.length}장의 사진이 지도에 쾅! 박혔습니다.\nAI 분류: ${result.category || '완료'}`);
      } else {
        Alert.alert('업로드 실패', result.message);
      }
    } catch (error) {
      Alert.alert('통신 오류', '서버와 연결할 수 없습니다.');
    }
  };

  const renderCluster = (cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ longitude: geometry.coordinates[0], latitude: geometry.coordinates[1] }}
        onPress={onPress}
      >
        <View style={styles.cloudCluster}>
          <Ionicons name="cloud" size={50} color="#87CEEB" />
          <Text style={styles.clusterText}>+{points}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      <MapView 
        provider={PROVIDER_GOOGLE}
        style={styles.map} 
        customMapStyle={viewMode === 'hiking' ? [] : MAP_STYLE} 
        initialRegion={{ latitude: 37.5665, longitude: 126.9780, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
        mapType={viewMode === 'hiking' ? 'satellite' : 'standard'}
        showsUserLocation={true}
        clusterColor="#87CEEB"
        renderCluster={renderCluster} 
        animationEnabled={false} 
      >
        {viewMode === 'hiking' && (
          <UrlTile 
            urlTemplate="https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}
        
        {/* 궤적 선 그리기 (Polyline 추가!) */}
        {trajectoryLine.length > 0 && (
          <Polyline 
            coordinates={trajectoryLine}
            strokeColor="#87CEEB" // 우리 앱 메인 테마색!
            strokeWidth={5}       // 도톰한 굵기로 잘 보이게!
            lineJoin="round"      // 꺾이는 부분을 부드럽게
          />
        )}

        {markers.map((marker) => (
          <Marker key={marker.id} coordinate={marker.coordinate} title={marker.title} pinColor="#87CEEB" />
        ))}
      </MapView>

      {isMenuOpen && (
        <Pressable style={styles.overlay} onPress={toggleMenu} />
      )}

      {selectedPhotos.length > 0 && (
        <View style={styles.previewContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
            {selectedPhotos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.deleteButton} onPress={() => removePhoto(index)}>
                  <Ionicons name="close" size={16} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.repButton, photo.isRepresentative && styles.repActive]} onPress={() => setAsRepresentative(index)}>
                  <Text style={[styles.repText, photo.isRepresentative && styles.repTextActive]}>{photo.isRepresentative ? '★ 대표' : '대표 지정'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.mapSaveButton} onPress={uploadToMap}>
            <Text style={styles.saveButtonText}>📍 지도에 바로 기록하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPhotos.length === 0 && (
        <View style={styles.fabContainer}>
          <Animated.View style={[styles.subButton, getSubButtonStyle(1)]}>
            <TouchableOpacity style={styles.bubble} onPress={() => { pickImage(); toggleMenu(); }}>
              <Ionicons name="images" size={24} color="#FFFFFF" />
              <View style={styles.bubbleTag}><Text style={styles.tagText}>갤러리</Text></View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.subButton, getSubButtonStyle(0)]}>
            <TouchableOpacity style={styles.bubble} onPress={() => { takePhoto(); toggleMenu(); }}>
              <Ionicons name="camera" size={24} color="#FFFFFF" />
              <View style={styles.bubbleTag}><Text style={styles.tagText}>사진 촬영</Text></View>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
            <Animated.View style={{ transform: [{ rotate: animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
              <Ionicons name="add" size={35} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 80 },
  fabContainer: { position: 'absolute', bottom: 35, right: 25, alignItems: 'center', zIndex: 90 },
  fab: { backgroundColor: '#87CEEB', width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  subButton: { position: 'absolute', alignItems: 'center' },
  bubble: { backgroundColor: '#444', width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  bubbleTag: { position: 'absolute', right: 70, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, width: 80 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  previewContainer: { position: 'absolute', bottom: 20, left: 10, right: 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 15, padding: 15, elevation: 5, zIndex: 100 },
  photoList: { marginBottom: 15 },
  photoItem: { marginRight: 15, alignItems: 'center', position: 'relative' },
  previewImage: { width: 100, height: 100, borderRadius: 10 },
  deleteButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', elevation: 3, zIndex: 10 },
  repButton: { marginTop: 8, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#eee', borderRadius: 15 },
  repActive: { backgroundColor: '#87CEEB' },
  repText: { fontSize: 12, color: '#333' },
  repTextActive: { color: 'white', fontWeight: 'bold' },
  mapSaveButton: { width: '100%', backgroundColor: '#87CEEB', paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cloudCluster: { justifyContent: 'center', alignItems: 'center', width: 60, height: 60 },
  clusterText: { position: 'absolute', color: '#ffffff', fontWeight: 'bold', fontSize: 14, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
});

export default TravelMapScreen;