from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Модели
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    balance = db.Column(db.Integer, default=0)
    transactions_sent = db.relationship('Transaction', foreign_keys='Transaction.sender_id', backref='sender', lazy=True)
    transactions_received = db.relationship('Transaction', foreign_keys='Transaction.recipient_id', backref='recipient', lazy=True)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    amount = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Transaction('{self.sender_id}', '{self.recipient_id}', '{self.amount}')"

# Инициализация базы данных
with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Маршруты
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            flash('Пользователь с таким именем или email уже существует', 'error')
            return redirect(url_for('register'))
        
        hashed_password = generate_password_hash(password, method='sha256')
        new_user = User(username=username, email=email, password=hashed_password, balance=100)  # Начальный баланс 100 коинов
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Регистрация прошла успешно! Теперь вы можете войти.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password, password):
            flash('Неверное имя пользователя или пароль', 'error')
            return redirect(url_for('login'))
        
        login_user(user)
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/wallet')
@login_required
def wallet():
    return render_template('wallet.html', user=current_user)

@app.route('/transfer', methods=['POST'])
@login_required
def transfer():
    recipient_username = request.form.get('recipient')
    amount = int(request.form.get('amount'))
    
    if current_user.username == recipient_username:
        return jsonify({'error': 'Нельзя переводить себе'}), 400
    
    recipient = User.query.filter_by(username=recipient_username).first()
    if not recipient:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if current_user.balance < amount:
        return jsonify({'error': 'Недостаточно средств'}), 400
    
    if amount <= 0:
        return jsonify({'error': 'Сумма должна быть положительной'}), 400
    
    # Выполняем транзакцию
    current_user.balance -= amount
    recipient.balance += amount
    
    # Записываем транзакцию
    transaction = Transaction(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        amount=amount
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'new_balance': current_user.balance
    })

@app.route('/transactions')
@login_required
def get_transactions():
    transactions = Transaction.query.filter(
        (Transaction.sender_id == current_user.id) | 
        (Transaction.recipient_id == current_user.id)
    ).order_by(Transaction.timestamp.desc()).limit(50).all()
    
    transactions_data = []
    for t in transactions:
        transactions_data.append({
            'id': t.id,
            'sender': t.sender.username,
            'recipient': t.recipient.username,
            'amount': t.amount,
            'timestamp': t.timestamp.isoformat(),
            'type': 'outgoing' if t.sender_id == current_user.id else 'incoming'
        })
    
    return jsonify(transactions_data)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

# API для работы с коинами
@app.route('/add_coins', methods=['POST'])
@login_required
def add_coins():
    amount = int(request.form.get('amount', 0))
    current_user.balance += amount
    db.session.commit()
    return jsonify({
        'success': True,
        'new_balance': current_user.balance
    })
# ... (ваш существующий код) ...

# Добавьте эти новые модели
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    amount = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Добавьте поле balance в модель User (если его нет)
if 'balance' not in [column.name for column in User.__table__.columns]:
    User.balance = db.Column(db.Integer, default=100)
    db.create_all()  # Обновит структуру БД

# Новые маршруты
@app.route('/wallet')
@login_required
def wallet():
    return render_template('wallet.html')

@app.route('/transfer', methods=['POST'])
@login_required
def transfer():
    data = request.get_json()
    recipient = data.get('recipient')
    amount = int(data.get('amount', 0))
    
    if current_user.username == recipient:
        return jsonify({'error': 'Нельзя переводить себе!'}), 400
    
    recipient_user = User.query.filter_by(username=recipient).first()
    if not recipient_user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if current_user.balance < amount:
        return jsonify({'error': 'Недостаточно средств'}), 400
    
    current_user.balance -= amount
    recipient_user.balance += amount
    
    transaction = Transaction(
        sender_id=current_user.id,
        recipient_id=recipient_user.id,
        amount=amount
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({'success': True, 'new_balance': current_user.balance})

@app.route('/transactions')
@login_required
def transactions():
    txs = Transaction.query.filter(
        (Transaction.sender_id == current_user.id) | 
        (Transaction.recipient_id == current_user.id)
    ).order_by(Transaction.timestamp.desc()).all()
    
    return jsonify([{
        'sender': tx.sender.username,
        'recipient': tx.recipient.username,
        'amount': tx.amount,
        'timestamp': tx.timestamp.isoformat()
    } for tx in txs])

# ... (ваш существующий код) ...

if __name__ == '__main__':
    app.run(debug=True)
