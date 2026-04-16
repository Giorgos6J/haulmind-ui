from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking
from app.models.vehicle import Vehicle
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResponse
from app.services.fuel_price_service import FuelPriceService

router = APIRouter(prefix="/predict", tags=["Predictions"])

fuel_service = FuelPriceService()


def _extract_departure_date(raw_value) -> date:
    if raw_value is None:
        return date.today()

    if hasattr(raw_value, "date"):
        try:
            return raw_value.date()
        except Exception:
            pass

    text = str(raw_value).strip()

    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    )

    for fmt in formats:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    return date.today()


def _build_load_factor(cargo_weight_kg: float | None, max_load_kg: float | None) -> float:
    if not cargo_weight_kg or not max_load_kg or max_load_kg <= 0:
        return 1.0

    load_ratio = min(float(cargo_weight_kg) / float(max_load_kg), 1.2)
    return round(1.0 + (load_ratio * 0.12), 4)


@router.post("/{booking_id}", response_model=PredictionResponse)
def create_prediction(booking_id: int, db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == booking.vehicle_id, Vehicle.is_deleted == False)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    existing_prediction = (
        db.query(Prediction)
        .filter(Prediction.booking_id == booking_id, Prediction.is_deleted == False)
        .first()
    )
    if existing_prediction:
        raise HTTPException(status_code=400, detail="Prediction already exists for this booking")

    departure_date = _extract_departure_date(getattr(booking, "departure_time", None))
    fuel_estimate = fuel_service.get_estimated_price(departure_date)
    fuel_price_per_liter = float(fuel_estimate.estimated_price_per_liter)

    distance_km = float(booking.planned_distance_km or 0)
    base_consumption = float(vehicle.base_consumption_per_100km or 0)

    load_factor = _build_load_factor(
        cargo_weight_kg=getattr(booking, "cargo_weight_kg", 0),
        max_load_kg=getattr(vehicle, "max_load_kg", 0),
    )

    base_liters = (distance_km / 100.0) * base_consumption
    predicted_fuel = round(base_liters * load_factor, 2)
    predicted_cost = round(predicted_fuel * fuel_price_per_liter, 2)
    confidence_score = round(min(0.95, max(0.55, fuel_estimate.confidence)), 2)

    prediction = Prediction(
        booking_id=booking_id,
        predicted_fuel_liters=predicted_fuel,
        predicted_eta_minutes=None,
        predicted_cost=predicted_cost,
        traffic_level="unknown",
        confidence_score=confidence_score,
        model_version="fuel-v2-eu-calendar",
        fuel_price_used=round(fuel_price_per_liter, 3),
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


@router.get("/", response_model=list[PredictionResponse])
def get_predictions(db: Session = Depends(get_db)):
    return db.query(Prediction).filter(Prediction.is_deleted == False).all()


@router.get("/deleted", response_model=list[PredictionResponse])
def get_deleted_predictions(db: Session = Depends(get_db)):
    return db.query(Prediction).filter(Prediction.is_deleted == True).all()


@router.delete("/deleted/empty-bin")
def empty_deleted_predictions_bin(db: Session = Depends(get_db)):
    deleted_predictions = db.query(Prediction).filter(Prediction.is_deleted == True).all()

    if not deleted_predictions:
        return {
            "status": "success",
            "message": "No deleted predictions found",
            "deleted_count": 0
        }

    deleted_count = 0
    for prediction in deleted_predictions:
        db.delete(prediction)
        deleted_count += 1

    db.commit()

    return {
        "status": "success",
        "message": "Deleted predictions bin cleaned",
        "deleted_count": deleted_count
    }


@router.put("/{prediction_id}/restore")
def restore_prediction(prediction_id: int, db: Session = Depends(get_db)):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.is_deleted == True)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="Deleted prediction not found")

    existing_active_prediction = (
        db.query(Prediction)
        .filter(Prediction.booking_id == prediction.booking_id, Prediction.is_deleted == False)
        .first()
    )
    if existing_active_prediction:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore prediction because an active prediction for this booking already exists"
        )

    booking = (
        db.query(Booking)
        .filter(Booking.id == prediction.booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore prediction because its booking is missing or deleted"
        )

    prediction.is_deleted = False
    prediction.deleted_at = None
    db.commit()

    return {
        "status": "success",
        "message": f"Prediction {prediction_id} restored successfully"
    }


@router.delete("/{prediction_id}/permanent")
def permanently_delete_prediction(prediction_id: int, db: Session = Depends(get_db)):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.is_deleted == True)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="Deleted prediction not found")

    db.delete(prediction)
    db.commit()

    return {
        "status": "success",
        "message": f"Prediction {prediction_id} permanently deleted"
    }


@router.delete("/{prediction_id}")
def delete_prediction(prediction_id: int, db: Session = Depends(get_db)):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.is_deleted == False)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    prediction.is_deleted = True
    prediction.deleted_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": f"Prediction {prediction_id} moved to deleted items"
    }