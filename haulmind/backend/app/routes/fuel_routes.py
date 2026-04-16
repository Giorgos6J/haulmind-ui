from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.schemas.fuel_schema import FuelEstimateResponse, FuelCalendarDayResponse
from app.services.fuel_price_service import FuelPriceService

router = APIRouter(prefix="/fuel", tags=["fuel"])

fuel_service = FuelPriceService()


@router.get("/estimate", response_model=FuelEstimateResponse)
def get_fuel_estimate(
    target_date: date = Query(..., alias="date", description="YYYY-MM-DD")
):
    try:
        return fuel_service.get_estimated_price(target_date)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/calendar", response_model=list[FuelCalendarDayResponse])
def get_fuel_calendar(
    start_date: date | None = Query(default=None),
    days: int = Query(default=31, ge=1, le=31),
):
    try:
        if start_date is None:
            start_date = date.today()
        return fuel_service.get_calendar(start_date=start_date, days=days)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))