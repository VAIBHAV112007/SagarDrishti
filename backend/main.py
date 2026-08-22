from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import uvicorn
import cv2
import numpy as np
from preprocessing import preprocess_sonar_image
from georeference import calculate_anomaly_gps

app = FastAPI(title="Open-Vocabulary Sonar & Object Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Zero-Shot Open-Vocabulary YOLO-World Model
model = YOLO("yolov8s-world.pt")

@app.post("/api/detect")
async def detect_sonar_anomalies(
    file: UploadFile = File(...),
    classes: str = Form("ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris"),
    boat_lat: float = Form(18.9220),
    boat_lon: float = Form(72.8347),
    boat_heading: float = Form(45.0),
    max_range_meters: float = Form(50.0),
    conf_threshold: float = Form(0.15)
):
    contents = await file.read()
    raw_gray, processed_rgb = preprocess_sonar_image(contents)
    height, width, _ = processed_rgb.shape

    # Set dynamic vocabulary from request
    custom_classes = [c.strip() for c in classes.split(",") if c.strip()]
    model.set_classes(custom_classes)

    # Run Open-Vocabulary Inference
    results = model.predict(processed_rgb, conf=conf_threshold)

    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            cls_name = custom_classes[cls_id] if cls_id < len(custom_classes) else model.names[cls_id]

            center_x = (x1 + x2) / 2.0
            mid_line = width / 2.0

            if center_x < mid_line:
                channel = "port"
                slant_range = ((mid_line - center_x) / mid_line) * max_range_meters
            else:
                channel = "starboard"
                slant_range = ((center_x - mid_line) / mid_line) * max_range_meters

            lat, lon = calculate_anomaly_gps(boat_lat, boat_lon, boat_heading, slant_range, channel)

            detections.append({
                "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                "confidence": round(conf * 100, 1),
                "classification": cls_name.title(),
                "channel": channel,
                "slant_range_m": round(slant_range, 2),
                "gps": {"lat": lat, "lon": lon},
                "three_pos": [
                    (center_x - mid_line) / 15.0,
                    0.5,
                    (y1 - height / 2.0) / 15.0
                ]
            })

    return {
        "status": "success",
        "image_meta": {"width": width, "height": height},
        "total_anomalies": len(detections),
        "active_vocabulary": custom_classes,
        "detections": detections
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)