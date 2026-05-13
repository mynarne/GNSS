// src/api/tripApi.ts
const API_URL = 'http://행님_컴퓨터_IP:5000/api'; // 나중에 IP 확인해서 넣어야 해유!

export const saveTravelPoint = async (latitude: number, longitude: number, userId: string) => {
  try {
    const response = await fetch(`${API_URL}/save-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        user_id: userId,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('서버 전송 실패:', error);
    throw error;
  }
};