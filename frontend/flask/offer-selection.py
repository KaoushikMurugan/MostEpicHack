from flask import Flask, render_template, request, jsonify
import firebase_admin
from firebase_admin import credentials, db

app = Flask(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://your-firebase-project.firebaseio.com'
})

@app.route('/')
def index():
    # Fetch key names from Firebase
    ref = db.reference('your_database_node')
    keys = list(ref.get().keys())
    return render_template('index.html', keys=keys)

@app.route('/select', methods=['POST'])
def select():
    selected_key = request.form['selectedKey']
    # Handle selected key, e.g., update Firebase or perform other actions
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
