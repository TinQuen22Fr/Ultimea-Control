from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="AuraControl API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------------------- Models -----------------------------
class Command(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "custom"  # volume | mute | power | source | sound_mode | eq | custom
    service_uuid: Optional[str] = None
    characteristic_uuid: Optional[str] = None
    write_type: str = "withResponse"  # withResponse | withoutResponse
    payload_hex: str = ""
    description: Optional[str] = None
    device_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class CommandCreate(BaseModel):
    name: str
    category: str = "custom"
    service_uuid: Optional[str] = None
    characteristic_uuid: Optional[str] = None
    write_type: str = "withResponse"
    payload_hex: str = ""
    description: Optional[str] = None
    device_id: Optional[str] = None


class CommandUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    service_uuid: Optional[str] = None
    characteristic_uuid: Optional[str] = None
    write_type: Optional[str] = None
    payload_hex: Optional[str] = None
    description: Optional[str] = None


class Binding(BaseModel):
    control_key: str
    command_id: str
    updated_at: str = Field(default_factory=now_iso)


class BindingSet(BaseModel):
    command_id: str


class EqBand(BaseModel):
    freq: str
    gain: float = 0.0


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "eq"  # eq | sound
    bass: float = 0.0
    treble: float = 0.0
    bands: List[EqBand] = Field(default_factory=list)
    is_active: bool = False
    is_default: bool = False
    created_at: str = Field(default_factory=now_iso)


class ProfileCreate(BaseModel):
    name: str
    type: str = "eq"
    bass: float = 0.0
    treble: float = 0.0
    bands: List[EqBand] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bass: Optional[float] = None
    treble: Optional[float] = None
    bands: Optional[List[EqBand]] = None


class GattCharacteristic(BaseModel):
    uuid: str
    is_readable: bool = False
    is_writable: bool = False
    is_notifiable: bool = False


class GattService(BaseModel):
    uuid: str
    characteristics: List[GattCharacteristic] = Field(default_factory=list)


class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ble_id: str
    name: str = "Appareil inconnu"
    rssi: Optional[int] = None
    gatt: List[GattService] = Field(default_factory=list)
    last_connected: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class DeviceUpsert(BaseModel):
    ble_id: str
    name: str = "Appareil inconnu"
    rssi: Optional[int] = None
    gatt: List[GattService] = Field(default_factory=list)


class LogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str  # write | read | notify | connect | disconnect | scan | error
    characteristic_uuid: Optional[str] = None
    value_hex: Optional[str] = None
    message: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class LogCreate(BaseModel):
    action: str
    characteristic_uuid: Optional[str] = None
    value_hex: Optional[str] = None
    message: Optional[str] = None


class MacroStep(BaseModel):
    command_id: str
    delay_ms: int = 300


class Macro(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    steps: List[MacroStep] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)


class MacroCreate(BaseModel):
    name: str
    steps: List[MacroStep] = Field(default_factory=list)


class MacroUpdate(BaseModel):
    name: Optional[str] = None
    steps: Optional[List[MacroStep]] = None


# ----------------------------- Health -----------------------------
@api_router.get("/")
async def root():
    return {"message": "AuraControl API", "status": "ok"}


# ----------------------------- Commands -----------------------------
@api_router.post("/commands", response_model=Command)
async def create_command(payload: CommandCreate):
    cmd = Command(**payload.dict())
    await db.commands.insert_one(cmd.dict())
    return cmd


@api_router.get("/commands", response_model=List[Command])
async def list_commands(category: Optional[str] = None):
    query: dict = {}
    if category:
        query["category"] = category
    docs = await db.commands.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Command(**d) for d in docs]


