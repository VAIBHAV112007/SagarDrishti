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
    """
    Returns (raw_gray, processed_rgb).
    Reads the image as-is (preserving RGB if available), applies mild
    enhancement only on a grayscale copy, then returns both the raw
    grayscale AND the best RGB representation for YOLO-World inference.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)

    # Try to read as color first — preserves original RGB information
    img_color = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_gray = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

    if img_gray is None:
        img_gray = np.zeros((500, 500), dtype=np.uint8)

    if img_color is None:
        img_color = cv2.cvtColor(img_gray, cv2.COLOR_GRAY2BGR)

    # Check if the image is essentially grayscale (sonar waterfall)
    b, g, r = cv2.split(img_color)
    is_grayscale = np.allclose(b, g, atol=5) and np.allclose(g, r, atol=5)

    if is_grayscale:
        # For grayscale sonar images: apply mild CLAHE and create a
        # false-color representation that YOLO-World can better interpret
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(img_gray)
        denoised = lee_filter(enhanced, size=3)

        # Create a false-color heatmap — gives YOLO-World more visual
        # features to latch onto compared to flat gray→gray→gray RGB
        heatmap = cv2.applyColorMap(denoised, cv2.COLORMAP_OCEAN)
        processed_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    else:
        # For color images: light enhancement only
        lab = cv2.cvtColor(img_color, cv2.COLOR_BGR2LAB)
        l, a, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b_ch])
        enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        processed_rgb = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)

    return img_gray, processed_rgb