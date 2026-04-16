from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking
from app.models.vehicle import Vehicle
from app.models.prediction import Prediction
from app.models.trip_actual import TripActual
from app.schemas.booking import BookingCreate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/", response_model=BookingResponse)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    existing_booking = (
        db.query(Booking)
        .filter(
            Booking.booking_code == booking.booking_code,
            Booking.is_deleted == False
        )
        .first()
    )
    if existing_booking:
        raise HTTPException(status_code=400, detail="Booking with this code already exists")

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == booking.vehicle_id, Vehicle.is_deleted == False)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    new_booking = Booking(
        booking_code=booking.booking_code,
        origin_address=booking.origin_address,
        destination_address=booking.destination_address,
        planned_distance_km=booking.planned_distance_km,
        cargo_weight_kg=booking.cargo_weight_kg,
        cargo_type=booking.cargo_type,
        vehicle_id=booking.vehicle_id,
        departure_time=booking.departure_time,
        status=booking.status
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/", response_model=list[BookingResponse])
def get_bookings(db: Session = Depends(get_db)):
    return db.query(Booking).filter(Booking.is_deleted == False).all()


@router.get("/deleted", response_model=list[BookingResponse])
def get_deleted_bookings(db: Session = Depends(get_db)):
    return db.query(Booking).filter(Booking.is_deleted == True).all()


@router.delete("/deleted/empty-bin")
def empty_deleted_bookings_bin(db: Session = Depends(get_db)):
    deleted_bookings = db.query(Booking).filter(Booking.is_deleted == True).all()

    if not deleted_bookings:
        return {
            "status": "success",
            "message": "No deleted bookings found",
            "deleted_count": 0
        }

    deleted_count = 0

    for booking in deleted_bookings:
        existing_prediction = (
            db.query(Prediction)
            .filter(
                Prediction.booking_id == booking.id,
                Prediction.is_deleted == False
            )
            .first()
        )
        existing_actual = db.query(TripActual).filter(TripActual.booking_id == booking.id).first()

        if existing_prediction or existing_actual:
            continue

        db.delete(booking)
        deleted_count += 1

    db.commit()

    return {
        "status": "success",
        "message": "Deleted bookings bin cleaned",
        "deleted_count": deleted_count
    }


@router.put("/{booking_id}/restore")
def restore_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == True)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Deleted booking not found")

    existing_active_booking = (
        db.query(Booking)
        .filter(
            Booking.booking_code == booking.booking_code,
            Booking.is_deleted == False
        )
        .first()
    )
    if existing_active_booking:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore booking because another active booking with the same code exists"
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == booking.vehicle_id, Vehicle.is_deleted == False)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore booking because its vehicle is missing or deleted"
        )

    booking.is_deleted = False
    booking.deleted_at = None

    db.commit()

    return {
        "status": "success",
        "message": f"Booking {booking_id} restored successfully"
    }


@router.delete("/{booking_id}/permanent")
def permanently_delete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == True)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Deleted booking not found")

    existing_prediction = (
        db.query(Prediction)
        .filter(
            Prediction.booking_id == booking_id,
            Prediction.is_deleted == False
        )
        .first()
    )
    if existing_prediction:
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be permanently deleted because an active prediction exists for it"
        )

    existing_actual = db.query(TripActual).filter(TripActual.booking_id == booking_id).first()
    if existing_actual:
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be permanently deleted because an actual trip result exists for it"
        )

    db.delete(booking)
    db.commit()

    return {
        "status": "success",
        "message": f"Booking {booking_id} permanently deleted"
    }


@router.delete("/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    existing_prediction = (
        db.query(Prediction)
        .filter(
            Prediction.booking_id == booking_id,
            Prediction.is_deleted == False
        )
        .first()
    )
    if existing_prediction:
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be deleted because an active prediction exists for it"
        )

    existing_actual = db.query(TripActual).filter(TripActual.booking_id == booking_id).first()
    if existing_actual:
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be deleted because an actual trip result exists for it"
        )

    booking.is_deleted = True
    booking.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "status": "success",
        "message": f"Booking {booking_id} moved to deleted items"
    }