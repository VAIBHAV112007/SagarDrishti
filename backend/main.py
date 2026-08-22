from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import cv2
import numpy as np
import traceback
from preprocessing import preprocess_sonar_image
from georeference import calculate_anomaly_gps
from sonar_detector import detect_sonar_anomalies

app = FastAPI(title="HydroScan AI — Hybrid Sonar Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── YOLO-World Model (optional enhancement) ─────────────────────
# Used as a secondary classifier on detected regions — NOT the primary
# detector, because YOLO-World cannot reliably detect objects in sonar.
model = None
model_error = None

try:
    from ultralytics import YOLO
    model = YOLO("yolov8s-world.pt")
    print("[OK] YOLO-World model loaded (secondary classifier).")
except Exception as e:
    model_error = str(e)
    print(f"[WARN] YOLO-World not available: {e}")
    print("[INFO] Continuing with sonar CV detector only.")


# Prompt map for YOLO-World secondary classification
CLASS_PROMPT_MAP = {
    "ghost fishing net":  "tangled fishing net underwater",
    "fishing net":        "tangled fishing net underwater",
    "underwater pipe":    "long metal pipe on the seabed",
    "shipwreck":          "sunken ship wreckage on ocean floor",
    "submarine":          "submarine vessel underwater",
    "anchor":             "heavy metal anchor on seabed",
    "metal box":          "metal container box underwater",
    "diver":              "scuba diver swimming underwater",
    "fish":               "fish swimming underwater",
    "tire":               "rubber tire on ocean floor",
    "debris":             "scattered debris and wreckage underwater",
}


def try_yolo_on_region(rgb_image, bbox, user_classes):
    """
    Attempt YOLO-World classification on a cropped region.
    Returns (class_name, confidence) or None.
    """
    if model is None:
        return None

    try:
        x1, y1, x2, y2 = bbox
        # Pad the crop slightly for context
        h, w = rgb_image.shape[:2]
        pad = 20
        cx1 = max(0, x1 - pad)
        cy1 = max(0, y1 - pad)
        cx2 = min(w, x2 + pad)
        cy2 = min(h, y2 + pad)
        crop = rgb_image[cy1:cy2, cx1:cx2]

        if crop.shape[0] < 20 or crop.shape[1] < 20:
            return None

        # Resize crop to at least 224x224 for better recognition
        scale = max(224 / crop.shape[0], 224 / crop.shape[1], 1.0)
        if scale > 1.0:
            crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        prompts = [CLASS_PROMPT_MAP.get(c.lower(), c) for c in user_classes]
        model.set_classes(prompts)

        results = model.predict(crop, conf=0.05, verbose=False, imgsz=640)
        for r in results:
            if len(r.boxes) > 0:
                best = r.boxes[0]  # Highest confidence
                cls_id = int(best.cls[0])
                conf = float(best.conf[0])
                if cls_id < len(user_classes) and conf > 0.1:
                    return user_classes[cls_id], conf * 100
    except Exception:
        pass

    return None


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_error": model_error,
        "pipeline": "hybrid_cv_yolo" if model else "cv_only",
    }


