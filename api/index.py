from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 1. Test Route: Go to https://your-project.vercel.app/api/test in your browser
@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Backend is Connected and Working!"})

# 2. Your Real Route
@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    return jsonify({"message": "Analyze endpoint hit successfully"})