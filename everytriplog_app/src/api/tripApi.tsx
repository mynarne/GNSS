const API_URL = 'http://192.168.10.20:5001'

export const saveTravelPoint = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(`${API_URL}/location/visit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        latitude, longitude 
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('서버 전송 실패:', error);
    throw error;
  }
};