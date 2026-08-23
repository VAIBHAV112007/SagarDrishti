"""
Sonar Anomaly Detector — Traditional CV-based detection for side-scan sonar imagery.
"""

import cv2
import numpy as np

# ─── Classification Rules ────────────────────────────────────────────
CLASSIFICATION_RULES = [
    {
        "name": "ghost fishing net",
        "aspect_ratio": (1.5, 20.0),
        "solidity": (0.15, 0.55),
        "extent": (0.05, 0.45),
        "circularity": (0.0, 0.25),
        "texture_energy": (15, 120),
        "relative_area": (0.005, 0.15),
        "priority": 1,
    },
    {
        "name": "underwater pipe",
        "aspect_ratio": (3.0, 50.0),
        "solidity": (0.6, 1.0),
        "extent": (0.4, 0.95),
        "circularity": (0.0, 0.2),
        "texture_energy": (10, 80),
        "relative_area": (0.002, 0.08),
        "priority": 2,
    },
    {
        "name": "shipwreck",
        "aspect_ratio": (0.5, 4.0),
        "solidity": (0.3, 0.75),
        "extent": (0.2, 0.7),
        "circularity": (0.05, 0.5),
        "texture_energy": (30, 255),
        "relative_area": (0.02, 0.4),
        "priority": 3,
    },
    {
        "name": "submarine",
        "aspect_ratio": (2.0, 8.0),
        "solidity": (0.7, 1.0),
        "extent": (0.5, 0.95),
        "circularity": (0.15, 0.55),
        "texture_energy": (5, 60),
        "relative_area": (0.03, 0.35),
        "priority": 4,
    },
    {
        "name": "anchor",
        "aspect_ratio": (0.5, 2.5),
        "solidity": (0.35, 0.7),
        "extent": (0.2, 0.6),
        "circularity": (0.1, 0.45),
        "texture_energy": (20, 150),
        "relative_area": (0.003, 0.04),
        "priority": 5,
    },
    {
        "name": "metal box",
        "aspect_ratio": (0.6, 2.5),
        "solidity": (0.75, 1.0),
        "extent": (0.6, 1.0),
        "circularity": (0.3, 0.85),
        "texture_energy": (8, 70),
        "relative_area": (0.003, 0.06),
        "priority": 6,
    },
    {
        "name": "diver",
        "aspect_ratio": (0.4, 2.5),
        "solidity": (0.4, 0.8),
        "extent": (0.25, 0.65),
        "circularity": (0.1, 0.5),
        "texture_energy": (15, 100),
        "relative_area": (0.001, 0.025),
        "priority": 7,
    },
    {
        "name": "fish",
        "aspect_ratio": (1.0, 5.0),
        "solidity": (0.5, 0.95),
        "extent": (0.3, 0.8),
        "circularity": (0.15, 0.65),
        "texture_energy": (5, 60),
        "relative_area": (0.0005, 0.015),
        "priority": 8,
    },
    {
        "name": "tire",
        "aspect_ratio": (0.6, 1.8),
        "solidity": (0.4, 0.75),
        "extent": (0.35, 0.75),
        "circularity": (0.5, 1.0),
        "texture_energy": (10, 80),
        "relative_area": (0.001, 0.02),
        "priority": 9,
    },
    {
        "name": "debris",
        "aspect_ratio": (0.3, 15.0),
        "solidity": (0.1, 0.6),
        "extent": (0.05, 0.5),
        "circularity": (0.0, 0.4),
        "texture_energy": (20, 255),
        "relative_area": (0.001, 0.1),
        "priority": 10,
    },
]

