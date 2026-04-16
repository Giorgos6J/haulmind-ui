from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.booking import Booking
from app.models.prediction import Prediction
from app.models.trip_actual import TripActual

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    active_vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == False).count()
    deleted_vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == True).count()

    active_bookings = db.query(Booking).filter(Booking.is_deleted == False).count()
    deleted_bookings = db.query(Booking).filter(Booking.is_deleted == True).count()

    total_predictions = db.query(Prediction).filter(Prediction.is_deleted == False).count()
    total_actual_trips = db.query(TripActual).filter(TripActual.is_deleted == False).count()

    predictions = db.query(Prediction).filter(Prediction.is_deleted == False).all()
    total_predicted_cost = round(
        sum((prediction.predicted_cost or 0) for prediction in predictions), 2
    )

    comparisons_count = 0
    fuel_error_sum = 0

    bookings_with_actuals = db.query(Booking).filter(Booking.is_deleted == False).all()

    for booking in bookings_with_actuals:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.booking_id == booking.id, Prediction.is_deleted == False)
            .first()
        )
        actual = (
            db.query(TripActual)
            .filter(TripActual.booking_id == booking.id, TripActual.is_deleted == False)
            .first()
        )

        if not prediction or not actual:
            continue

        comparisons_count += 1

        predicted_fuel = prediction.predicted_fuel_liters
        actual_fuel = actual.actual_fuel_liters

        if predicted_fuel is not None and actual_fuel is not None and predicted_fuel != 0:
            fuel_difference = actual_fuel - predicted_fuel
            fuel_error_percent = abs((fuel_difference / predicted_fuel) * 100)
            fuel_error_sum += fuel_error_percent

    average_fuel_error = round(fuel_error_sum / comparisons_count, 2) if comparisons_count > 0 else 0

    return {
        "status": "success",
        "summary": {
            "active_vehicles": active_vehicles,
            "deleted_vehicles": deleted_vehicles,
            "active_bookings": active_bookings,
            "deleted_bookings": deleted_bookings,
            "total_predictions": total_predictions,
            "total_actual_trips": total_actual_trips,
            "total_comparisons": comparisons_count,
            "total_predicted_cost": total_predicted_cost,
            "average_fuel_error_percentage": average_fuel_error
        }
    }


@router.get("/fleet-status")
def get_fleet_status(db: Session = Depends(get_db)):
    active_vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == False).count()
    deleted_vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == True).count()

    active_bookings = db.query(Booking).filter(Booking.is_deleted == False).count()
    deleted_bookings = db.query(Booking).filter(Booking.is_deleted == True).count()

    active_booking_records = db.query(Booking).filter(Booking.is_deleted == False).all()

    bookings_with_prediction = 0
    bookings_with_actual = 0
    bookings_ready_for_comparison = 0
    bookings_missing_prediction = 0
    bookings_missing_actual = 0

    for booking in active_booking_records:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.booking_id == booking.id, Prediction.is_deleted == False)
            .first()
        )
        actual = (
            db.query(TripActual)
            .filter(TripActual.booking_id == booking.id, TripActual.is_deleted == False)
            .first()
        )

        if prediction:
            bookings_with_prediction += 1
        else:
            bookings_missing_prediction += 1

        if actual:
            bookings_with_actual += 1
        else:
            bookings_missing_actual += 1

        if prediction and actual:
            bookings_ready_for_comparison += 1

    return {
        "status": "success",
        "fleet_status": {
            "active_vehicles": active_vehicles,
            "deleted_vehicles": deleted_vehicles,
            "active_bookings": active_bookings,
            "deleted_bookings": deleted_bookings,
            "bookings_with_prediction": bookings_with_prediction,
            "bookings_with_actual": bookings_with_actual,
            "bookings_ready_for_comparison": bookings_ready_for_comparison,
            "bookings_missing_prediction": bookings_missing_prediction,
            "bookings_missing_actual": bookings_missing_actual
        }
    }