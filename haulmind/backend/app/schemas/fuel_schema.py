from datetime import date
from typing import Any

from pydantic import BaseModel


class FuelEstimateResponse(BaseModel):
    target_date: date
    estimated_price_per_liter: float
    latest_known_price_per_liter: float
    latest_known_date: date
    weekly_trend_per_liter: float
    confidence: float
    source: str
    method: str
    details: dict[str, Any]


class FuelCalendarDayResponse(FuelEstimateResponse):
    pass