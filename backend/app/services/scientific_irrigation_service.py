# backend/app/services/scientific_irrigation_service.py
"""
P0: Scientific Precision Irrigation Engine (FAO-56).
Computes ETc = Kc * ET0, net & gross irrigation depth, volumetric demand (1 mm/ha = 10 m3),
rainfall adjustments, duration from flow rate, and water availability warnings.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.app.engines.biophysical import CROP_COEFFICIENTS, DEFAULT_KC, estimate_root_zone_moisture
from backend.app.schemas.scientific import IrrigationRequest, ScientificModuleOutput
from backend.app.services.weather_service import weather_service

EFFICIENCY_BY_METHOD: Dict[str, float] = {
    "Drip Irrigation": 0.90,
    "Sprinkler": 0.75,
    "Canal Basin": 0.60,
    "Flood / Furrow": 0.55,
    "Rainfed": 1.0,
}


class ScientificIrrigationService:
    async def calculate_irrigation(self, req: IrrigationRequest) -> ScientificModuleOutput:
        # 1. Determine ET0 and rainfall (from user input or live Open-Meteo)
        et0_mm = req.reference_et0_mm
        raw_rain_mm = 0.0
        rain_48h_mm = 0.0
        is_live_weather = False
        weather_source = "User-provided reference ET0"

        if et0_mm is None or req.effective_rainfall_mm is None:
            weather = await weather_service.get_weather(req.latitude, req.longitude)
            is_live_weather = weather.provenance.is_live
            weather_source = weather.provenance.source
            if et0_mm is None:
                et0_mm = weather.current.et0_fao56_mm
            raw_rain_mm = weather.current.precipitation_mm
            if len(weather.daily_forecast) >= 2:
                rain_48h_mm = round(
                    weather.daily_forecast[0].precipitation_sum_mm + weather.daily_forecast[1].precipitation_sum_mm,
                    2,
                )

        # Effective rainfall: 80% of raw rainfall above 2mm threshold when not explicitly supplied
        if req.effective_rainfall_mm is not None:
            eff_rain_mm = req.effective_rainfall_mm
        else:
            eff_rain_mm = round(max(0.0, raw_rain_mm * 0.80), 2) if raw_rain_mm >= 2.0 else 0.0

        # 2. Crop coefficient Kc
        crop_key = req.crop_type.lower().strip()
        kc_table = CROP_COEFFICIENTS.get(crop_key, DEFAULT_KC)
        kc = req.crop_coefficient_kc if req.crop_coefficient_kc is not None else kc_table.get(req.crop_stage, 1.0)

        # 3. Irrigation efficiency
        efficiency = (
            req.irrigation_efficiency
            if req.irrigation_efficiency is not None
            else EFFICIENCY_BY_METHOD.get(req.irrigation_method, 0.75)
        )

        # 4. Core FAO-56 calculations
        etc_mm = round(kc * et0_mm, 2)
        net_irrigation_mm = round(max(0.0, etc_mm - eff_rain_mm), 2)
        gross_irrigation_mm = round(net_irrigation_mm / efficiency, 2) if net_irrigation_mm > 0 else 0.0

        # 1 mm over 1 hectare = 10 m3
        net_volume_m3 = round(net_irrigation_mm * req.farm_area_ha * 10.0, 2)
        gross_volume_m3 = round(gross_irrigation_mm * req.farm_area_ha * 10.0, 2)

        # Estimated root zone moisture (explicitly modeled, never claimed as sensor data)
        est_moisture_pct = estimate_root_zone_moisture(req.soil_type, eff_rain_mm, etc_mm, 0.0)

        # Duration if flow rate is provided
        duration_hours = None
        if req.flow_rate_m3_per_hr and gross_volume_m3 > 0:
            duration_hours = round(gross_volume_m3 / req.flow_rate_m3_per_hr, 2)

        # Warnings & timing
        warnings: List[str] = []
        actions: List[str] = []

        if req.irrigation_method == "Rainfed":
            warnings.append("Rainfed system selected: supplemental irrigation infrastructure unavailable.")
            actions.append("Conserve soil moisture via organic mulching and bunding.")
        else:
            if gross_volume_m3 > req.available_water_m3:
                warnings.append(
                    f"Water deficit alert: Daily gross requirement ({gross_volume_m3} m3) exceeds available water ({req.available_water_m3} m3)."
                )
                actions.append("Adopt deficit irrigation or prioritize critical flowering/fruiting zones.")
            if rain_48h_mm >= 15.0:
                warnings.append(
                    f"Forecasted rainfall of {rain_48h_mm} mm in next 48h — consider postponing irrigation to prevent waterlogging."
                )
                actions.append("Delay scheduled irrigation and verify field drainage.")
            elif gross_irrigation_mm > 0:
                timing = "06:00 AM – 09:00 AM (low evaporation window)"
                dur_text = f" for {duration_hours} hours" if duration_hours is not None else ""
                actions.append(
                    f"Apply {gross_irrigation_mm} mm ({gross_volume_m3} m3) via {req.irrigation_method}{dur_text} during {timing}."
                )
            else:
                actions.append("Effective rainfall covers today's ETc demand; no irrigation required today.")

        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="scientific_precision_irrigation",
            source=f"FAO-56 Crop Water Balance + {weather_source}",
            timestamp=datetime.now(timezone.utc),
            units={
                "et0": "mm/day",
                "etc": "mm/day",
                "effective_rainfall": "mm/day",
                "net_irrigation_depth": "mm/day",
                "gross_irrigation_depth": "mm/day",
                "volume": "m3/day",
                "duration": "hours",
                "estimated_soil_moisture": "% volumetric (modeled)",
            },
            data_quality="live" if is_live_weather else "modeled",
            is_live=is_live_weather,
            assumptions=[
                f"FAO-56 single crop coefficient Kc = {kc} for {req.crop_type} ({req.crop_stage}).",
                f"Application efficiency = {round(efficiency * 100, 1)}% for {req.irrigation_method}.",
                "Volume conversion factor: 1 mm water depth over 1 hectare = 10 m3.",
                "Root-zone soil moisture is an agronomic water-balance estimate, NOT an in-situ sensor measurement.",
            ],
            uncertainty="±7% (ET0 NWP & crop coefficient variability)",
            results={
                "crop_type": req.crop_type,
                "crop_stage": req.crop_stage,
                "kc": kc,
                "et0_mm_day": et0_mm,
                "etc_mm_day": etc_mm,
                "effective_rainfall_mm_day": eff_rain_mm,
                "forecast_rain_48h_mm": rain_48h_mm,
                "irrigation_efficiency": efficiency,
                "net_irrigation_mm": net_irrigation_mm,
                "gross_irrigation_mm": gross_irrigation_mm,
                "net_volume_m3": net_volume_m3,
                "gross_volume_m3": gross_volume_m3,
                "estimated_duration_hours": duration_hours,
                "recommended_timing": "06:00 AM – 09:00 AM" if gross_irrigation_mm > 0 and rain_48h_mm < 15 else "Hold / Rain-fed",
                "estimated_soil_moisture_pct": est_moisture_pct,
                "soil_moisture_is_measured": False,
                "water_availability_warnings": warnings,
                "formulas": {
                    "etc": "ETc = Kc × ET0",
                    "net_depth": "Net Irrigation = max(0, ETc - Effective Rainfall)",
                    "gross_depth": "Gross Irrigation = Net Irrigation / Application Efficiency",
                    "volume": "Volume (m3) = Depth (mm) × Area (ha) × 10",
                },
            },
            recommended_actions=actions,
        )


scientific_irrigation_service = ScientificIrrigationService()
