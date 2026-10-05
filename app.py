import argparse
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from separation import audio, pipeline
from separation.audio import AudioError

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

app = Flask(__name__, static_folder=None)


@app.get("/")
def page():
    return (STATIC / "index.html").read_text(encoding="utf-8")


@app.get("/static/<name>")
def static_file(name):
    return send_from_directory(STATIC, name)


@app.get("/api/sources")
def api_sources():
    return reply(pipeline.sources)


@app.post("/api/run")
def api_run():
    return reply(pipeline.run)


@app.get("/audio/<name>")
def audio_file(name):
    return send_from_directory(audio.FOLDER, name, max_age=0)


def reply(fn):
    try:
        return jsonify(fn())
    except AudioError as err:
        return jsonify({"error": str(err)}), 503


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audio source separation using linear algebra.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()

    try:
        pipeline.sources()
    except AudioError as err:
        print(f"Warning: {err}")

    app.run(host=args.host, port=args.port)
