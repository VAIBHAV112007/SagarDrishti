# backend/generate_test_sonar.py
import cv2
import numpy as np

def create_synthetic_sonar(filename="sample_sonar.png", width=800, height=600):
    # 1. Base seafloor reverberation & speckle
    base = np.random.rayleigh(scale=35, size=(height, width)).astype(np.float32)
    
    # 2. Add water column blind zone in the center (Towfish nadir track)
    mid = width // 2
    nadir_width = 40
    base[:, mid - nadir_width : mid + nadir_width] *= 0.15

    # Normalize to 0-255
    sonar_img = np.clip(base, 0, 255).astype(np.uint8)

    # 3. Add Submerged Anomalies (Highlight + Acoustic Shadow Pairs)
    # Anomaly 1: Cylindrical Pipe (Port Channel)
    # Highlight (Bright acoustic reflection)
    cv2.line(sonar_img, (180, 150), (260, 190), 255, 6)
    # Acoustic Shadow (Black acoustic blockage behind target)
    cv2.line(sonar_img, (140, 140), (220, 180), 10, 8)

    # Anomaly 2: Entangled Ghost Net / Irregular Debris (Starboard Channel)
    # Highlight
    pts_highlight = np.array([[550, 320], [590, 310], [620, 360], [570, 380]], np.int32)
    cv2.fillPoly(sonar_img, [pts_highlight], 245)
    # Shadow
    pts_shadow = np.array([[630, 320], [680, 305], [710, 370], [650, 395]], np.int32)
    cv2.fillPoly(sonar_img, [pts_shadow], 15)

    # Anomaly 3: Sunken Shipwreck Frame (Starboard Channel)
    cv2.rectangle(sonar_img, (500, 100), (580, 160), 240, 4)
    cv2.rectangle(sonar_img, (585, 95), (660, 165), 20, -1)

    cv2.imwrite(filename, sonar_img)
    print(f"Synthetic sonar image saved successfully as '{filename}'.")

if __name__ == "__main__":
    create_synthetic_sonar()