"""Local browser interface for the original Tonnetz recommender."""
import json
import os
from pathlib import Path
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import webbrowser

from tonnetz import Song, SAMPLE_SONGS, TonnetzRecommender
from explanations import recommendation_data, song_data
from analysis import parse_study, study_data
from curated_catalog import catalog_songs
from replay_study import verify
from study_report import render_report

ROOT = Path(__file__).resolve().parent
ENGINE = TonnetzRecommender(SAMPLE_SONGS)


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, mime="application/json; charset=utf-8"):
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/":
            self.reply(200, (ROOT / "lab.html").read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/api/songs":
            self.reply(200, [song_data(s) for s in SAMPLE_SONGS])
        elif self.path == "/api/catalog":
            self.reply(200, catalog_songs())
        elif self.path == "/explore":
            self.reply(200, (ROOT / "explore.html").read_bytes(), "text/html; charset=utf-8")
        elif self.path in ("/network.js", "/network.css", "/lab.js", "/lab.css", "/explorer.js", "/explorer.css"):
            mime = "text/javascript" if self.path.endswith(".js") else "text/css"
            self.reply(200, (ROOT / self.path[1:]).read_bytes(), mime + "; charset=utf-8")
        else:
            self.reply(404, {"error": "Page not found"})

    def do_POST(self):
        if self.path not in ("/api/recommend", "/api/analyze", "/api/import-study", "/api/report"):
            self.reply(404, {"error": "Page not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            limit = 2_000_000 if self.path == '/api/import-study' else 12000
            if not 0 < length <= limit:
                raise ValueError("Please enter a short chord progression.")
            data = json.loads(self.rfile.read(length))
            if self.path == '/api/report':
                songs, invariant = parse_study(data)
                self.reply(200, {'html': render_report(study_data(ENGINE, songs, invariant))})
                return
            if self.path == '/api/import-study':
                verification = verify(data)
                songs, invariant = parse_study(data['inputs'])
                self.reply(200, {'verification': verification,
                                 'study': study_data(ENGINE, songs, invariant)})
                return
            if self.path == "/api/analyze":
                songs, invariant = parse_study(data)
                self.reply(200, study_data(ENGINE, songs, invariant))
                return
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
            self.reply(200, recommendation_data(ENGINE, target, invariant))
        except (ValueError, TypeError, AttributeError) as exc:
            self.reply(400, {"error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    url = "http://127.0.0.1:8765" + ("/explore" if "--explore" in __import__("sys").argv else "")
    if "--no-browser" not in __import__("sys").argv:
        chrome = Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe"
        if chrome.exists():
            subprocess.Popen([str(chrome), url])
        else:
            webbrowser.open(url)
    print(f"Mixtape for Abbie is running at {url}. Close this window to stop.", flush=True)
    server.serve_forever()
