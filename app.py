from flask import Flask, request, jsonify, render_template
import hashlib
import time
from collections import OrderedDict

app = Flask(__name__, static_folder='static', template_folder='templates')

# Хранилище данных
users = OrderedDict()
blockchain = []
pending_transactions = []

class Block:
    def __init__(self, index, previous_hash, timestamp, data, hash):
        self.index = index
        self.previous_hash = previous_hash
        self.timestamp = timestamp
        self.data = data
        self.hash = hash

# Создаем генезис-блок
def create_genesis_block():
    return Block(
        index=0,
        previous_hash="0",
        timestamp=time.time(),
        data="Genesis Block",
        hash=hashlib.sha256("0".encode()).hexdigest()
    )

blockchain.append(create_genesis_block().__dict__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if username in users:
        return jsonify({"error": "Username already exists"}), 400

    users[username] = {
        'password': hashlib.sha256(password.encode()).hexdigest(),
        'balance': 10  # Начальный баланс
    }

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = users.get(username)
    if not user or user['password'] != hashlib.sha256(password.encode()).hexdigest():
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "message": "Login successful",
        "balance": user['balance']
    }), 200

@app.route('/mine', methods=['POST'])
def mine():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    if username not in users:
        return jsonify({"error": "User not found"}), 404

    last_block = blockchain[-1]
    new_block = Block(
        index=len(blockchain),
        previous_hash=last_block['hash'],
        timestamp=time.time(),
        data=f"Block mined by {username}",
        hash=hashlib.sha256(f"{len(blockchain)}{last_block['hash']}{time.time()}".encode()).hexdigest()
    )

    blockchain.append(new_block.__dict__)
    users[username]['balance'] += 1  # Награда за майнинг

    return jsonify({
        "message": "New block mined",
        "block": new_block.__dict__,
        "balance": users[username]['balance']
    }), 200

@app.route('/chain', methods=['GET'])
def get_chain():
    return jsonify({
        "chain": blockchain,
        "length": len(blockchain)
    }), 200

@app.route('/balance/<username>', methods=['GET'])
def get_balance(username):
    if username not in users:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "username": username,
        "balance": users[username]['balance']
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)