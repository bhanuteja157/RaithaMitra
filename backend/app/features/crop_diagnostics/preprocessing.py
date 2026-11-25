# backend/app/features/crop_diagnostics/preprocessing.py
"""
Exact MobileNetV2 preprocessing matching preprocessor_config.json:
- Resize shortest edge to 256 (bilinear)
- Center crop 224x224
- Rescale 1/255.0 and normalize with mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]
- Transpose HWC -> NCHW float32 (1, 3, 224, 224)
"""
import numpy as np
from PIL import Image


def preprocess_leaf_image(rgb_image: Image.Image) -> np.ndarray:
    w, h = rgb_image.size
    target_short = 256
    if w <= h:
        new_w = target_short
        new_h = max(target_short, int(round(h * (target_short / w))))
    else:
        new_h = target_short
        new_w = max(target_short, int(round(w * (target_short / h))))

    resized = rgb_image.resize((new_w, new_h), Image.Resampling.BILINEAR)

    left = (new_w - 224) // 2
    top = (new_h - 224) // 2
    cropped = resized.crop((left, top, left + 224, top + 224))

    arr = np.asarray(cropped, dtype=np.float32) * (1.0 / 255.0)
    arr = (arr - 0.5) / 0.5
    nchw = np.transpose(arr, (2, 0, 1))[np.newaxis, ...]
    return np.ascontiguousarray(nchw, dtype=np.float32)
