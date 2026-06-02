from io import BytesIO
from typing import List

from fastapi import FastAPI, File, UploadFile
from PIL import Image

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None

app = FastAPI(title="CivicReport YOLO Service")

MODEL = None
if YOLO is not None:
    try:
        MODEL = YOLO("yolov8n.pt")
    except Exception:
        MODEL = None


def map_labels_to_category(labels: List[str]) -> str:
    joined = " ".join(labels).lower()

    if any(k in joined for k in ["garbage", "trash", "waste", "plastic", "bag", "bottle", "cup", "can", "bin", "litter"]):
        return "Sanitation"
    if any(k in joined for k in ["car", "truck", "bus", "traffic"]):
        return "Traffic"
    if any(k in joined for k in ["road", "pothole", "asphalt"]):
        return "Roads"
    if any(k in joined for k in ["water", "pipe", "leak", "drain", "overflow", "puddle", "wet", "sink", "toilet", "tap"]):
        return "Water Supply"
    if any(k in joined for k in ["pole", "wire", "light"]):
        return "Electricity"

    return "Other"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": MODEL is not None}


@app.post("/detect")
async def detect(image: UploadFile = File(...)) -> dict:
    content = await image.read()

    if MODEL is None:
        labels = ["civic issue"]
        return {
            "labels": labels,
            "category": map_labels_to_category(labels),
            "confidence": 0.5,
            "boxes": [],
        }

    pil_image = Image.open(BytesIO(content)).convert("RGB")
    results = MODEL.predict(pil_image, conf=0.25, verbose=False)

    labels: List[str] = []
    boxes = []
    best_conf = 0.0

    for result in results:
        names = result.names
        for box in result.boxes:
            cls_id = int(box.cls.item())
            conf = float(box.conf.item())
            best_conf = max(best_conf, conf)
            label = names.get(cls_id, str(cls_id))
            labels.append(label)

            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            boxes.append(
                {
                    "label": label,
                    "confidence": conf,
                    "x": x1,
                    "y": y1,
                    "width": max(0.0, x2 - x1),
                    "height": max(0.0, y2 - y1),
                }
            )

    unique_labels = sorted(set(labels)) if labels else ["civic issue"]
    return {
        "labels": unique_labels,
        "category": map_labels_to_category(unique_labels),
        "confidence": best_conf if best_conf > 0 else 0.5,
        "boxes": boxes,
    }
