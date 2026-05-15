from flask import Blueprint

bp = Blueprint("webhook_wpp", __name__, url_prefix="/webhook/wpp")

from . import routes  # noqa: E402,F401