@app.post("/api/detect")
async def detect_anomalies(
    file: UploadFile = File(...),
    classes: str = Form("ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris"),
    boat_lat: float = Form(18.9220),
    boat_lon: float = Form(72.8347),
    boat_heading: float = Form(45.0),
    max_range_meters: float = Form(50.0),
    conf_threshold: float = Form(0.05)
):
    try:
        contents = await file.read()
        if not contents:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Empty file uploaded.", "detections": []}
            )

        raw_gray, processed_rgb = preprocess_sonar_image(contents)
        height, width, _ = processed_rgb.shape

        # Parse user classes
        user_classes = [c.strip() for c in classes.split(",") if c.strip()]
        if not user_classes:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "No detection classes provided.", "detections": []}
            )

        # ─── PRIMARY: Sonar CV anomaly detection ─────────────────
        cv_detections = detect_sonar_anomalies(raw_gray, user_classes)

        # ─── SECONDARY: YOLO-World refinement on each region ─────
        # Try to improve classification using YOLO-World on cropped regions
        yolo_enhanced = 0
        for det in cv_detections:
            yolo_result = try_yolo_on_region(processed_rgb, det["bbox"], user_classes)
            if yolo_result:
                yolo_cls, yolo_conf = yolo_result
                # Use YOLO classification if it's confident
                if yolo_conf > det["confidence"] * 0.7:
                    det["classification"] = yolo_cls
                    # Boost confidence since two systems agree or YOLO is confident
                    det["confidence"] = min(95.0, round(
                        det["confidence"] * 0.4 + yolo_conf * 0.6, 1
                    ))
                    det["method"] = "hybrid"
                    yolo_enhanced += 1
                else:
                    det["method"] = "cv_primary"
            else:
                det["method"] = "cv_primary"

        # ─── FULL-IMAGE YOLO-World pass ──────────────────────────
        # Run YOLO-World on the full image to catch anything CV missed
        yolo_full_detections = []
        if model is not None:
            try:
                prompts = [CLASS_PROMPT_MAP.get(c.lower(), c) for c in user_classes]
                model.set_classes(prompts)
                results = model.predict(processed_rgb, conf=conf_threshold, verbose=False, imgsz=640)

                for r in results:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0]) * 100
                        cls_id = int(box.cls[0])
                        cls_name = user_classes[cls_id] if cls_id < len(user_classes) else f"class_{cls_id}"

                        # Check if this overlaps with existing CV detections
                        overlaps = False
                        for existing in cv_detections:
                            eb = existing["bbox"]
                            ix1 = max(x1, eb[0])
                            iy1 = max(y1, eb[1])
                            ix2 = min(x2, eb[2])
                            iy2 = min(y2, eb[3])
                            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                            area1 = (x2 - x1) * (y2 - y1)
                            area2 = (eb[2] - eb[0]) * (eb[3] - eb[1])
                            union = area1 + area2 - inter
                            if union > 0 and inter / union > 0.3:
                                overlaps = True
                                break

                        if not overlaps and conf > 30:  # Only add high-conf YOLO detections
                            yolo_full_detections.append({
                                "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                                "classification": cls_name,
                                "confidence": round(conf, 1),
                                "method": "yolo_world",
                            })
            except Exception as e:
                print(f"[WARN] YOLO full-image pass failed: {e}")

        # ─── Merge all detections ─────────────────────────────────
        all_detections = cv_detections + yolo_full_detections

        # ─── Add georeferencing ───────────────────────────────────
        final_detections = []
        for det in all_detections:
            x1, y1, x2, y2 = det["bbox"]
            center_x = (x1 + x2) / 2.0
            mid_line = width / 2.0

            if center_x < mid_line:
                channel = "port"
                slant_range = ((mid_line - center_x) / mid_line) * max_range_meters
            else:
                channel = "starboard"
                slant_range = ((center_x - mid_line) / mid_line) * max_range_meters

            lat, lon = calculate_anomaly_gps(boat_lat, boat_lon, boat_heading, slant_range, channel)

            final_detections.append({
                "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                "confidence": det["confidence"],
                "classification": det["classification"].title(),
                "channel": channel,
                "slant_range_m": round(slant_range, 2),
                "gps": {"lat": lat, "lon": lon},
                "method": det.get("method", "cv_primary"),
                "three_pos": [
                    (center_x - mid_line) / 15.0,
                    0.5,
                    (y1 - height / 2.0) / 15.0
                ]
            })

        # Sort by confidence descending
        final_detections.sort(key=lambda d: d["confidence"], reverse=True)

        return {
            "status": "success",
            "image_meta": {"width": width, "height": height},
            "total_anomalies": len(final_detections),
            "active_vocabulary": user_classes,
            "pipeline": "hybrid_cv_yolo" if model else "cv_only",
            "yolo_enhanced_count": yolo_enhanced,
            "detections": final_detections
        }

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Detection failed: {str(e)}",
                "detections": []
            }
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)