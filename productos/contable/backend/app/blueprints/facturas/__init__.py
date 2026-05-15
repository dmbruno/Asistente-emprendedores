from flask import Blueprint

bp = Blueprint("facturas", __name__, url_prefix="/api/v1/facturas")

from . import routes  # noqa: E402,F401
