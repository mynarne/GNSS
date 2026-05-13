### 삼변측량 ( 내 위치 구하기 기본 알고리즘 )

import numpy as np


def calculate_position(satellites, distances):
    """위성들의 위치와 거리 정보를 기반으로 사용자의 3차원 위치 계산

    :param satellites: 위성들의 좌표 리스트 (예: [(x1, y1, z1), (x2, y2, z2), ...])
    :param distances: 각 위성까지의 거리 리스트 (예: [d1, d2, ...])
    :return: 계산된 위치 좌표 (x, y, z)
    """
    if len(satellites) < 3:
        raise ValueError("위치의 삼변측량을 위해서는 최소 3개 이상의 위성 정보가 필요합니다.")

    A = []
    b = []

    # 첫 번째 위성을 기준으로 선형화 방정식 구성
    x1, y1, z1 = satellites[0]
    d1 = distances[0]

    for i in range(1, len(satellites)):
        xi, yi, zi = satellites[i]
        di = distances[i]

        A.append(
            [
                2 * (xi - x1),
                2 * (yi - y1),
                2 * (zi - z1),
            ]
        )
        b.append(
            (x1**2 - xi**2)
            + (y1**2 - yi**2)
            + (z1**2 - zi**2)
            + (di**2 - d1**2)
        )

    # 최소자승법(Least Squares)을 활용한 위치 계산
    A = np.array(A)
    b = np.array(b)

    try:
        # np.linalg.lstsq를 사용하여 해 계산.
        position, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
        return position.tolist()
    except Exception as e:
        print(f"삼변측량 계산 중 오류 발생: {e}")
        return None
