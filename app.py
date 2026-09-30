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
# CREATE / UPDATE DATABASE
# =====================================

def init_db():

    conn = get_db()

    # Create table if it doesn't exist
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            note TEXT,
            date TEXT
        )
    """)

    # Check existing columns
    columns = conn.execute(
        "PRAGMA table_info(transactions)"
    ).fetchall()

    column_names = [column["name"] for column in columns]

    # If old database doesn't have date column,
    # add it without deleting existing transactions
    if "date" not in column_names:

        conn.execute("""
            ALTER TABLE transactions
            ADD COLUMN date TEXT
        """)

        # Give old transactions a date
        current_date = datetime.now(
            ZoneInfo("Asia/Kolkata")
        ).isoformat(timespec="seconds")

        conn.execute("""
            UPDATE transactions
            SET date = ?
            WHERE date IS NULL
        """, (current_date,))

    conn.commit()
    conn.close()


# =====================================
# HOME PAGE
# =====================================

@app.route("/")
def home():
    return render_template("index.html")


# =====================================
# GET ALL TRANSACTIONS
# =====================================

@app.route("/api/transactions", methods=["GET"])
def get_transactions():

    conn = get_db()

    transactions = conn.execute("""
        SELECT *
        FROM transactions
        ORDER BY date DESC, id DESC
    """).fetchall()

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

    data = request.get_json()

    amount = data.get("amount")
    transaction_type = data.get("type")
    category = data.get("category")
    note = data.get("note", "")

    # Validate required fields
    if amount is None or not transaction_type or not category:

        return jsonify({
            "error": "Please fill all required fields"
        }), 400

    # Current date and time
    transaction_date = datetime.now(
        ZoneInfo("Asia/Kolkata")
    ).isoformat(timespec="seconds")

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO transactions
        (amount, type, category, note, date)
        VALUES (?, ?, ?, ?, ?)
    """, (
        amount,
        transaction_type,
        category,
        note,
        transaction_date
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

    conn = get_db()

    conn.execute(
        "DELETE FROM transactions WHERE id = ?",
        (id,)
    )

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

    conn = get_db()

    # Total income
    income = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'income'
    """).fetchone()[0]

    # Total expenses
    expenses = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'expense'
    """).fetchone()[0]

    # Category-wise expenses
    categories = conn.execute("""
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """).fetchall()

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
# START APPLICATION
# =====================================

if __name__ == "__main__":

    init_db()

    app.run(host="0.0.0.0", port=5000, debug=True)
