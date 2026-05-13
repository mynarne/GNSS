import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Button, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';

// 마커 데이터 타입 정의
interface TravelMarker {
  id: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
}

const MapScreen = () => {
  const [markers, setMarkers] = useState<TravelMarker[]>([]);

  // 컴포넌트 마운트 시 기존 저장된 위치 데이터 로드
  useEffect(() => {
    fetchSavedLocations();
  }, []);

  const fetchSavedLocations = async () => {
    try {
      // 서버에서 사용자의 방문 기록을 가져옴
      const response = await fetch('http://본인_PC_IP:5000/map/api/my-logs');
      const data = await response.json();
      if (response.ok) {
        setMarkers(data);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  // 사진을 선택하고 서버의 칼만 필터 로직으로 전송하는 함수
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      exif: true, // 사진의 메타데이터(GNSS)를 포함
    });

    if (!result.canceled && result.assets[0].exif) {
      const { GPSLatitude, GPSLongitude } = result.assets[0].exif;

      if (GPSLatitude && GPSLongitude) {
        // 서버로 원본 좌표를 전송하여 칼만 필터 보정 및 저장을 요청
        sendLocationToServer(GPSLatitude, GPSLongitude);
      } else {
        Alert.alert('정보 없음', '선택한 사진에 위치 정보가 포함되어 있지 않습니다.');
      }
    }
  };

  const sendLocationToServer = async (lat: number, lon: number) => {
    try {
      const response = await fetch('http://본인_PC_IP:5000/location/visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          // group_id가 필요하다면 여기에 추가
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 서버에서 보정된 좌표를 받아 마커를 업데이트
        const newMarker: TravelMarker = {
          id: result.log_id || Date.now(),
          coordinate: {
            latitude: result.coords.lat,
            longitude: result.coords.lon,
          },
          title: "보정된 방문 위치",
        };
        setMarkers(prev => [...prev, newMarker]);
        Alert.alert('저장 완료', '위치 정보가 보정되어 서버에 저장되었습니다.');
      } else {
        Alert.alert('저장 실패', result.message || '서버 전송 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error("서버 통신 오류:", error);
      Alert.alert('통신 오류', '서버와 연결할 수 없습니다. 네트워크 상태를 확인하세요.');
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={{
          latitude: 37.5665,
          longitude: 126.9780,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            coordinate={marker.coordinate} 
            title={marker.title} 
          />
        ))}
      </MapView>

      <View style={styles.buttonContainer}>
        <Button title="여행 사진 업로드" onPress={pickImage} color="#2ecc71" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    elevation: 5,
  }
});

export default MapScreen;