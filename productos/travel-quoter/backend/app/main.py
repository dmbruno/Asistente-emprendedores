"""FastAPI entry point — Travel Quoter backend."""

from __future__ import annotations

import logging
from typing import Annotated, Any, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from supabase import create_client, Client

from app.agent import stream_agent
from app.config import settings
from app.utils.auth import CurrentUser
from app.utils.crypto import CryptoError, decrypt, encrypt, hint

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

logger.info("SerpAPI configurada: %s", bool(settings.serpapi_api_key))
logger.info("SerpAPI key prefix: %s", settings.serpapi_api_key[:8] if settings.serpapi_api_key else "VACÍA")

app = FastAPI(title="Travel Quoter API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROVIDERS = {"anthropic", "openai", "gemini"}
PROVIDER_KEY_FIELD = {
    "anthropic": "anthropic_key_enc",
    "openai":    "openai_key_enc",
    "gemini":    "gemini_key_enc",
}


def _supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# ── Schemas ───────────────────────────────────────────────────────────────────

class UpsertKeysRequest(BaseModel):
    anthropic_api_key: Optional[str] = None
    openai_api_key:    Optional[str] = None
    gemini_api_key:    Optional[str] = None
    recipient_email:   Optional[str] = None


class KeysResponse(BaseModel):
    has_anthropic_key:  bool
    has_openai_key:     bool
    has_gemini_key:     bool
    has_serpapi:        bool
    anthropic_key_hint: Optional[str]
    openai_key_hint:    Optional[str]
    gemini_key_hint:    Optional[str]
    recipient_email:    Optional[str]


class ChatMessage(BaseModel):
    role: str
    content: Any


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    provider: str = Field(default="anthropic")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "travel-quoter"}


# ── BYOK Keys CRUD ────────────────────────────────────────────────────────────

@app.get("/api/v1/keys", response_model=KeysResponse)
async def get_keys(user: CurrentUser):
    user_id = user["sub"]
    row = (
        _supabase()
        .table("travel_user_configs")
        .select("anthropic_key_enc, openai_key_enc, gemini_key_enc, recipient_email")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not row.data:
        return KeysResponse(
            has_anthropic_key=False, has_openai_key=False, has_gemini_key=False,
            has_serpapi=bool(settings.serpapi_api_key),
            anthropic_key_hint=None, openai_key_hint=None, gemini_key_hint=None,
            recipient_email=None,
        )
    d = row.data

    def _hint(field: str) -> Optional[str]:
        enc = d.get(field)
        return hint(decrypt(enc)) if enc else None

    return KeysResponse(
        has_anthropic_key=bool(d.get("anthropic_key_enc")),
        has_openai_key=bool(d.get("openai_key_enc")),
        has_gemini_key=bool(d.get("gemini_key_enc")),
        has_serpapi=bool(settings.serpapi_api_key),
        anthropic_key_hint=_hint("anthropic_key_enc"),
        openai_key_hint=_hint("openai_key_enc"),
        gemini_key_hint=_hint("gemini_key_enc"),
        recipient_email=d.get("recipient_email"),
    )


@app.put("/api/v1/keys")
async def upsert_keys(user: CurrentUser, body: UpsertKeysRequest):
    user_id = user["sub"]
    payload: dict[str, Any] = {"user_id": user_id}
    if body.anthropic_api_key is not None:
        payload["anthropic_key_enc"] = encrypt(body.anthropic_api_key)
    if body.openai_api_key is not None:
        payload["openai_key_enc"] = encrypt(body.openai_api_key)
    if body.gemini_api_key is not None:
        payload["gemini_key_enc"] = encrypt(body.gemini_api_key)
    if body.recipient_email is not None:
        payload["recipient_email"] = body.recipient_email or None  # string vacío → NULL
    _supabase().table("travel_user_configs").upsert(payload, on_conflict="user_id").execute()
    return {"saved": True}


@app.delete("/api/v1/keys")
async def delete_keys(user: CurrentUser):
    _supabase().table("travel_user_configs").delete().eq("user_id", user["sub"]).execute()
    return {"deleted": True}


_VALID_KEY_FIELDS = {
    "anthropic": "anthropic_key_enc",
    "openai": "openai_key_enc",
    "gemini": "gemini_key_enc",
}


@app.delete("/api/v1/keys/{key_name}")
async def delete_single_key(key_name: str, user: CurrentUser):
    if key_name not in _VALID_KEY_FIELDS:
        raise HTTPException(status_code=400, detail="Key inválida")
    field = _VALID_KEY_FIELDS[key_name]
    _supabase().table("travel_user_configs").update({field: None}).eq("user_id", user["sub"]).execute()
    return {"deleted": key_name}


# ── Chat stream ───────────────────────────────────────────────────────────────

@app.post("/api/v1/chat/stream")
async def chat_stream(user: CurrentUser, body: ChatRequest):
    provider = body.provider if body.provider in PROVIDERS else "anthropic"
    key_field = PROVIDER_KEY_FIELD[provider]

    user_id = user["sub"]
    row = (
        _supabase()
        .table("travel_user_configs")
        .select(f"{key_field}, recipient_email")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    provider_labels = {"anthropic": "Anthropic", "openai": "OpenAI", "gemini": "Gemini"}
    if not row.data or not row.data.get(key_field):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No tenés una {provider_labels[provider]} API key configurada. Cargala en Configuración.",
        )

    try:
        api_key = decrypt(row.data[key_field])
    except CryptoError:
        raise HTTPException(status_code=500, detail="Error al leer las keys")

    serpapi_key = settings.serpapi_api_key
    # recipient_email configurado en settings > email del JWT como fallback
    recipient_email = (row.data or {}).get("recipient_email") or user.get("email", "")
    messages = [m.model_dump() for m in body.messages]

    async def event_generator():
        async for chunk in stream_agent(messages, api_key, serpapi_key, provider=provider, user_email=recipient_email):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
