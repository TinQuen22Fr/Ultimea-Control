"""End-to-end pytest tests for the AuraControl FastAPI backend.

Exercises all CRUD endpoints (commands, bindings, profiles, devices, logs,
macros), verifies seed data, ObjectId leakage, and Create -> GET / Update ->
GET / Delete -> GET persistence patterns.
"""

import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
if not BASE_URL:
    # Fall back to frontend/.env loaded by the supervisor process
    from dotenv import dotenv_values
    BASE_URL = dotenv_values("/app/frontend/.env").get("EXPO_PUBLIC_BACKEND_URL")
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _assert_no_objectid(payload):
    """Recursively assert no '_id' key (Mongo ObjectId leakage)."""
    if isinstance(payload, dict):
        assert "_id" not in payload, f"_id leaked: {payload}"
        for v in payload.values():
            _assert_no_objectid(v)
    elif isinstance(payload, list):
        for item in payload:
            _assert_no_objectid(item)


# ----------------------------- Health -----------------------------
class TestHealth:
    def test_root_ok(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "ok"


# ----------------------------- Commands -----------------------------
class TestCommands:
    created_id = None

    def test_create_command(self, client):
        payload = {
            "name": "TEST_Vol +",
            "category": "volume",
            "service_uuid": "0000fff0-0000-1000-8000-00805f9b34fb",
            "characteristic_uuid": "0000fff1-0000-1000-8000-00805f9b34fb",
            "payload_hex": "A501",
            "write_type": "withResponse",
        }
        r = client.post(f"{API}/commands", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        _assert_no_objectid(body)
        assert body["name"] == "TEST_Vol +"
        assert body["category"] == "volume"
        assert body["payload_hex"] == "A501"
        TestCommands.created_id = body["id"]

    def test_get_command_persisted(self, client):
        assert TestCommands.created_id
        r = client.get(f"{API}/commands/{TestCommands.created_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        _assert_no_objectid(body)
        assert body["id"] == TestCommands.created_id
        assert body["name"] == "TEST_Vol +"

    def test_list_commands(self, client):
        r = client.get(f"{API}/commands")
        assert r.status_code == 200
        data = r.json()
        _assert_no_objectid(data)
        assert any(c["id"] == TestCommands.created_id for c in data)

    def test_list_commands_filtered(self, client):
        r = client.get(f"{API}/commands", params={"category": "volume"})
        assert r.status_code == 200
        data = r.json()
        assert all(c["category"] == "volume" for c in data)

    def test_update_command(self, client):
        r = client.put(
            f"{API}/commands/{TestCommands.created_id}",
            json={"name": "TEST_Vol + updated", "payload_hex": "A502"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "TEST_Vol + updated"
        assert body["payload_hex"] == "A502"
        # verify via GET
        r2 = client.get(f"{API}/commands/{TestCommands.created_id}")
        assert r2.json()["payload_hex"] == "A502"

    def test_get_missing_command_404(self, client):
        r = client.get(f"{API}/commands/{uuid.uuid4()}")
        assert r.status_code == 404


# ----------------------------- Bindings -----------------------------
class TestBindings:
    cmd_id = None

    def test_create_command_for_binding(self, client):
        r = client.post(
            f"{API}/commands",
            json={"name": "TEST_Power", "category": "power", "payload_hex": "B100"},
        )
        assert r.status_code == 200
        TestBindings.cmd_id = r.json()["id"]

    def test_set_binding(self, client):
        r = client.put(
            f"{API}/bindings/power", json={"command_id": TestBindings.cmd_id}
        )
        assert r.status_code == 200, r.text
        body = r.json()
        _assert_no_objectid(body)
        assert body["control_key"] == "power"
        assert body["command_id"] == TestBindings.cmd_id

    def test_get_bindings(self, client):
        r = client.get(f"{API}/bindings")
        assert r.status_code == 200
        m = r.json()
        assert isinstance(m, dict)
        assert m.get("power") == TestBindings.cmd_id

    def test_delete_command_removes_binding(self, client):
        # Delete the command - its binding should be cleaned up.
        r = client.delete(f"{API}/commands/{TestBindings.cmd_id}")
        assert r.status_code == 200
        r2 = client.get(f"{API}/bindings")
        assert "power" not in r2.json()

    def test_delete_binding_manual(self, client):
        # create cmd, bind, delete binding manually
        r = client.post(
            f"{API}/commands", json={"name": "TEST_Mute", "category": "mute", "payload_hex": "00"}
        )
        cid = r.json()["id"]
        client.put(f"{API}/bindings/mute", json={"command_id": cid})
        d = client.delete(f"{API}/bindings/mute")
        assert d.status_code == 200
        assert "mute" not in client.get(f"{API}/bindings").json()
        client.delete(f"{API}/commands/{cid}")


# ----------------------------- Profiles -----------------------------
class TestProfiles:
    created_id = None
    default_ids = []

    def test_seed_profiles_exist(self, client):
        r = client.get(f"{API}/profiles")
        assert r.status_code == 200, r.text
        data = r.json()
        _assert_no_objectid(data)
        names = {p["name"] for p in data}
        expected = {"Plat", "Cinéma", "Musique", "Voix", "Boost Basses"}
        assert expected.issubset(names), f"Missing seeded presets, got {names}"
        # Plat is seeded as a non-deletable default. (We don't assert is_active
        # here: a real user / concurrent test may have activated another preset.)
        plat = next(p for p in data if p["name"] == "Plat")
        assert plat["is_default"] is True
        TestProfiles.default_ids = [p["id"] for p in data if p["is_default"]]

    def test_delete_default_profile_blocked(self, client):
        assert TestProfiles.default_ids
        target = TestProfiles.default_ids[0]
        r = client.delete(f"{API}/profiles/{target}")
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_create_user_profile(self, client):
        r = client.post(
            f"{API}/profiles",
            json={
                "name": "TEST_Custom",
                "type": "eq",
                "bass": 2.0,
                "treble": 1.0,
                "bands": [
                    {"freq": "60Hz", "gain": 2.0},
                    {"freq": "230Hz", "gain": 0.0},
                ],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "TEST_Custom"
        assert body["is_default"] is False
        TestProfiles.created_id = body["id"]

    def test_activate_profile_single_active(self, client):
        r = client.post(f"{API}/profiles/{TestProfiles.created_id}/activate")
        assert r.status_code == 200
        assert r.json()["is_active"] is True
        # exactly one active
        listing = client.get(f"{API}/profiles").json()
        actives = [p for p in listing if p["is_active"]]
        assert len(actives) == 1
        assert actives[0]["id"] == TestProfiles.created_id

    def test_update_profile(self, client):
        r = client.put(
            f"{API}/profiles/{TestProfiles.created_id}",
            json={"bass": 5.0},
        )
        assert r.status_code == 200
        assert r.json()["bass"] == 5.0

    def test_delete_user_profile(self, client):
        # Re-activate Plat before deletion so default state is restored.
        plat = next(
            p for p in client.get(f"{API}/profiles").json() if p["name"] == "Plat"
        )
        client.post(f"{API}/profiles/{plat['id']}/activate")
        r = client.delete(f"{API}/profiles/{TestProfiles.created_id}")
        assert r.status_code == 200


# ----------------------------- Devices -----------------------------
class TestDevices:
    device_id = None

    def test_upsert_device(self, client):
        r = client.post(
            f"{API}/devices",
            json={
                "ble_id": "TEST_BLE_ID_001",
                "name": "TEST Ultimea Aura A40",
                "rssi": -55,
                "gatt": [],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        _assert_no_objectid(body)
        TestDevices.device_id = body["id"]
        assert body["ble_id"] == "TEST_BLE_ID_001"

    def test_upsert_idempotent(self, client):
        r = client.post(
            f"{API}/devices",
            json={
                "ble_id": "TEST_BLE_ID_001",
                "name": "TEST Renamed",
                "rssi": -40,
                "gatt": [],
            },
        )
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Renamed"

    def test_get_device(self, client):
        r = client.get(f"{API}/devices/{TestDevices.device_id}")
        assert r.status_code == 200
        _assert_no_objectid(r.json())

    def test_list_devices(self, client):
        r = client.get(f"{API}/devices")
        assert r.status_code == 200
        _assert_no_objectid(r.json())

    def test_delete_device(self, client):
        r = client.delete(f"{API}/devices/{TestDevices.device_id}")
        assert r.status_code == 200
        assert client.get(f"{API}/devices/{TestDevices.device_id}").status_code == 404


# ----------------------------- Logs -----------------------------
class TestLogs:
    def test_create_log(self, client):
        r = client.post(
            f"{API}/logs",
            json={"action": "write", "value_hex": "A501", "message": "TEST log"},
        )
        assert r.status_code == 200
        _assert_no_objectid(r.json())

    def test_list_logs(self, client):
        r = client.get(f"{API}/logs", params={"limit": 50})
        assert r.status_code == 200
        data = r.json()
        _assert_no_objectid(data)
        assert any(l.get("message") == "TEST log" for l in data)

    def test_clear_logs(self, client):
        r = client.delete(f"{API}/logs")
        assert r.status_code == 200
        assert client.get(f"{API}/logs").json() == []


# ----------------------------- Macros -----------------------------
class TestMacros:
    macro_id = None

    def test_create_macro(self, client):
        r = client.post(
            f"{API}/macros",
            json={
                "name": "TEST_Macro",
                "steps": [{"command_id": "fake-id", "delay_ms": 200}],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        _assert_no_objectid(body)
        TestMacros.macro_id = body["id"]

    def test_list_macros(self, client):
        r = client.get(f"{API}/macros")
        assert r.status_code == 200
        _assert_no_objectid(r.json())

    def test_update_macro(self, client):
        r = client.put(
            f"{API}/macros/{TestMacros.macro_id}",
            json={"name": "TEST_Macro_Renamed"},
        )
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Macro_Renamed"

    def test_delete_macro(self, client):
        r = client.delete(f"{API}/macros/{TestMacros.macro_id}")
        assert r.status_code == 200


# ----------------------------- Export -----------------------------
class TestExport:
    def test_create_and_get_export(self, client):
        payload = {
            "device_name": "Aura A40 (test)",
            "note": "pytest export",
            "captures": [
                {"ts": "12:00:00", "char_uuid": "ffe1", "hex": "AA 00 00 01 0A B5"}
            ],
            "commands": [
                {
                    "name": "Volume 20",
                    "category": "volume",
                    "char_uuid": "ffe1",
                    "payload_hex": "AA 01 00 02 03 14 C3",
                }
            ],
        }
        r = client.post(f"{API}/export", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        _assert_no_objectid(created)
        assert created["id"]
        assert len(created["captures"]) == 1
        assert len(created["commands"]) == 1

        # GET returns the most recent export
        r2 = client.get(f"{API}/export")
        assert r2.status_code == 200, r2.text
        latest = r2.json()
        assert latest is not None
        assert latest["id"] == created["id"]
        assert latest["device_name"] == "Aura A40 (test)"


# ----------------------------- Cleanup -----------------------------
def test_zz_cleanup_test_commands(client):
    """Best-effort cleanup of any leftover TEST_ commands."""
    cmds = client.get(f"{API}/commands").json()
    for c in cmds:
        if c.get("name", "").startswith("TEST_"):
            client.delete(f"{API}/commands/{c['id']}")
