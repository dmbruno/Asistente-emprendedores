"""
Agente Travel Quoter con streaming SSE — multi-proveedor.

Soporta: Anthropic (Claude), OpenAI (GPT), Google (Gemini via endpoint OpenAI-compatible).
Diseño: stateless — el frontend envía el historial completo en cada request.
Las API keys vienen por request desde Supabase, nunca globales.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from datetime import date
from typing import Any, Optional

import anthropic
from openai import AsyncOpenAI

from app.config import settings
from app.tools.flights import TOOL_DEFINITION as FLIGHTS_TOOL, search_flights
from app.tools.hotels import TOOL_DEFINITION as HOTELS_TOOL, search_hotels
from app.tools.search_web import TOOL_DEFINITION as WEB_TOOL, search_web
from app.tools.quote_builder import TOOL_DEFINITION as QUOTE_TOOL, build_quote
from app.tools.email_sender import TOOL_DEFINITION as EMAIL_TOOL, send_quote_email

logger = logging.getLogger(__name__)

# Herramientas en formato Anthropic
TOOLS_ANTHROPIC = [FLIGHTS_TOOL, HOTELS_TOOL, WEB_TOOL, QUOTE_TOOL, EMAIL_TOOL]

# Modelos default por proveedor
DEFAULT_MODELS = {
    "anthropic": settings.default_model,
    "openai": "gpt-4o",
    "gemini": "gemini-2.0-flash",
}

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

def _build_system_prompt(user_email: str = "") -> str:
    today = date.today().strftime("%d/%m/%Y")
    email_line = f"- EMAIL DEL USUARIO: {user_email} — usá este email como destinatario por defecto al enviar cotizaciones. No lo pidas por el chat." if user_email else ""
    return f"""Sos un agente cazador de precios especializado en viajes para agentes de turismo latinoamericanos.
Tu diferencial es encontrar el MEJOR PRECIO POSIBLE, no solo el precio de la fecha pedida.
Siempre buscás en un rango de fechas y mostrás cuánto puede ahorrar el pasajero siendo flexible.

═══════════════════════════════════════════════
IDIOMA Y ESTILO
═══════════════════════════════════════════════
- Español rioplatense (vos, podés, tenés).
- Respuestas concretas: primero los precios, después los detalles.
- Pedí solo los datos que faltan: origen, destino, fechas, cantidad de pasajeros.

═══════════════════════════════════════════════
FECHAS
═══════════════════════════════════════════════
- Hoy es {today} (formato DD/MM/AAAA, Argentina).
- "15/6" = 15 de junio del año más próximo que sea futuro. "15/6/26" = 15/6/2026.
- Si la fecha ya pasó, avisalo y pedí una futura. Nunca llames search_flights con fecha pasada.
{email_line}

═══════════════════════════════════════════════
CAZA DE PRECIOS — REGLAS PRINCIPALES
═══════════════════════════════════════════════
1. SIEMPRE llamá search_flights con search_mode='price_hunter'. Nunca uses 'exact' salvo que el
   usuario diga explícitamente que no puede cambiar de fecha.

2. Cuando recibas el resultado, SIEMPRE mostrá esta comparativa de fechas:

   📅 Comparativa de precios (±3 días):
   | Fecha       | Precio   |
   |-------------|----------|
   | lun 12/ago  | USD 580  |  ← más barato
   | mar 13/ago  | USD 620  |
   | mié 14/ago  | USD 610  |
   | jue 15/ago  | USD 690  |  ← fecha pedida
   | vie 16/ago  | USD 705  |
   | sáb 17/ago  | USD 720  |
   | dom 18/ago  | USD 680  |

   Usa los datos de all_dates_prices para armar esta tabla. Marcá la fecha pedida y la más barata.

3. Si hay ahorro (savings_usd > 0), destacalo SIEMPRE con un bloque así:
   💡 Ahorro potencial: el <cheapest_date> está USD <savings_usd> más barato que el <requested_date>.
      Si el pasajero puede viajar ese día, ahorra ese monto en el vuelo.
   (Reemplazá los placeholders con los valores reales del resultado.)

4. Presentá siempre DOS bloques de opciones de vuelo:
   - "Opción fecha pedida (<requested_date>)" — hasta 3 vuelos de exact_date_flights
   - "Opción más económica (<cheapest_date>)" — hasta 3 vuelos de flexible_flights
   Si la fecha pedida Y la más barata son el mismo día, mostrá solo un bloque.

5. Para cada vuelo mostrá: aerolínea, precio total, escalas, duración, horario de salida/llegada.

6. Cuando recibas el resultado de search_flights, si incluye 'google_flights_url', agregalo al final:
   🔗 Ver en Google Flights: <url>

