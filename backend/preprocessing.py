import cv2
import numpy as np
from scipy.ndimage import uniform_filter

def lee_filter(img: np.ndarray, size: int = 5) -> np.ndarray:
    """Removes acoustic speckle noise while preserving acoustic shadow edges."""
    img = img.astype(np.float32)
    mean = uniform_filter(img, size)
    mean_sqr = uniform_filter(img**2, size)
    var = mean_sqr - mean**2
    overall_var = np.var(img)
    
    weights = var / (var + overall_var + 1e-6)
    filtered = mean + weights * (img - mean)
    return np.clip(filtered, 0, 255).astype(np.uint8)

def preprocess_sonar_image(image_bytes: bytes) -> tuple[np.ndarray, np.ndarray]:
    """Applies CLAHE contrast enhancement and Lee speckle filtering."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_gray = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

    if img_gray is None:
        # Fallback dummy matrix if image decode fails
        img_gray = np.zeros((500, 500), dtype=np.uint8)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img_gray)
    denoised = lee_filter(enhanced, size=5)
    img_rgb = cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB)
    
    return img_gray, img_rgb