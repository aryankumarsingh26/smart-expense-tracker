from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
from zoneinfo import ZoneInfo

app = Flask(__name__)

DATABASE = "database.db"


# =====================================
# DATABASE CONNECTION
# =====================================

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# =====================================
# INDIA TIME
# =====================================

def get_india_time():
    return datetime.now(
        ZoneInfo("Asia/Kolkata")
    ).isoformat(timespec="seconds")


# =====================================
# CREATE / UPDATE DATABASE
# =====================================

def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            note TEXT,
            date TEXT,
            user_id TEXT
        )
    """)

    # Check existing columns
    columns = conn.execute(
        "PRAGMA table_info(transactions)"
    ).fetchall()

    column_names = [
        column["name"]
        for column in columns
    ]

    # Add date column if old database doesn't have it
    if "date" not in column_names:

        conn.execute("""
            ALTER TABLE transactions
            ADD COLUMN date TEXT
        """)

        conn.execute("""
            UPDATE transactions
            SET date = ?
            WHERE date IS NULL
        """, (get_india_time(),))


    # Add user_id column if old database doesn't have it
    if "user_id" not in column_names:

        conn.execute("""
            ALTER TABLE transactions
            ADD COLUMN user_id TEXT
        """)

    conn.commit()
    conn.close()


# =====================================
# HOME PAGE
# =====================================

@app.route("/")
def home():
    return render_template("index.html")


# =====================================
# GET TRANSACTIONS
# =====================================

@app.route("/api/transactions", methods=["GET"])
def get_transactions():

    user_id = request.headers.get("X-User-ID")

    if not user_id:
        return jsonify({
            "error": "User ID missing"
        }), 400

    conn = get_db()

    transactions = conn.execute("""
        SELECT *
        FROM transactions
        WHERE user_id = ?
        ORDER BY date DESC, id DESC
    """, (user_id,)).fetchall()

    conn.close()

    return jsonify([
        dict(row)
        for row in transactions
    ])


# =====================================
# ADD TRANSACTION
# =====================================

@app.route("/api/transactions", methods=["POST"])
def add_transaction():

    user_id = request.headers.get("X-User-ID")

    if not user_id:
        return jsonify({
            "error": "User ID missing"
        }), 400

    data = request.get_json()

    amount = data.get("amount")
    transaction_type = data.get("type")
    category = data.get("category")
    note = data.get("note", "")

    if amount is None or not transaction_type or not category:

        return jsonify({
            "error": "Please fill all required fields"
        }), 400

    transaction_date = get_india_time()

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO transactions
        (amount, type, category, note, date, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        amount,
        transaction_type,
        category,
        note,
        transaction_date,
        user_id
    ))

    conn.commit()

    transaction_id = cursor.lastrowid

    conn.close()

    return jsonify({
        "message": "Transaction added successfully",
        "id": transaction_id
    }), 201


# =====================================
# DELETE TRANSACTION
# =====================================

@app.route(
    "/api/transactions/<int:id>",
    methods=["DELETE"]
)
def delete_transaction(id):

    user_id = request.headers.get("X-User-ID")

    if not user_id:
        return jsonify({
            "error": "User ID missing"
        }), 400

    conn = get_db()

    conn.execute("""
        DELETE FROM transactions
        WHERE id = ?
        AND user_id = ?
    """, (id, user_id))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Transaction deleted"
    })


# =====================================
# DASHBOARD STATISTICS
# =====================================

@app.route("/api/stats", methods=["GET"])
def get_stats():

    user_id = request.headers.get("X-User-ID")

    if not user_id:
        return jsonify({
            "error": "User ID missing"
        }), 400

    conn = get_db()

    # Total income
    income = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'income'
        AND user_id = ?
    """, (user_id,)).fetchone()[0]


    # Total expenses
    expenses = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'expense'
        AND user_id = ?
    """, (user_id,)).fetchone()[0]


    # Category-wise expenses
    categories = conn.execute("""
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE type = 'expense'
        AND user_id = ?
        GROUP BY category
        ORDER BY total DESC
    """, (user_id,)).fetchall()

    conn.close()

    return jsonify({

        "income": income,

        "expenses": expenses,

        "balance": income - expenses,

        "categories": [
            dict(row)
            for row in categories
        ]

    })


# =====================================
# INITIALIZE DATABASE
# =====================================

init_db()


# =====================================
# START APPLICATION
# =====================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
