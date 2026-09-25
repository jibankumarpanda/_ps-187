"""Convenience launcher for the IBVAP ML API server.
Can be executed from both inside the 'ml' directory or from the project root.
"""

import os
import sys
from pathlib import Path

ml_dir = Path(__file__).resolve().parent
project_root = ml_dir.parent

for p in [str(project_root), str(ml_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
