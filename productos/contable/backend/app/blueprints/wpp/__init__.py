from flask import Blueprint

bp = Blueprint("wpp", __name__, url_prefix="/api/v1/wpp")

from . import routes  # noqa: E402,F401