═══════════════════════════════════════════════
HOTELES
═══════════════════════════════════════════════
- Presentá hasta 3 hoteles ordenados por precio, con: nombre, estrellas, precio/noche, rating y ubicación.
- Si el resultado incluye 'link' en un hotel, mostralo como "[Ver hotel](<link>)".
- Si el usuario cambia la fecha del vuelo al más barato, recordale que las fechas del hotel también cambian.

═══════════════════════════════════════════════
PRESUPUESTO Y EMAIL
═══════════════════════════════════════════════
- Antes de enviar, mostrá el resumen con build_quote y pedí confirmación.
- Llamá build_quote UNA SOLA VEZ con flight_option (airline, total_amount string, slices) y hotel_option (name, price_per_night_usd, stars, location).
- Llamá send_quote_email UNA SOLA VEZ con campos planos:
  recipient_email, recipient_name, trip_name,
  airline, flight_amount_usd (número), flight_details (texto ruta+fecha+horario),
  hotel_name, hotel_nights (entero), hotel_amount_usd (número), hotel_details, total_usd (número).
- Nunca envíes dos emails separados.

═══════════════════════════════════════════════
PROVEEDORES ESPECÍFICOS
═══════════════════════════════════════════════
- Si el usuario menciona Despegar, OLA Mayorista, Almundo u otro proveedor, usá search_web para buscar en ese sitio.

═══════════════════════════════════════════════
FORMATO
═══════════════════════════════════════════════
- Nunca uses markdown de imagen (![]()), los logos no se renderizan.
- Usá tablas markdown para la comparativa de fechas y las opciones de vuelo."""


def _sse_event(event_type: str, data: Any) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _dispatch_tool(tool_name: str, tool_input: dict, serpapi_key: str, allow_real_data: bool = True) -> Any:
    if tool_name == "search_flights":
        return await search_flights(serpapi_key, allow_real_data=allow_real_data, **tool_input)
    elif tool_name == "search_hotels":
        return await search_hotels(serpapi_key, allow_real_data=allow_real_data, **tool_input)
    elif tool_name == "search_web":
        return await search_web(serpapi_key, **tool_input)
    elif tool_name == "build_quote":
        return build_quote(**tool_input)
    elif tool_name == "send_quote_email":
        return await _dispatch_send_email(tool_input)
    return {"error": f"Herramienta desconocida: {tool_name}"}


async def _dispatch_send_email(tool_input: dict) -> dict:
    """Llama send_quote_email con los parámetros planos que pasa el agente."""
    return await send_quote_email(**tool_input)


def _tools_to_openai_format() -> list[dict]:
    """Convierte tool definitions de formato Anthropic a formato OpenAI."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in TOOLS_ANTHROPIC
    ]


# ── Anthropic ─────────────────────────────────────────────────────────────────

async def _stream_anthropic(
    messages: list[dict],
    api_key: str,
    serpapi_key: str,
    user_email: str = "",
    allow_real_data: bool = True,
) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=api_key)
    current_messages = list(messages)

    for _ in range(10):
        text_chunks: list[str] = []
        tool_uses: list[dict] = []
        current_tool: Optional[dict] = None
        current_tool_input_json = ""

        try:
            async with client.messages.stream(
                model=settings.default_model,
                max_tokens=settings.default_max_tokens,
                system=_build_system_prompt(user_email),
                tools=TOOLS_ANTHROPIC,
                messages=current_messages,
            ) as stream:
                async for event in stream:
                    etype = event.type

                    if etype == "content_block_start":
                        block = event.content_block
                        if block.type == "tool_use":
                            current_tool = {"id": block.id, "name": block.name}
                            current_tool_input_json = ""
                            yield _sse_event("tool_start", {"name": block.name})

                    elif etype == "content_block_delta":
                        delta = event.delta
                        if delta.type == "text_delta":
                            text_chunks.append(delta.text)
                            yield _sse_event("text_delta", {"text": delta.text})
                        elif delta.type == "input_json_delta":
                            current_tool_input_json += delta.partial_json

                    elif etype == "content_block_stop":
                        if current_tool:
                            try:
                                tool_input = json.loads(current_tool_input_json or "{}")
                            except json.JSONDecodeError:
                                tool_input = {}
                            tool_uses.append({**current_tool, "input": tool_input})
                            current_tool = None
                            current_tool_input_json = ""

        except anthropic.AuthenticationError:
            yield _sse_event("error", {"message": "API key de Anthropic inválida"})
            return
        except anthropic.APIError as e:
            logger.error("Anthropic API error: %s", e)
            yield _sse_event("error", {"message": f"Error del modelo: {str(e)[:200]}"})
            return

        if not tool_uses:
            yield _sse_event("done", {"text": "".join(text_chunks)})
            return

        assistant_content = []
        if text_chunks:
            assistant_content.append({"type": "text", "text": "".join(text_chunks)})
        for tu in tool_uses:
            assistant_content.append(
                {"type": "tool_use", "id": tu["id"], "name": tu["name"], "input": tu["input"]}
            )
        current_messages.append({"role": "assistant", "content": assistant_content})

        tool_results = []
        for tu in tool_uses:
            try:
                result = await _dispatch_tool(tu["name"], tu["input"], serpapi_key, allow_real_data=allow_real_data)
            except Exception as e:
                logger.error("Tool %s error: %s", tu["name"], e)
                result = {"error": str(e)[:200]}
            try:
                yield _sse_event("tool_result", {"name": tu["name"], "result": result})
            except Exception:
                pass
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tu["id"],
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                }
            )
        current_messages.append({"role": "user", "content": tool_results})

    yield _sse_event("error", {"message": "El agente superó el límite de iteraciones"})


