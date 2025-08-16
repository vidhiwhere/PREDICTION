from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict')
def prediction_page():
    return render_template('prediction.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    days = data.get("days")
    temp = data.get("temp")
    humidity = data.get("humidity")
    wind = data.get("wind")

    labels = list(range(1, days + 1))
    risk = [min(100, max(0, (temp * 0.8 + wind * 0.5 - humidity * 0.3) + i)) for i in range(days)]

    return jsonify({"labels": labels, "risk": risk})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
