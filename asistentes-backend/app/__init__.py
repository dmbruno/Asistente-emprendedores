"""Factory de la aplicación Flask."""

from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, default_exceptions

from app.config import Settings, get_settings


# werkzeug 3.x eliminó 402 del registro; lo registramos manualmente.
class _PaymentRequired(HTTPException):
    code = 402
    name = "Payment Required"
    description = "Payment Required"


default_exceptions.setdefault(402, _PaymentRequired)


def create_app(settings: Settings | None = None) -> Flask:
    """Crea y configura la app Flask.

    Args:
        settings: settings opcional para tests. En producción se cargan de env.
    """
    app = Flask(__name__)
    settings = settings or get_settings()
    app.config["SETTINGS"] = settings

    _configure_logging(settings.log_level)
    _configure_cors(app)
    _register_blueprints(app)
    _register_error_handlers(app)
    _register_health(app)

    return app


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def _configure_cors(app: Flask) -> None:
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
    )


def _register_blueprints(app: Flask) -> None:
    from app.blueprints.api_keys import bp as api_keys_bp
    from app.blueprints.clientes import bp as clientes_bp
    from app.blueprints.facturas import bp as facturas_bp
    from app.blueprints.suscripcion import bp as suscripcion_bp
    from app.blueprints.webhook_wpp import bp as webhook_bp
    from app.blueprints.wpp import bp as wpp_bp

    app.register_blueprint(clientes_bp)
    app.register_blueprint(api_keys_bp)
    app.register_blueprint(facturas_bp)
    app.register_blueprint(suscripcion_bp)
    app.register_blueprint(webhook_bp)
    app.register_blueprint(wpp_bp)


def _register_error_handlers(app: Flask) -> None:
    from werkzeug.exceptions import HTTPException

    @app.errorhandler(HTTPException)
    def _http_error(exc: HTTPException):
        return {"error": exc.name, "detail": exc.description}, exc.code or 500

    @app.errorhandler(Exception)
    def _unhandled(exc: Exception):
        app.logger.exception("Excepción no manejada")
        return {"error": "internal_server_error"}, 500


def _register_health(app: Flask) -> None:
    from flask import redirect

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    @app.get("/dashboard")
    def redirect_dashboard():
        # MP back_url apunta acá en dev; redirigir al frontend local
        return redirect("http://localhost:3000/dashboard/suscripcion")
