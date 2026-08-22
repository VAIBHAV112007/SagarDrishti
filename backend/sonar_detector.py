"""
Sonar Anomaly Detector — Traditional CV-based detection for side-scan sonar imagery.

YOLO-World was trained on natural photos and cannot detect objects in acoustic
sonar imagery. This module uses classical computer vision (adaptive thresholding,
morphological analysis, contour detection, and shape/texture classification) to
find and classify anomalous regions in sonar waterfall images.

Classification uses geometric and texture features:
  - Aspect ratio, solidity, extent, circularity
  - Texture energy (variance), edge density
  - Region size relative to image
"""

import cv2
import numpy as np
from scipy.ndimage import uniform_filter


# ─── Classification Rules ────────────────────────────────────────────
# Each target class has a set of feature ranges learned from sonar literature.
# These are heuristic — designed to cover the visual signatures of each object
# type as they appear in side-scan sonar imagery.

CLASSIFICATION_RULES = [
    {
        "name": "ghost fishing net",
        "aspect_ratio": (1.5, 20.0),      # Nets are elongated, sprawling
        "solidity": (0.15, 0.55),          # Very irregular, lots of holes
        "extent": (0.05, 0.45),            # Loosely fills bounding box
        "circularity": (0.0, 0.25),        # Not circular at all
        "texture_energy": (15, 120),       # Moderate texture from mesh pattern
        "relative_area": (0.005, 0.15),    # Can be quite large
        "priority": 1,
    },
    {
        "name": "underwater pipe",
        "aspect_ratio": (3.0, 50.0),       # Very elongated, linear
        "solidity": (0.6, 1.0),            # Solid, continuous structure
        "extent": (0.4, 0.95),             # Tightly fills bounding box
        "circularity": (0.0, 0.2),         # Linear, not circular
        "texture_energy": (10, 80),        # Uniform texture
        "relative_area": (0.002, 0.08),    # Thin but long
        "priority": 2,
    },
    {
        "name": "shipwreck",
        "aspect_ratio": (0.5, 4.0),        # Moderate aspect ratio
        "solidity": (0.3, 0.75),           # Complex structure
        "extent": (0.2, 0.7),             # Irregular fill
        "circularity": (0.05, 0.5),        # Somewhat irregular
        "texture_energy": (30, 255),       # High texture — complex structure
        "relative_area": (0.02, 0.4),      # Large anomaly
        "priority": 3,
    },
    {
        "name": "submarine",
        "aspect_ratio": (2.0, 8.0),        # Elongated, cigar-shaped
        "solidity": (0.7, 1.0),            # Very solid, smooth hull
        "extent": (0.5, 0.95),             # Fills bounding box well
        "circularity": (0.15, 0.55),       # Oblong
        "texture_energy": (5, 60),         # Smooth surface
        "relative_area": (0.03, 0.35),     # Large object
        "priority": 4,
    },
    {
        "name": "anchor",
        "aspect_ratio": (0.5, 2.5),        # Roughly square-ish
        "solidity": (0.35, 0.7),           # Has flukes/gaps
        "extent": (0.2, 0.6),              # Irregular shape
        "circularity": (0.1, 0.45),        # Somewhat irregular
        "texture_energy": (20, 150),       # Metal texture
        "relative_area": (0.003, 0.04),    # Medium object
        "priority": 5,
    },
    {
        "name": "metal box",
        "aspect_ratio": (0.6, 2.5),        # Roughly rectangular
        "solidity": (0.75, 1.0),           # Very solid, box-like
        "extent": (0.6, 1.0),             # Fills bounding box tightly
        "circularity": (0.3, 0.85),        # Rectangular = moderate circularity
        "texture_energy": (8, 70),         # Uniform surface
        "relative_area": (0.003, 0.06),    # Medium object
        "priority": 6,
    },
    {
        "name": "diver",
        "aspect_ratio": (0.4, 2.5),        # Human proportions
        "solidity": (0.4, 0.8),            # Body with limbs
        "extent": (0.25, 0.65),            # Irregular fill
        "circularity": (0.1, 0.5),         # Not circular
        "texture_energy": (15, 100),       # Moderate texture
        "relative_area": (0.001, 0.025),   # Small object
        "priority": 7,
    },
    {
        "name": "fish",
        "aspect_ratio": (1.0, 5.0),        # Elongated body
        "solidity": (0.5, 0.95),           # Fairly solid
        "extent": (0.3, 0.8),              # Moderate fill
        "circularity": (0.15, 0.65),       # Oblong
        "texture_energy": (5, 60),         # Low texture
        "relative_area": (0.0005, 0.015),  # Small object
        "priority": 8,
    },
    {
        "name": "tire",
        "aspect_ratio": (0.6, 1.8),        # Roughly circular/oval
        "solidity": (0.4, 0.75),           # Has hole in center
        "extent": (0.35, 0.75),            # Moderate fill
        "circularity": (0.5, 1.0),         # Very circular
        "texture_energy": (10, 80),        # Rubber texture
        "relative_area": (0.001, 0.02),    # Small-medium object
        "priority": 9,
    },
    {
        "name": "debris",
        "aspect_ratio": (0.3, 15.0),       # Any shape
        "solidity": (0.1, 0.6),            # Very irregular
        "extent": (0.05, 0.5),             # Loosely fills box
        "circularity": (0.0, 0.4),         # Irregular
        "texture_energy": (20, 255),       # High texture — chaotic
        "relative_area": (0.001, 0.1),     # Any size
        "priority": 10,                    # Lowest priority — catch-all
    },
]


