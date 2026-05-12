"""Gestión BYOK: el cliente carga su API key, la encriptamos y guardamos."""

from __future__ import annotations

from flask import abort, jsonify, request

from app.utils.auth import requires_auth

from . import bp

PROVIDERS_VALIDOS = {"anthropic", "openai", "google", "afip_cert", "afip_key"}


@bp.get("")
@requires_auth
def list_keys():
    from app.extensions import get_supabase_admin
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]

    try:
        admin = get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))

    result = (
        admin.table("api_keys")
        .select("id, provider, key_hint, last_validated_at, last_used_at, created_at")
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return jsonify({"items": result.data or []})


@bp.post("")
@requires_auth
def create_key():
    from app.extensions import get_supabase_admin
    from app.utils.crypto import encrypt, hint

    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    body = request.get_json(silent=True) or {}

    provider = body.get("provider", "").strip().lower()
    api_key = body.get("api_key", "").strip()

    if provider not in PROVIDERS_VALIDOS:
        abort(400, description=f"provider inválido. Válidos: {', '.join(PROVIDERS_VALIDOS)}")
    if not api_key:
        abort(400, description="api_key requerida")

    encrypted = encrypt(api_key)
    key_hint = hint(api_key)

    try:
        admin = get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))

    # Upsert: si ya existe para ese provider, la reemplaza
    admin.table("api_keys").upsert({
        "cliente_id": cliente_id,
        "provider": provider,
        "encrypted_key": encrypted,
        "key_hint": key_hint,
    }, on_conflict="cliente_id,provider").execute()

    return jsonify({"provider": provider, "key_hint": key_hint}), 201


@bp.delete("/<key_id>")
@requires_auth
def delete_key(key_id: str):
    from app.extensions import get_supabase_admin
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]

    try:
        admin = get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))

    admin.table("api_keys").delete().eq("id", key_id).eq("cliente_id", cliente_id).execute()
    return "", 204
