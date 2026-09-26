"""
Vercel entrypoint for the FastAPI backend (vercel.json: service root "backend",
entrypoint "main:app").

Vercel runs this service with backend/ as its root, so this file is imported
as a top-level module. The application imports itself as the `backend`
package (`from backend.data import store`, …), which only exists when running
from the repository root. Register this directory as the `backend` package
first so those imports resolve in both layouts. Local development is
unchanged: `uvicorn backend.api:app` from the repo root.
"""

import sys
import types
from pathlib import Path

if "backend" not in sys.modules:
    _package = types.ModuleType("backend")
    _package.__path__ = [str(Path(__file__).resolve().parent)]
    sys.modules["backend"] = _package

from backend.api import app  # noqa: E402  (must run after the package is registered)

__all__ = ["app"]