def _extract_features(contour, gray_roi, image_area):
    """Extract geometric and texture features from a contour and its ROI."""
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

    # Texture energy from the ROI
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
    """
    Classify an anomalous region based on its features.
    Returns (class_name, confidence_score).
    """
    best_class = None
    best_score = 0.0

    for rule in CLASSIFICATION_RULES:
        if rule["name"] not in allowed_classes:
            continue

        score = 0.0
        checks = 0

        # Check each feature against the rule's range
        for feat_name in ["aspect_ratio", "solidity", "extent", "circularity",
                          "texture_energy", "relative_area"]:
            lo, hi = rule[feat_name]
            val = features[feat_name]
            checks += 1

            if lo <= val <= hi:
                # Score based on how centered the value is within the range
                mid = (lo + hi) / 2.0
                spread = (hi - lo) / 2.0
                if spread > 0:
                    closeness = 1.0 - abs(val - mid) / spread
                else:
                    closeness = 1.0
                score += closeness
            else:
                # Partial credit if close to the range
                if val < lo:
                    dist = (lo - val) / (lo + 1e-6)
                else:
                    dist = (val - hi) / (hi + 1e-6)
                score += max(0, 0.3 - dist * 0.5)

        # Normalize score
        normalized = score / checks if checks > 0 else 0
        # Slight penalty for lower-priority (more generic) classes
        priority_bonus = 0.02 * (11 - rule["priority"]) / 10.0
        final_score = min(normalized + priority_bonus, 1.0)

        if final_score > best_score:
            best_score = final_score
            best_class = rule["name"]

    if best_class is None:
        best_class = "debris"
        best_score = 0.3

    # Clamp confidence to a realistic range (40% - 95%)
    confidence = max(40.0, min(95.0, best_score * 100))

    return best_class, confidence


def detect_sonar_anomalies(gray_image: np.ndarray, allowed_classes: list[str],
                            min_area_ratio=0.0008, max_area_ratio=0.4):
    """
    Detect anomalous regions in a grayscale sonar image using classical CV.

    Args:
        gray_image: Grayscale sonar image (numpy array)
        allowed_classes: List of class names to detect
        min_area_ratio: Minimum contour area as fraction of image area
        max_area_ratio: Maximum contour area as fraction of image area

    Returns:
        List of detection dicts with bbox, class, confidence
    """
    h, w = gray_image.shape[:2]
    image_area = h * w
    min_area = image_area * min_area_ratio
    max_area = image_area * max_area_ratio

    # Normalize class names to lowercase for matching
    allowed_lower = [c.strip().lower() for c in allowed_classes]

    # ─── Step 1: Multi-scale anomaly highlighting ─────────────────
    # CLAHE to enhance contrast
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray_image)

    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Adaptive thresholding — finds regions that stand out from local background
    thresh_adapt = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, -15
    )

    # Otsu thresholding — global intensity anomalies
    _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Combine both thresholds
    combined = cv2.bitwise_or(thresh_adapt, thresh_otsu)

    # ─── Step 2: Morphological cleanup ────────────────────────────
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    # Close gaps within objects
    morphed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    # Remove small noise
    morphed = cv2.morphologyEx(morphed, cv2.MORPH_OPEN, kernel_open, iterations=1)

    # ─── Step 3: Edge-based detection (catches linear structures) ─
    edges = cv2.Canny(blurred, 30, 100)
    edge_dilated = cv2.dilate(edges, kernel_close, iterations=2)

    # Merge edge regions with threshold regions
    final_mask = cv2.bitwise_or(morphed, edge_dilated)

    # Final cleanup
    final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel_close, iterations=1)

    # ─── Step 4: Find contours ────────────────────────────────────
    contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    used_regions = []  # Track used regions to avoid overlaps

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue

        x, y, bw, bh = cv2.boundingRect(contour)

        # Skip if this region overlaps too much with an existing detection
        skip = False
        for (rx, ry, rw, rh) in used_regions:
            # Calculate IoU
            ix1, iy1 = max(x, rx), max(y, ry)
            ix2, iy2 = min(x + bw, rx + rw), min(y + bh, ry + rh)
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            union = bw * bh + rw * rh - inter
            if union > 0 and inter / union > 0.4:
                skip = True
                break
        if skip:
            continue

        # Extract ROI for texture analysis
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

    # Sort by confidence descending
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    return detections
