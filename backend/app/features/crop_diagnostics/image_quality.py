# backend/app/features/crop_diagnostics/image_quality.py
"""
Safe image decoding, validation, decompression-bomb protection, and basic image quality checks.
"""
import io
from typing import Any, Dict, Optional, Tuple
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 25_000_000  # Decompression bomb guard

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_DIMENSION_PX = 120
MIN_SHARPNESS_SUITABLE = 2.5


def validate_image_bytes(
    filename: str, content_type: Optional[str], data: bytes
) -> Tuple[bool, Optional[str]]:
    if not data:
        return False, "Uploaded image file is empty."
    if len(data) > MAX_IMAGE_BYTES:
        return False, "Image exceeds maximum allowed size of 10 MB."
    if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
        return False, f"Unsupported image format '{content_type}'. Allowed: JPEG, PNG, WEBP."

    is_jpeg = data[:3] == b"\xff\xd8\xff"
    is_png = data[:4] == b"\x89PNG"
    is_webp = len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        return False, "Invalid image header bytes. Please upload a valid JPEG, PNG, or WEBP leaf photo."
    return True, None


def decode_and_assess_quality(data: bytes) -> Tuple[Optional[Image.Image], Dict[str, Any]]:
    """Safely decode bytes, apply EXIF orientation, convert to RGB, and measure basic quality."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        with Image.open(io.BytesIO(data)) as img2:
            transposed = ImageOps.exif_transpose(img2)
            rgb = transposed.convert("RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        return None, {
            "decodable": False,
            "error": f"Image could not be decoded safely: {exc}",
            "suitable_for_diagnosis": False,
            "warnings": ["Corrupted or unreadable image file."],
        }

    width, height = rgb.size
    small = rgb.resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.asarray(small, dtype=np.float32)

    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    brightness = float(gray.mean())

    # Finite-difference sharpness proxy (mean gradient magnitude)
    gx = np.abs(np.diff(gray, axis=1)).mean()
    gy = np.abs(np.diff(gray, axis=0)).mean()
    sharpness = float(gx + gy)

    # Simple green & foliage-tone dominance ratios (heuristic only, not a validated leaf detector)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green_ratio = float(np.mean((g > r * 1.02) & (g > b * 1.02)))
    foliage_like_ratio = float(
        np.mean(((g > r * 0.92) & (g > b * 1.02)) | ((r > b * 1.15) & (g > b * 1.05)))
    )

    warnings = []
    if min(width, height) < MIN_DIMENSION_PX:
        warnings.append(f"Very low resolution ({width}x{height}px). Capture closer in daylight.")
    if brightness < 35.0:
        warnings.append("Image appears very dark. Capture the leaf in natural daylight.")
    elif brightness > 235.0:
        warnings.append("Image appears overexposed. Avoid harsh direct glare on the leaf.")
    if sharpness < MIN_SHARPNESS_SUITABLE:
        warnings.append("Image is too blurry for reliable diagnosis. Hold the camera steady and focus on the leaf.")
    elif sharpness < 4.5:
        warnings.append("Image appears slightly blurry. Hold the camera steady and focus on the leaf.")

    quality_label = "good"
    if len(warnings) >= 2 or min(width, height) < 64 or sharpness < MIN_SHARPNESS_SUITABLE:
        quality_label = "poor"
    elif len(warnings) == 1:
        quality_label = "fair"

    return rgb, {
        "decodable": True,
        "width": width,
        "height": height,
        "brightness_mean": round(brightness, 1),
        "sharpness_score": round(sharpness, 2),
        "green_foliage_heuristic_ratio": round(green_ratio, 3),
        "foliage_like_ratio": round(foliage_like_ratio, 3),
        "quality_rating": quality_label,
        "suitable_for_diagnosis": (
            min(width, height) >= 64
            and 20.0 <= brightness <= 245.0
            and sharpness >= MIN_SHARPNESS_SUITABLE
        ),
        "warnings": warnings,
        "capture_tips": [
            "Capture one affected leaf filling most of the frame.",
            "Use sufficient natural daylight without harsh glare.",
            "Keep the leaf in sharp focus against a plain background.",
        ],
    }