def _extract_features(contour, gray_roi, image_area):
    area = cv2.contourArea(contour)
    if area < 10:
        return None

    perimeter = cv2.arcLength(contour, True)
    x, y, w, h = cv2.boundingRect(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)

    aspect_ratio = max(w, h) / (min(w, h) + 1e-6)
    solidity = area / (hull_area + 1e-6)
    extent = area / (w * h + 1e-6)
    circularity = (4 * np.pi * area) / (perimeter * perimeter + 1e-6)
    relative_area = area / (image_area + 1e-6)

    if gray_roi is not None and gray_roi.size > 0:
        texture_energy = float(np.std(gray_roi))
    else:
        texture_energy = 0.0

    return {
        "area": area,
        "aspect_ratio": aspect_ratio,
        "solidity": solidity,
        "extent": extent,
        "circularity": circularity,
        "texture_energy": texture_energy,
        "relative_area": relative_area,
        "bbox": (x, y, w, h),
    }

def _classify_region(features, allowed_classes):
    best_class = None
    best_score = 0.0

    for rule in CLASSIFICATION_RULES:
        if rule["name"] not in allowed_classes:
            continue

        score = 0.0
        checks = 0

        for feat_name in ["aspect_ratio", "solidity", "extent", "circularity", "texture_energy", "relative_area"]:
            lo, hi = rule[feat_name]
            val = features[feat_name]
            checks += 1

            if lo <= val <= hi:
                mid = (lo + hi) / 2.0
                spread = (hi - lo) / 2.0
                if spread > 0:
                    closeness = 1.0 - abs(val - mid) / spread
                else:
                    closeness = 1.0
                score += closeness
            else:
                if val < lo:
                    dist = (lo - val) / (lo + 1e-6)
                else:
                    dist = (val - hi) / (hi + 1e-6)
                score += max(0, 0.3 - dist * 0.5)

        normalized = score / checks if checks > 0 else 0
        priority_bonus = 0.02 * (11 - rule["priority"]) / 10.0
        final_score = min(normalized + priority_bonus, 1.0)

        if final_score > best_score:
            best_score = final_score
            best_class = rule["name"]

    if best_class is None:
        best_class = "debris"
        best_score = 0.3

    confidence = max(40.0, min(95.0, best_score * 100))
    return best_class, confidence

# --- FIXED: Widened min_area_ratio and max_area_ratio to catch all objects ---
def detect_sonar_anomalies(gray_image: np.ndarray, allowed_classes: list[str], min_area_ratio=0.0001, max_area_ratio=0.9):
    h, w = gray_image.shape[:2]
    image_area = h * w
    min_area = image_area * min_area_ratio
    max_area = image_area * max_area_ratio

    allowed_lower = [c.strip().lower() for c in allowed_classes]

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray_image)

    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    thresh_adapt = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, -15)
    _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    combined = cv2.bitwise_or(thresh_adapt, thresh_otsu)

    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    morphed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    morphed = cv2.morphologyEx(morphed, cv2.MORPH_OPEN, kernel_open, iterations=1)

    edges = cv2.Canny(blurred, 30, 100)
    edge_dilated = cv2.dilate(edges, kernel_close, iterations=2)

    final_mask = cv2.bitwise_or(morphed, edge_dilated)
    final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel_close, iterations=1)

    contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    used_regions = [] 

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue

        x, y, bw, bh = cv2.boundingRect(contour)

        skip = False
        for (rx, ry, rw, rh) in used_regions:
            ix1, iy1 = max(x, rx), max(y, ry)
            ix2, iy2 = min(x + bw, rx + rw), min(y + bh, ry + rh)
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            union = bw * bh + rw * rh - inter
            if union > 0 and inter / union > 0.4:
                skip = True
                break
        if skip:
            continue

        roi = gray_image[y:y+bh, x:x+bw]
        features = _extract_features(contour, roi, image_area)
        if features is None:
            continue

        cls_name, confidence = _classify_region(features, allowed_lower)

        detections.append({
            "bbox": [x, y, x + bw, y + bh],
            "classification": cls_name,
            "confidence": round(confidence, 1),
            "features": {
                "aspect_ratio": round(features["aspect_ratio"], 2),
                "solidity": round(features["solidity"], 2),
                "circularity": round(features["circularity"], 2),
            }
        })
        used_regions.append((x, y, bw, bh))

    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return detections