# ── OpenAI / Gemini ───────────────────────────────────────────────────────────

async def _stream_openai(
    messages: list[dict],
    api_key: str,
    serpapi_key: str,
    model: str = "gpt-4o",
    base_url: Optional[str] = None,
    user_email: str = "",
    allow_real_data: bool = True,
) -> AsyncGenerator[str, None]:
    client_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url

    client = AsyncOpenAI(**client_kwargs)
    openai_tools = _tools_to_openai_format()

    # OpenAI espera el system como primer mensaje
    openai_messages: list[dict] = [{"role": "system", "content": _build_system_prompt(user_email)}] + list(messages)

    for _ in range(10):
        text_chunks: list[str] = []
        # index → {id, name, args_str}
        tool_calls_acc: dict[int, dict] = {}

        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=openai_messages,
                tools=openai_tools,
                stream=True,
            )

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta

                if delta.content:
                    text_chunks.append(delta.content)
                    yield _sse_event("text_delta", {"text": delta.content})

                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {
                                "id": tc.id or "",
                                "name": tc.function.name if tc.function else "",
                                "args": "",
                            }
                            if tc.function and tc.function.name:
                                yield _sse_event("tool_start", {"name": tc.function.name})
                        if tc.function and tc.function.arguments:
                            tool_calls_acc[idx]["args"] += tc.function.arguments
                        if tc.id and not tool_calls_acc[idx]["id"]:
                            tool_calls_acc[idx]["id"] = tc.id

        except Exception as e:
            logger.error("OpenAI/Gemini API error: %s", e)
            yield _sse_event("error", {"message": f"Error del modelo: {str(e)[:200]}"})
            return

        if not tool_calls_acc:
            yield _sse_event("done", {"text": "".join(text_chunks)})
            return

        # Armar mensaje del asistente con tool_calls
        full_text = "".join(text_chunks)
        assistant_msg: dict[str, Any] = {
            "role": "assistant",
            "content": full_text or None,
            "tool_calls": [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["args"]},
                }
                for tc in tool_calls_acc.values()
            ],
        }
        openai_messages.append(assistant_msg)

        # Ejecutar tools y agregar resultados
        for tc in tool_calls_acc.values():
            try:
                tool_input = json.loads(tc["args"] or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            try:
                result = await _dispatch_tool(tc["name"], tool_input, serpapi_key, allow_real_data=allow_real_data)
            except Exception as e:
                logger.error("Tool %s error: %s", tc["name"], e)
                result = {"error": str(e)[:200]}
            try:
                yield _sse_event("tool_result", {"name": tc["name"], "result": result})
            except Exception:
                pass
            openai_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                }
            )

    yield _sse_event("error", {"message": "El agente superó el límite de iteraciones"})


# ── Dispatcher público ────────────────────────────────────────────────────────

async def stream_agent(
    messages: list[dict],
    api_key: str,
    serpapi_key: str = "",
    provider: str = "anthropic",
    user_email: str = "",
    allow_real_data: bool = True,
) -> AsyncGenerator[str, None]:
    if provider == "openai":
        async for chunk in _stream_openai(messages, api_key, serpapi_key, model=DEFAULT_MODELS["openai"], user_email=user_email, allow_real_data=allow_real_data):
            yield chunk
    elif provider == "gemini":
        async for chunk in _stream_openai(
            messages, api_key, serpapi_key,
            model=DEFAULT_MODELS["gemini"],
            base_url=GEMINI_BASE_URL,
            user_email=user_email,
            allow_real_data=allow_real_data,
        ):
            yield chunk
    else:
        async for chunk in _stream_anthropic(messages, api_key, serpapi_key, user_email=user_email, allow_real_data=allow_real_data):
            yield chunk
