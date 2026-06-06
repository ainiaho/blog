#!/usr/bin/env python3
"""Dev server with auto-rebuild and live reload for the static blog."""

import os
import sys
import json
import time
import socket
import subprocess
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

HOST = "0.0.0.0"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
OUTPUT_DIR = Path(__file__).parent / "output"
BUILD_SCRIPT = Path(__file__).parent / "scripts" / "build.js"
WATCH_DIRS = [
    Path(__file__).parent / "posts",
    Path(__file__).parent / "templates",
    Path(__file__).parent / "assets",
    Path(__file__).parent / "scripts",
]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(OUTPUT_DIR), **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        if not path.exists() and not self.path.startswith("/api/"):
            self.path = "/404.html"
        return super().send_head()

    def log_message(self, fmt, *args):
        print(f"  {self.command} {self.path} -- {args[0]}")

def rebuild():
    print("\n  Rebuilding...")
    result = subprocess.run(["node", str(BUILD_SCRIPT)],
                            capture_output=True, text=True, cwd=OUTPUT_DIR.parent)
    for line in result.stdout.splitlines():
        print(f"    {line}")
    if result.stderr:
        for line in result.stderr.splitlines():
            print(f"    ERR: {line}")
    print(f"  Done ({len(result.stdout.splitlines())} lines)")

def watch():
    last_mtimes = {}
    for d in WATCH_DIRS:
        for f in d.rglob("*"):
            if f.is_file():
                last_mtimes[f] = f.stat().st_mtime

    while True:
        time.sleep(1)
        changed = False
        for d in WATCH_DIRS:
            for f in d.rglob("*"):
                if f.is_file():
                    mtime = f.stat().st_mtime
                    if f not in last_mtimes:
                        last_mtimes[f] = mtime
                        changed = True
                    elif mtime != last_mtimes[f]:
                        last_mtimes[f] = mtime
                        changed = True
        if changed:
            rebuild()
            cleanup = [f for f in last_mtimes if not f.exists()]
            for f in cleanup:
                del last_mtimes[f]

def main():
    os.chdir(OUTPUT_DIR.parent)

    rebuild()

    watch_thread = threading.Thread(target=watch, daemon=True)
    watch_thread.start()

    server = HTTPServer((HOST, PORT), Handler)
    print(f"\n  Server: http://localhost:{PORT}")
    print(f"  Watching: posts/, templates/, assets/, scripts/")
    print(f"  Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down...")
        server.shutdown()

if __name__ == "__main__":
    main()
