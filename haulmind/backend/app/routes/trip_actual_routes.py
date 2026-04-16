from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking
from app.models.trip_actual import TripActual
from app.schemas.trip_actual import TripActualCreate, TripActualResponse

router = APIRouter(prefix="/actuals", tags=["Trip Actuals"])


@router.post("/", response_model=TripActualResponse)
def create_trip_actual(actual_data: TripActualCreate, db: Session = Depends(get_db)):
    booking_id = actual_data.booking_id

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    existing_actual = (
        db.query(TripActual)
        .filter(TripActual.booking_id == booking_id, TripActual.is_deleted == False)
        .first()
    )
    if existing_actual:
        raise HTTPException(status_code=400, detail="Actual result for this booking already exists")

    actual = TripActual(
        booking_id=actual_data.booking_id,
        actual_fuel_liters=actual_data.actual_fuel_liters,
        actual_eta_minutes=actual_data.actual_eta_minutes,
        actual_distance_km=actual_data.actual_distance_km,
        actual_cost=actual_data.actual_cost,
        completed_at=actual_data.completed_at
    )

    db.add(actual)

    booking.status = "completed"

    db.commit()
    db.refresh(actual)

    return actual


@router.get("/", response_model=list[TripActualResponse])
def get_trip_actuals(db: Session = Depends(get_db)):
    return db.query(TripActual).filter(TripActual.is_deleted == False).all()


@router.get("/deleted", response_model=list[TripActualResponse])
def get_deleted_trip_actuals(db: Session = Depends(get_db)):
    return db.query(TripActual).filter(TripActual.is_deleted == True).all()


@router.delete("/deleted/empty-bin")
def empty_deleted_trip_actuals_bin(db: Session = Depends(get_db)):
    deleted_actuals = db.query(TripActual).filter(TripActual.is_deleted == True).all()

    if not deleted_actuals:
        return {
            "status": "success",
            "message": "No deleted actual trip records found",
            "deleted_count": 0
        }

    deleted_count = 0
    for actual in deleted_actuals:
        db.delete(actual)
        deleted_count += 1

    db.commit()

    return {
        "status": "success",
        "message": "Deleted trip actuals bin cleaned",
        "deleted_count": deleted_count
    }


@router.put("/{actual_id}/restore")
def restore_trip_actual(actual_id: int, db: Session = Depends(get_db)):
    actual = (
        db.query(TripActual)
        .filter(TripActual.id == actual_id, TripActual.is_deleted == True)
        .first()
    )
    if not actual:
        raise HTTPException(status_code=404, detail="Deleted trip actual not found")

    existing_active_actual = (
        db.query(TripActual)
        .filter(TripActual.booking_id == actual.booking_id, TripActual.is_deleted == False)
        .first()
    )
    if existing_active_actual:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore trip actual because an active actual result for this booking already exists"
        )

    booking = (
        db.query(Booking)
        .filter(Booking.id == actual.booking_id, Booking.is_deleted == False)
        .first()
    )
    if not booking:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore trip actual because its booking is missing or deleted"
        )

    actual.is_deleted = False
    actual.deleted_at = None
    booking.status = "completed"
    db.commit()

    return {
        "status": "success",
        "message": f"Trip actual {actual_id} restored successfully"
    }


@router.delete("/{actual_id}/permanent")
def permanently_delete_trip_actual(actual_id: int, db: Session = Depends(get_db)):
    actual = (
        db.query(TripActual)
        .filter(TripActual.id == actual_id, TripActual.is_deleted == True)
        .first()
    )
    if not actual:
        raise HTTPException(status_code=404, detail="Deleted trip actual not found")

    db.delete(actual)
    db.commit()

    return {
        "status": "success",
        "message": f"Trip actual {actual_id} permanently deleted"
    }


@router.delete("/{actual_id}")
def delete_trip_actual(actual_id: int, db: Session = Depends(get_db)):
    actual = (
        db.query(TripActual)
        .filter(TripActual.id == actual_id, TripActual.is_deleted == False)
        .first()
    )
    if not actual:
        raise HTTPException(status_code=404, detail="Trip actual not found")

    booking = (
        db.query(Booking)
        .filter(Booking.id == actual.booking_id, Booking.is_deleted == False)
        .first()
    )

    actual.is_deleted = True
    actual.deleted_at = datetime.utcnow()

    if booking:
        booking.status = "scheduled"

    db.commit()

    return {
        "status": "success",
        "message": f"Trip actual {actual_id} moved to deleted items"
    }