from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClientRow(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_plain: Mapped[str] = mapped_column(String(128))  # prototype only
    display_name: Mapped[str] = mapped_column(String(128), default="")


class DriverRow(Base):
    __tablename__ = "drivers"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_plain: Mapped[str] = mapped_column(String(128))
    display_name: Mapped[str] = mapped_column(String(128), default="")


class ShipmentRow(Base):
    __tablename__ = "shipments"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(16), index=True)
    client_id: Mapped[str] = mapped_column(String(16), ForeignKey("clients.id"), index=True)
    driver_id: Mapped[str | None] = mapped_column(String(16), ForeignKey("drivers.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    destination: Mapped[str] = mapped_column(String(256))
    pickup_address: Mapped[str] = mapped_column(String(256), default="CMP600 Hub")
    pickup_lat: Mapped[float] = mapped_column(Float, default=51.5074)
    pickup_lng: Mapped[float] = mapped_column(Float, default=-0.1278)
    parcel_count: Mapped[int] = mapped_column(Integer, default=1)
    eta: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dest_lat: Mapped[float] = mapped_column(Float)
    dest_lng: Mapped[float] = mapped_column(Float)
    current_lat: Mapped[float] = mapped_column(Float)
    current_lng: Mapped[float] = mapped_column(Float)
    delivery_date: Mapped[str | None] = mapped_column(String(16), nullable=True)
    delivery_option: Mapped[str] = mapped_column(String(48), default="Standard")
    hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_before_hold: Mapped[str | None] = mapped_column(String(32), nullable=True)


class LocationEventRow(Base):
    __tablename__ = "location_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    driver_id: Mapped[str] = mapped_column(String(16), ForeignKey("drivers.id"), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StatusEventRow(Base):
    __tablename__ = "status_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    shipment_id: Mapped[str] = mapped_column(String(16), ForeignKey("shipments.id"), index=True)
    status: Mapped[str] = mapped_column(String(32))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
