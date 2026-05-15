from flask import Blueprint

bp = Blueprint("suscripcion", __name__, url_prefix="/api/v1/suscripcion")

from . import routes  # noqa: E402, F401