@api_router.get("/commands/{command_id}", response_model=Command)
async def get_command(command_id: str):
    doc = await db.commands.find_one({"id": command_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return Command(**doc)


@api_router.put("/commands/{command_id}", response_model=Command)
async def update_command(command_id: str, payload: CommandUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    updates["updated_at"] = now_iso()
    res = await db.commands.update_one({"id": command_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    doc = await db.commands.find_one({"id": command_id}, {"_id": 0})
    return Command(**doc)


@api_router.delete("/commands/{command_id}")
async def delete_command(command_id: str):
    res = await db.commands.delete_one({"id": command_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    # Remove any binding referencing this command
    await db.bindings.delete_many({"command_id": command_id})
    return {"success": True}


# ----------------------------- Bindings -----------------------------
@api_router.get("/bindings")
async def list_bindings():
    docs = await db.bindings.find({}, {"_id": 0}).to_list(1000)
    return {d["control_key"]: d["command_id"] for d in docs}


@api_router.put("/bindings/{control_key}", response_model=Binding)
async def set_binding(control_key: str, payload: BindingSet):
    binding = Binding(control_key=control_key, command_id=payload.command_id)
    await db.bindings.update_one(
        {"control_key": control_key},
        {"$set": binding.dict()},
        upsert=True,
    )
    return binding


@api_router.delete("/bindings/{control_key}")
async def delete_binding(control_key: str):
    await db.bindings.delete_one({"control_key": control_key})
    return {"success": True}


# ----------------------------- Profiles -----------------------------
@api_router.post("/profiles", response_model=Profile)
async def create_profile(payload: ProfileCreate):
    prof = Profile(**payload.dict())
    await db.profiles.insert_one(prof.dict())
    return prof


@api_router.get("/profiles", response_model=List[Profile])
async def list_profiles():
    docs = await db.profiles.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [Profile(**d) for d in docs]


@api_router.put("/profiles/{profile_id}", response_model=Profile)
async def update_profile(profile_id: str, payload: ProfileUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    res = await db.profiles.update_one({"id": profile_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    return Profile(**doc)


@api_router.post("/profiles/{profile_id}/activate", response_model=Profile)
async def activate_profile(profile_id: str):
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    await db.profiles.update_many({}, {"$set": {"is_active": False}})
    await db.profiles.update_one({"id": profile_id}, {"$set": {"is_active": True}})
    doc["is_active"] = True
    return Profile(**doc)


@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    doc = await db.profiles.find_one({"id": profile_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    if doc.get("is_default"):
        raise HTTPException(status_code=400, detail="Impossible de supprimer un preset par défaut")
    await db.profiles.delete_one({"id": profile_id})
    return {"success": True}


# ----------------------------- Devices -----------------------------
@api_router.post("/devices", response_model=Device)
async def upsert_device(payload: DeviceUpsert):
    existing = await db.devices.find_one({"ble_id": payload.ble_id}, {"_id": 0})
    if existing:
        updates = payload.dict()
        updates["last_connected"] = now_iso()
        await db.devices.update_one({"ble_id": payload.ble_id}, {"$set": updates})
        merged = {**existing, **updates}
        return Device(**merged)
    device = Device(**payload.dict(), last_connected=now_iso())
    await db.devices.insert_one(device.dict())
    return device


@api_router.get("/devices", response_model=List[Device])
async def list_devices():
    docs = await db.devices.find({}, {"_id": 0}).sort("last_connected", -1).to_list(1000)
    return [Device(**d) for d in docs]


@api_router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    doc = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Appareil introuvable")
    return Device(**doc)


@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    res = await db.devices.delete_one({"id": device_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appareil introuvable")
    return {"success": True}


# ----------------------------- Logs -----------------------------
@api_router.post("/logs", response_model=LogEntry)
async def create_log(payload: LogCreate):
    entry = LogEntry(**payload.dict())
    await db.logs.insert_one(entry.dict())
    return entry


@api_router.get("/logs", response_model=List[LogEntry])
async def list_logs(limit: int = 200):
    docs = await db.logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [LogEntry(**d) for d in docs]


@api_router.delete("/logs")
async def clear_logs():
    await db.logs.delete_many({})
    return {"success": True}


# ----------------------------- Macros -----------------------------
@api_router.post("/macros", response_model=Macro)
async def create_macro(payload: MacroCreate):
    macro = Macro(**payload.dict())
    await db.macros.insert_one(macro.dict())
    return macro


@api_router.get("/macros", response_model=List[Macro])
async def list_macros():
    docs = await db.macros.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Macro(**d) for d in docs]


@api_router.put("/macros/{macro_id}", response_model=Macro)
async def update_macro(macro_id: str, payload: MacroUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    res = await db.macros.update_one({"id": macro_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Macro introuvable")
    doc = await db.macros.find_one({"id": macro_id}, {"_id": 0})
    return Macro(**doc)


@api_router.delete("/macros/{macro_id}")
async def delete_macro(macro_id: str):
    res = await db.macros.delete_one({"id": macro_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Macro introuvable")
    return {"success": True}


# ----------------------------- Export -----------------------------
class ExportCreate(BaseModel):
    device_name: Optional[str] = None
    note: Optional[str] = None
    captures: List[Any] = Field(default_factory=list)
    commands: List[Any] = Field(default_factory=list)


class ExportBundle(ExportCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=now_iso)


@api_router.post("/export", response_model=ExportBundle)
async def create_export(payload: ExportCreate):
    bundle = ExportBundle(**payload.dict())
    await db.exports.insert_one(bundle.dict())
    return bundle


@api_router.get("/export", response_model=Optional[ExportBundle])
async def get_latest_export():
    doc = await db.exports.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    return ExportBundle(**doc) if doc else None


@api_router.get("/exports", response_model=List[ExportBundle])
async def list_exports(limit: int = 20):
    docs = await db.exports.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [ExportBundle(**d) for d in docs]


# ----------------------------- Seed -----------------------------
DEFAULT_PROFILES = [
    {
        "name": "Plat",
        "bass": 0.0,
        "treble": 0.0,
        "bands": [
            {"freq": "60Hz", "gain": 0.0},
            {"freq": "230Hz", "gain": 0.0},
            {"freq": "910Hz", "gain": 0.0},
            {"freq": "3.6kHz", "gain": 0.0},
            {"freq": "14kHz", "gain": 0.0},
        ],
    },
    {
        "name": "Cinéma",
        "bass": 6.0,
        "treble": 3.0,
        "bands": [
            {"freq": "60Hz", "gain": 6.0},
            {"freq": "230Hz", "gain": 2.0},
            {"freq": "910Hz", "gain": -1.0},
            {"freq": "3.6kHz", "gain": 2.0},
            {"freq": "14kHz", "gain": 4.0},
        ],
    },
    {
        "name": "Musique",
        "bass": 3.0,
        "treble": 2.0,
        "bands": [
            {"freq": "60Hz", "gain": 3.0},
            {"freq": "230Hz", "gain": 1.0},
            {"freq": "910Hz", "gain": 0.0},
            {"freq": "3.6kHz", "gain": 1.5},
            {"freq": "14kHz", "gain": 2.5},
        ],
    },
    {
        "name": "Voix",
        "bass": -2.0,
        "treble": 4.0,
        "bands": [
            {"freq": "60Hz", "gain": -3.0},
            {"freq": "230Hz", "gain": 0.0},
            {"freq": "910Hz", "gain": 3.0},
            {"freq": "3.6kHz", "gain": 4.0},
            {"freq": "14kHz", "gain": 2.0},
        ],
    },
    {
        "name": "Boost Basses",
        "bass": 10.0,
        "treble": 1.0,
        "bands": [
            {"freq": "60Hz", "gain": 10.0},
            {"freq": "230Hz", "gain": 5.0},
            {"freq": "910Hz", "gain": 0.0},
            {"freq": "3.6kHz", "gain": 0.0},
            {"freq": "14kHz", "gain": 1.0},
        ],
    },
]


@app.on_event("startup")
async def seed_data():
    count = await db.profiles.count_documents({})
    if count == 0:
        for idx, p in enumerate(DEFAULT_PROFILES):
            prof = Profile(
                name=p["name"],
                type="eq",
                bass=p["bass"],
                treble=p["treble"],
                bands=[EqBand(**b) for b in p["bands"]],
                is_active=(idx == 0),
                is_default=True,
            )
            await db.profiles.insert_one(prof.dict())
        logger.info("Seeded %d default EQ profiles", len(DEFAULT_PROFILES))


# ----------------------------- App wiring -----------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
