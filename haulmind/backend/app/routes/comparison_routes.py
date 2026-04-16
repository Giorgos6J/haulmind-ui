from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking
from app.models.prediction import Prediction
from app.models.trip_actual import TripActual

router = APIRouter(prefix="/comparison", tags=["Comparison"])


def percentage_error(predicted, actual):
    if predicted is None or actual is None or predicted == 0:
        return None
    return round((abs(actual - predicted) / predicted) * 100, 2)


def active_prediction_query(db: Session):
    query = db.query(Prediction)
    if hasattr(Prediction, "is_deleted"):
        query = query.filter(Prediction.is_deleted == False)
    return query


@router.get("/all")
def get_all_comparisons(db: Session = Depends(get_db)):
    bookings = db.query(Booking).filter(Booking.is_deleted == False).all()

    results = []

    for booking in bookings:
        prediction = (
            active_prediction_query(db)
            .filter(Prediction.booking_id == booking.id)
            .first()
        )

        actual = (
            db.query(TripActual)
            .filter(
                TripActual.booking_id == booking.id,
                TripActual.is_deleted == False,
            )
            .first()
        )

        if not prediction or not actual:
            continue

        predicted_fuel = prediction.predicted_fuel_liters
        actual_fuel = actual.actual_fuel_liters
        fuel_difference_liters = (
            round(actual_fuel - predicted_fuel, 2)
            if predicted_fuel is not None and actual_fuel is not None
            else None
        )
        fuel_percentage_error = percentage_error(predicted_fuel, actual_fuel)

        predicted_eta = prediction.predicted_eta_minutes
        actual_eta = actual.actual_eta_minutes
        eta_difference_minutes = (
            round(actual_eta - predicted_eta, 2)
            if predicted_eta is not None and actual_eta is not None
            else None
        )
        eta_percentage_error = percentage_error(predicted_eta, actual_eta)

        planned_distance = booking.planned_distance_km
        actual_distance = actual.actual_distance_km
        distance_difference_km = (
            round(actual_distance - planned_distance, 2)
            if planned_distance is not None and actual_distance is not None
            else None
        )
        distance_percentage_error = percentage_error(planned_distance, actual_distance)

        predicted_cost = prediction.predicted_cost
        actual_cost = actual.actual_cost
        cost_difference = (
            round(actual_cost - predicted_cost, 2)
            if predicted_cost is not None and actual_cost is not None
            else None
        )
        cost_percentage_error = percentage_error(predicted_cost, actual_cost)

        results.append(
            {
                "booking_id": booking.id,
                "booking_code": booking.booking_code,
                "fuel": {
                    "predicted_liters": predicted_fuel,
                    "actual_liters": actual_fuel,
                    "difference_liters": fuel_difference_liters,
                    "percentage_error": fuel_percentage_error,
                },
                "eta": {
                    "predicted_minutes": predicted_eta,
                    "actual_minutes": actual_eta,
                    "difference_minutes": eta_difference_minutes,
                    "percentage_error": eta_percentage_error,
                },
                "cost": {
                    "predicted_cost": predicted_cost,
                    "actual_cost": actual_cost,
                    "difference": cost_difference,
                    "percentage_error": cost_percentage_error,
                },
                "distance": {
                    "planned_distance_km": planned_distance,
                    "actual_distance_km": actual_distance,
                    "difference_km": distance_difference_km,
                    "percentage_error": distance_percentage_error,
                },
            }
        )

    return {
        "status": "success",
        "total_comparisons": len(results),
        "comparisons": results,
    }


@router.get("/{booking_id}")
def compare_booking_prediction_vs_actual(
    booking_id: int,
    db: Session = Depends(get_db),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    prediction = (
        active_prediction_query(db)
        .filter(Prediction.booking_id == booking_id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found for this booking")

    actual = (
        db.query(TripActual)
        .filter(
            TripActual.booking_id == booking_id,
            TripActual.is_deleted == False,
        )
        .first()
    )
    if not actual:
        raise HTTPException(status_code=404, detail="Actual result not found for this booking")

    predicted_fuel = prediction.predicted_fuel_liters
    actual_fuel = actual.actual_fuel_liters
    fuel_difference_liters = (
        round(actual_fuel - predicted_fuel, 2)
        if predicted_fuel is not None and actual_fuel is not None
        else None
    )
    fuel_percentage_error = percentage_error(predicted_fuel, actual_fuel)

    predicted_eta = prediction.predicted_eta_minutes
    actual_eta = actual.actual_eta_minutes
    eta_difference_minutes = (
        round(actual_eta - predicted_eta, 2)
        if predicted_eta is not None and actual_eta is not None
        else None
    )
    eta_percentage_error = percentage_error(predicted_eta, actual_eta)

    planned_distance = booking.planned_distance_km
    actual_distance = actual.actual_distance_km
    distance_difference_km = (
        round(actual_distance - planned_distance, 2)
        if planned_distance is not None and actual_distance is not None
        else None
    )
    distance_percentage_error = percentage_error(planned_distance, actual_distance)

    predicted_cost = prediction.predicted_cost
    actual_cost = actual.actual_cost
    cost_difference = (
        round(actual_cost - predicted_cost, 2)
        if predicted_cost is not None and actual_cost is not None
        else None
    )
    cost_percentage_error = percentage_error(predicted_cost, actual_cost)

    return {
        "status": "success",
        "booking_id": booking_id,
        "comparison": {
            "fuel": {
                "predicted_liters": predicted_fuel,
                "actual_liters": actual_fuel,
                "difference_liters": fuel_difference_liters,
                "percentage_error": fuel_percentage_error,
            },
            "eta": {
                "predicted_minutes": predicted_eta,
                "actual_minutes": actual_eta,
                "difference_minutes": eta_difference_minutes,
                "percentage_error": eta_percentage_error,
            },
            "cost": {
                "predicted_cost": predicted_cost,
                "actual_cost": actual_cost,
                "difference": cost_difference,
                "percentage_error": cost_percentage_error,
            },
            "distance": {
                "planned_distance_km": planned_distance,
                "actual_distance_km": actual_distance,
                "difference_km": distance_difference_km,
                "percentage_error": distance_percentage_error,
            },
        },
    }