# AD-22 — RaithaMitra AI Crop Doctor: Implementation & Validation Report

**Tagline:** Detect Early. Protect Crops. Reduce Losses.  
**Branch:** `feature/advanced-crop-diagnostics`  
**Recovery Checkpoint:** `backup/pre-ad22` (`3750044`)

---

## 1. Model Architecture, Origin & Checksum

- **Model Identifier:** `onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX` (ONNX export of `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`)
- **Architecture:** `MobileNetV2ForImageClassification` (CPU inference via `onnxruntime`)
- **Dataset:** PlantVillage (38 classes across 14 crops)
- **Model License:** `license:other` per Hugging Face model card (`onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX`)
- **Model Version:** `1.0.0-plantvillage-38`
- **Local File:** `backend/app/models/plant_disease/model.onnx` (`9,227,028` bytes)
- **SHA-256 Checksum:** `c209f96f0a87a265b0ff6765c2e84d48038a7d8b8692d7629445b4513c344eb7`
- **Documented Upstream Eval Metrics (`eval_results.json`):** `eval_accuracy = 0.7858`, `eval_loss = 1.0461` at epoch `8.0`.

## 2. Supported Crops & Disease Classes (38 Classes across 14 Crops)

Generated dynamically from `backend/app/models/plant_disease/config.json` (`id2label`):
- **Apple:** Scab, Black Rot, Cedar Apple Rust, Healthy
- **Blueberry:** Healthy
- **Cherry:** Powdery Mildew, Healthy
- **Corn (Maize):** Cercospora and Gray Leaf Spot, Common Rust, Northern Leaf Blight, Healthy
- **Grape:** Black Rot, Esca (Black Measles), Isariopsis Leaf Spot, Healthy
- **Orange:** Citrus Greening
- **Peach:** Bacterial Spot, Healthy
- **Bell Pepper:** Bacterial Spot, Healthy
- **Potato:** Early Blight, Late Blight, Healthy
- **Raspberry:** Healthy
- **Soybean:** Healthy
- **Squash:** Powdery Mildew
- **Strawberry:** Leaf Scorch, Healthy
- **Tomato:** Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites / Two-spotted Spider Mite, Target Spot, Yellow Leaf Curl Virus, Mosaic Virus, Healthy

Unsupported crops (e.g., `Mango`) return an honest `unsupported_crop` response without substituting another crop.

## 3. Actual Inference Pipeline & Preprocessing

1. **Validation & Security (`image_quality.py`):** Magic-byte header validation (JPEG, PNG, WEBP), 10 MB size guard, Pillow `MAX_IMAGE_PIXELS = 25_000_000` decompression-bomb guard, EXIF orientation correction (`ImageOps.exif_transpose`), RGB conversion, and brightness/sharpness/resolution checks.
2. **Preprocessing (`preprocessing.py`):** Matches `preprocessor_config.json` exactly — bilinear resize of shortest edge to `256`, center crop `224x224`, rescale `1/255.0`, normalize `(x - 0.5) / 0.5`, transpose to NCHW `float32` `(1, 3, 224, 224)`.
3. **Cached ONNX CPU Inference (`inference.py`):** Thread-safe lazy-cached `onnxruntime.InferenceSession` (`CPUExecutionProvider`), softmax over 38 logits, top-3 candidate ranking, configurable `0.45` uncertainty threshold, and crop-mismatch detection.
4. **Honesty Guards:** Severity percentage (`severity.available = False`) and Grad-CAM heatmaps (`explainability.available = False`) are explicitly omitted because `MobileNetV2ForImageClassification` is a classification-only graph without segmentation/attention heads.

## 4. Real Independent Image Testing & Measured Latency

Tested against 4 independent `test`-split images from `BrandonFors/Plant-Diseases-PlantVillage-Dataset` (10,849 test rows):

| Sample | Ground Truth | Predicted Crop & Disease | Model Score | Cold Session Load (ms) | CPU Inference (ms) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `sample_0.jpg` | `Apple___Apple_scab` | `Apple - Scab` | `0.9980` | `157.79` | `4.91` |
| `sample_1.jpg` | `Grape___Leaf_blight_(Isariopsis_Leaf_Spot)` | `Grape - Isariopsis Leaf Spot` | `0.9779` | `157.79` | `3.62` |
| `sample_2.jpg` | `Soybean___healthy` | `Soybean - Healthy` | `0.9991` | `157.79` | `3.08` |
| `sample_3.jpg` | `Tomato___Early_blight` | `Tomato - Early Blight` | `0.5114` | `157.79` | `3.51` |

*(Note: 4 test images verify functional end-to-end classification and do not constitute general field accuracy claims.)*

## 5. Offline Functionality & Knowledge Sources

- **Fully Offline:** Image validation, quality scoring, ONNX CPU inference, top-3 predictions, multi-image disagreement checks, local disease knowledge base (`ICAR`, `ICAR-IIHR`, `ICAR-CPRI`, `ICAR-IIMR`, `ICAR-NBAIR`, `TNAU Agritech Portal`, `CABI`, `FAO`), and authenticated SQLite diagnostic history (`crop_diagnostic_history`).
- **Online Optional:** Live weather measurements for environmental risk assessment (`risk_assessment.py`) and BioIntel live external literature queries.

## 6. Security & Regression Test Results

- `pytest backend/tests/test_crop_diagnostics.py backend/tests/test_auth_rbac.py backend/tests/test_mobile_otp_auth.py -q`: **17 passed** (covers model checksum, 4 real PlantVillage test-split samples, backward-compatible `/scientific/diagnostics/analyze`, invalid/corrupted images, unsupported crop `Mango`, low-quality tiny dark image, model-unavailable fallback, multi-image disagreement, `401` unauthorized history, cross-account history isolation, and explicit-confirmation surveillance guard).
- **Browser Verification:** Automated live Chrome DOM/screenshot upload verification remains pending until Chrome remote debugging (`chrome://inspect/#remote-debugging`) is enabled; manual verification steps: open `/crop-health?section=diagnostics`, upload `sample_2.jpg` (Healthy) and `sample_3.jpg` (Tomato Early Blight), verify top-3 scores, weather risk, BioIntel link, and Read Aloud.

## 7. Model Installation Instructions (For Reproducing on Another Machine)

1. Install Python packages in `.venv`: `pip install onnxruntime pillow`
2. Place `model.onnx`, `config.json`, `preprocessor_config.json`, and `eval_results.json` from `onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX` into `backend/app/models/plant_disease/` (or set `PLANT_DISEASE_MODEL_DIR`).
3. Verify SHA-256 of `model.onnx` matches `c209f96f0a87a265b0ff6765c2e84d48038a7d8b8692d7629445b4513c344eb7`.

## 8. Modified & Added Files

- `backend/app/features/crop_diagnostics/` (`__init__.py`, `model_registry.py`, `image_quality.py`, `preprocessing.py`, `inference.py`, `disease_knowledge.py`, `risk_assessment.py`, `service.py`, `router.py`)
- `backend/app/models/plant_disease/` (`model.onnx`, `config.json`, `preprocessor_config.json`, `README.md`, `eval_results.json`)
- `backend/app/api/api.py`, `backend/app/services/diagnostics_service.py`
- `backend/tests/test_crop_diagnostics.py`, `backend/tests/fixtures/`
- `frontend/src/lib/cropDiagnosticsApi.ts`, `frontend/src/app/diagnostics/page.tsx`, `frontend/src/app/surveillance/page.tsx`
- `docs/AD22_CROP_DIAGNOSTICS_REPORT.md`
