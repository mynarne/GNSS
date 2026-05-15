# gnss_app/algorithms/cnn_classifier.py
import os
# TensorFlow의 불필요한 정보성 로그 출력을 차단합니다.
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
# oneDNN 최적화 관련 알림 메시지를 비활성화합니다.
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
from tensorflow.keras.applications import ResNet50, MobileNetV2
from tensorflow.keras.applications.resnet50 import preprocess_input as resnet_preprocess
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.imagenet_utils import decode_predictions
from tensorflow.keras.preprocessing import image
import numpy as np

# 상황에 따라 'resnet' 또는 'mobilenet'으로 변경하여 유연하게 사용 가능합니다.
# 현재는 8GB M1 맥북 환경을 고려하여 가볍고 빠른 mobilenet으로 설정합니다.
CURRENT_MODEL_TYPE = 'mobilenet'

# 전역 변수로 모델을 한 번만 로드하여 서버 메모리와 로딩 시간을 최적화합니다.
loaded_model = None

def load_ai_model():
    """설정된 타입에 따라 AI 모델을 메모리에 로드하는 함수입니다."""
    global loaded_model
    if loaded_model is None:
        if CURRENT_MODEL_TYPE == 'resnet':
            print("강력하고 정확한 ResNet50 모델을 로드합니다...")
            loaded_model = ResNet50(weights='imagenet')
        else:
            print("가볍고 빠른 MobileNetV2 모델을 로드합니다...")
            loaded_model = MobileNetV2(weights='imagenet')
    return loaded_model

def classify_image(img_path):
    """
    이미지 경로를 받아 CNN 모델을 통해 카테고리를 분류합니다.
    """
    try:
        model = load_ai_model()
        
        # 입력 크기는 두 모델 모두 224x224를 기본으로 지원합니다.
        img = image.load_img(img_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        
        # 선택된 모델에 맞는 맞춤형 전처리 로직을 거칩니다.
        if CURRENT_MODEL_TYPE == 'resnet':
            x = resnet_preprocess(x)
        else:
            x = mobilenet_preprocess(x)

        # 모델 예측 수행
        preds = model.predict(x)
        top_preds = decode_predictions(preds, top=3)[0]

        # 영문 레이블을 분석하여 한글 카테고리로 매핑합니다.
        label = top_preds[0][1].lower()
        
        food_keywords = ['food', 'dish', 'meal', 'pizza', 'burger', 'restaurant', 'plate']
        if any(key in label for key in food_keywords):
            return "음식"
            
        person_keywords = ['person', 'man', 'woman', 'face', 'boy', 'girl']
        if any(key in label for key in person_keywords):
            return "인물"
            
        return "풍경"

    except Exception as e:
        print(f"이미지 분류 중 오류 발생: {e}")
        return "풍경" # 오류 발생 시 기본값으로 '풍경'을 반환합니다.