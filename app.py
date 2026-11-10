"""Local browser interface for the Tonnetz explorer."""
from functools import lru_cache
from hashlib import sha256
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit
import webbrowser

from tonnetz import Song, SAMPLE_SONGS, TonnetzRecommender
from explanations import recommendation_data, song_data

ROOT = Path(__file__).resolve().parent
ENGINE = TonnetzRecommender(SAMPLE_SONGS)


@lru_cache(maxsize=32)
def recommendation_response(chords, transpose):
    """Cache immutable responses; input validation happens before this function."""
    target = Song("Your progression", list(chords))
    return json.dumps(recommendation_data(ENGINE, target, transpose),
                      separators=(",", ":")).encode()


@lru_cache(maxsize=8)
def static_response(filename, modified_ns, size):
    """A changed file gets a fresh cache key during local editing."""
    body = (ROOT / filename).read_bytes()
    return body, '"' + sha256(body).hexdigest() + '"'


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, mime="application/json; charset=utf-8",
              cache="no-store", etag=None):
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        if etag:
            self.send_header("ETag", etag)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/songs":
            self.reply(200, [song_data(song) for song in SAMPLE_SONGS])
            return
        assets = {"/": ("explore.html", "text/html"),
                  "/explore": ("explore.html", "text/html"),
                  "/explorer.js": ("explorer.js", "text/javascript"),
                  "/explorer.css": ("explorer.css", "text/css")}
        if path not in assets:
            self.reply(404, {"error": "Page not found"})
            return
        filename, mime = assets[path]
        stat = (ROOT / filename).stat()
        body, etag = static_response(filename, stat.st_mtime_ns, stat.st_size)
        cache = "private, no-cache"
        if self.headers.get("If-None-Match") == etag:
            self.reply(304, b"", mime + "; charset=utf-8", cache, etag)
        else:
            self.reply(200, body, mime + "; charset=utf-8", cache, etag)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/recommend":
            self.reply(404, {"error": "Page not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 12000:
                raise ValueError("Please enter a short chord progression.")
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError("Send a JSON object with a chord progression.")
            progression = data.get("progression", "")
            if not isinstance(progression, str):
                raise ValueError("Chord progression must be text.")
            target = Song.from_text("Your progression", progression)
            if not 1 <= len(target.chords) <= 32:
                raise ValueError("Enter between 1 and 32 chords.")
            invariant = data.get("transpose", True)
            if not isinstance(invariant, bool):
                raise ValueError("The any-key option must be true or false.")
            self.reply(200, recommendation_response(tuple(target.chords), invariant))
        except (ValueError, TypeError, AttributeError) as exc:
            self.reply(400, {"error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    url = "http://127.0.0.1:8765"
    if "--no-browser" not in sys.argv:
        chrome = Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe"
        if chrome.exists():
            subprocess.Popen([str(chrome), url])
        else:
            webbrowser.open(url)
    print(f"Abbies Comp is running at {url}. Close this window to stop.", flush=True)
    server.serve_forever()
