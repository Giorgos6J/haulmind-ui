from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.booking import Booking
from app.schemas.vehicle import VehicleCreate, VehicleResponse

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.post("/", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    existing_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.plate_number == vehicle.plate_number,
            Vehicle.is_deleted == False
        )
        .first()
    )
    if existing_vehicle:
        raise HTTPException(status_code=400, detail="Vehicle with this plate number already exists")

    new_vehicle = Vehicle(
        plate_number=vehicle.plate_number,
        vehicle_type=vehicle.vehicle_type,
        manufacturer=vehicle.manufacturer,
        model=vehicle.model,
        fuel_type=vehicle.fuel_type,
        max_load_kg=vehicle.max_load_kg,
        base_consumption_per_100km=vehicle.base_consumption_per_100km,
        registration_day=vehicle.registration_day,
        registration_month=vehicle.registration_month,
        registration_year=vehicle.registration_year
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle


@router.get("/", response_model=list[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.is_deleted == False).all()


@router.get("/deleted", response_model=list[VehicleResponse])
def get_deleted_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.is_deleted == True).all()


@router.delete("/deleted/empty-bin")
def empty_deleted_vehicles_bin(db: Session = Depends(get_db)):
    deleted_vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == True).all()

    if not deleted_vehicles:
        return {
            "status": "success",
            "message": "No deleted vehicles found",
            "deleted_count": 0
        }

    deleted_count = 0

    for vehicle in deleted_vehicles:
        related_booking = db.query(Booking).filter(Booking.vehicle_id == vehicle.id).first()
        if related_booking:
            continue

        db.delete(vehicle)
        deleted_count += 1

    db.commit()

    return {
        "status": "success",
        "message": "Deleted vehicles bin cleaned",
        "deleted_count": deleted_count
    }


@router.put("/{vehicle_id}/restore")
def restore_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.is_deleted == True)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Deleted vehicle not found")

    existing_active_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.plate_number == vehicle.plate_number,
            Vehicle.is_deleted == False
        )
        .first()
    )
    if existing_active_vehicle:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore vehicle because another active vehicle with the same plate number exists"
        )

    vehicle.is_deleted = False
    vehicle.deleted_at = None

    db.commit()

    return {
        "status": "success",
        "message": f"Vehicle {vehicle_id} restored successfully"
    }


@router.delete("/{vehicle_id}/permanent")
def permanently_delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.is_deleted == True)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Deleted vehicle not found")

    related_booking = db.query(Booking).filter(Booking.vehicle_id == vehicle_id).first()
    if related_booking:
        raise HTTPException(
            status_code=400,
            detail="Vehicle cannot be permanently deleted because related bookings still exist"
        )

    db.delete(vehicle)
    db.commit()

    return {
        "status": "success",
        "message": f"Vehicle {vehicle_id} permanently deleted"
    }


@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    related_booking = (
        db.query(Booking)
        .filter(Booking.vehicle_id == vehicle_id, Booking.is_deleted == False)
        .first()
    )
    if related_booking:
        raise HTTPException(
            status_code=400,
            detail="Vehicle cannot be deleted because it is assigned to one or more bookings"
        )

    vehicle.is_deleted = True
    vehicle.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "status": "success",
        "message": f"Vehicle {vehicle_id} moved to deleted items"
    }