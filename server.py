from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from datetime import date

load_dotenv(".env")
API_KEY = os.environ["OWM_API_KEY"]
ALLOWED_ORIGIN = os.environ["WEBAPP_URL"]
app = Flask(__name__)
CORS(app)
DAILY_CALL_LIMIT = 500

def reset_count():
    os.environ["DATE"] = date.today().isoformat()
    os.environ["COUNT"] = "0"
    return True

def log_count():
    current_count = int(os.environ["COUNT"])
    os.environ["COUNT"] = str(current_count + 1)
    return True

def get_count():
    last_day = os.environ["DATE"]
    today = date.today().isoformat()
    if last_day == today:
        count = os.environ["COUNT"]
        return int(count)
    else:
        reset_count()
        return 0

if "DATE" not in os.environ or "COUNT" not in os.environ:
    reset_count()

@app.route("/owm", methods=["GET", "POST"])
def get_weather():
    if get_count() > DAILY_CALL_LIMIT:
        return jsonify({"error": "Maximum request limit reached"}), 429
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    lang = request.args.get("lang", "en")
    origin = request.headers.get("Origin")
    print(origin)
    if origin != ALLOWED_ORIGIN:
        return jsonify({"error": "Access Forbidden."}), 403
    if lat is None or lon is None:
        return jsonify({"error": "Latitude and Longitude are required"}), 400
    url = f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&lang={lang}&exclude=current,minutely,daily&appid={API_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        log_count()
        return response.json()
    else:
        return jsonify({"error": "Weather data not available"}), 404

@app.route("/owmcount", methods=["GET"])
def owm_count():
    last_day = os.environ["DATE"]
    today = date.today().isoformat()
    if last_day == today:
        current_count = os.environ["COUNT"]
        return current_count, 200
    else:
        return "not used today", 200

if __name__ == "__main__":
    app.run()
