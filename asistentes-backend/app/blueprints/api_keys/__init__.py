from flask import Blueprint

bp = Blueprint("api_keys", __name__, url_prefix="/api/v1/api-keys")

from . import routes  # noqa: E402,F401
