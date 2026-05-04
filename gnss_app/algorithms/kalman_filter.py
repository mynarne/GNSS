### 오차 보정용 필터

# gnss_app/algorithms/kalman_filter.py
import numpy as np


class SimpleKalmanFilter:
    """1차원 또는 다차원 위치 추정을 위한 간단한 칼만 필터 클래스"""

    def __init__(self, process_variance, measurement_variance, initial_estimate=0.0, initial_error_covariance=1.0):
        # 프로세스 분산 (시스템의 변화량, Q)
        self.q = process_variance

        # 측정 분산 (센서의 노이즈, R)
        self.r = measurement_variance

        # 초기 추정값 (x)
        self.x = initial_estimate

        # 초기 오차 공분산 (P)
        self.p = initial_error_covariance

    def update(self, measurement):
        """새로운 측정값을 받아 추정값을 갱신"""

        # 예측 단계 (시간 갱신)
        # 이전 추정값과 오차 공분산을 그대로 유지
        # x_pred = self.x
        self.p = self.p + self.q

        # 업데이트 단계 (측정 갱신)
        # 칼만 이득(Kalman Gain, K) 계산
        k = self.p / (self.p + self.r)

        # 새로운 추정값 계산
        self.x = self.x + k * (measurement - self.x)

        # 오차 공분산 갱신
        self.p = (1 - k) * self.p

        return self.x
