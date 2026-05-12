from flask import Blueprint

bp = Blueprint("clientes", __name__, url_prefix="/api/v1")

from . import routes  # noqa: E402,F401
