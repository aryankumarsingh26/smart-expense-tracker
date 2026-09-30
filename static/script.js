// =====================================
// SMART EXPENSE TRACKER
// FRONTEND JAVASCRIPT
// =====================================


// =====================================
// FORMAT TRANSACTION DATE
// =====================================

function formatTransactionDate(dateString) {

    if (!dateString) {
        return "Date unavailable";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

        hour12: true

    });
}


// =====================================
// LOAD DASHBOARD
// =====================================

async function loadDashboard() {

    try {

        const response =
            await fetch("/api/stats");

        if (!response.ok) {
            throw new Error("Failed to load dashboard");
        }

        const data =
            await response.json();


        // Balance

        document.getElementById("balance").textContent =
            "₹" + Number(data.balance).toFixed(2);


        // Income

        document.getElementById("income").textContent =
            "₹" + Number(data.income).toFixed(2);


        // Expenses

        document.getElementById("expenses").textContent =
            "₹" + Number(data.expenses).toFixed(2);


        // Smart Insights

        generateInsight(data);


    } catch (error) {

        console.error(
            "Error loading dashboard:",
            error
        );

    }
}


// =====================================
// LOAD TRANSACTIONS
// =====================================

async function loadTransactions() {

    try {

        const response =
            await fetch("/api/transactions");


        if (!response.ok) {

            throw new Error(
                "Failed to load transactions"
            );

        }


        const transactions =
            await response.json();


        const list =
            document.getElementById(
                "transactionList"
            );


        // No transactions

        if (transactions.length === 0) {

            list.innerHTML = `
                <p class="empty">
                    No transactions yet.
                </p>
            `;

            return;
        }


        // Create transaction list

        list.innerHTML = transactions.map(
            transaction => {

                const sign =
                    transaction.type === "income"
                        ? "+"
                        : "-";


                const amountClass =
                    transaction.type === "income"
                        ? "income"
                        : "expense";


                return `

                    <div class="transaction">

                        <div class="transaction-info">

                            <span class="transaction-category">
                                ${transaction.category}
                            </span>

                            <span class="transaction-note">
                                ${transaction.note || "No note"}
                            </span>

                            <span class="transaction-date">
                                🕒 ${formatTransactionDate(
                                    transaction.date
                                )}
                            </span>

                        </div>


                        <div>

                            <span
                                class="transaction-amount ${amountClass}"
                            >
                                ${sign}₹${Number(
                                    transaction.amount
                                ).toFixed(2)}
                            </span>


                            <button
                                class="delete-btn"
                                onclick="deleteTransaction(
                                    ${transaction.id}
                                )"
                            >
                                🗑
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");


    } catch (error) {

        console.error(
            "Error loading transactions:",
            error
        );

    }
}


// =====================================
// ADD TRANSACTION
// =====================================

const transactionForm =
    document.getElementById(
        "transactionForm"
    );


if (transactionForm) {

    transactionForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            // Get values

            const amount =
                document.getElementById(
                    "amount"
                ).value;


            const type =
                document.getElementById(
                    "type"
                ).value;


            const category =
                document.getElementById(
                    "category"
                ).value;


            const note =
                document.getElementById(
                    "note"
                ).value;


            // Validate amount

            if (
                amount === "" ||
                Number(amount) <= 0
            ) {

                alert(
                    "Please enter a valid amount."
                );

                return;
            }


            // Send transaction to Flask

            try {

                const response =
                    await fetch(
                        "/api/transactions",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                amount:
                                    Number(amount),

                                type:
                                    type,

                                category:
                                    category,

                                note:
                                    note

                            })

                        }
                    );


                const data =
                    await response.json();


                // Backend error

                if (!response.ok) {

                    alert(
                        data.error ||
                        "Something went wrong."
                    );

                    return;
                }


                // Clear form

                transactionForm.reset();


                // Refresh dashboard

                await loadDashboard();

                await loadTransactions();


            } catch (error) {

                console.error(
                    "Error adding transaction:",
                    error
                );

                alert(
                    "Could not add transaction."
                );

            }

        }
    );

}


// =====================================
// DELETE TRANSACTION
// =====================================

async function deleteTransaction(id) {

    try {

        const response =
            await fetch(
                `/api/transactions/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to delete transaction"
            );

        }


        // Refresh everything

        await loadDashboard();

        await loadTransactions();


    } catch (error) {

        console.error(
            "Error deleting transaction:",
            error
        );

    }
}


// =====================================
// SMART FINANCIAL INSIGHTS
// =====================================

function generateInsight(data) {

    const insight =
        document.getElementById(
            "insight"
        );


    if (!insight) {
        return;
    }


    const income =
        Number(data.income) || 0;


    const expenses =
        Number(data.expenses) || 0;


    const balance =
        Number(data.balance) || 0;


    const categories =
        data.categories || [];


    // =====================================
    // NO TRANSACTIONS
    // =====================================

    if (
        income === 0 &&
        expenses === 0
    ) {

        insight.innerHTML = `

            <div class="insight-empty">

                <div class="insight-icon">
                    💡
                </div>

                <h3>
                    Let's analyze your spending
                </h3>

                <p>
                    Add your income and expenses
                    to receive personalized
                    financial insights.
                </p>

            </div>

        `;

        return;
    }


    // =====================================
    // HIGHEST SPENDING CATEGORY
    // =====================================

    let highestCategory = null;


    if (categories.length > 0) {

        highestCategory =
            categories[0];

    }


    let categoryName = "None";

    let categoryAmount = 0;

    let categoryPercentage = 0;


    if (highestCategory) {

        categoryName =
            highestCategory.category;


        categoryAmount =
            Number(
                highestCategory.total
            );


        categoryPercentage =
            expenses > 0
                ? (
                    categoryAmount /
                    expenses
                ) * 100
                : 0;

    }


    // =====================================
    // EXPENSE RATIO
    // =====================================

    const expenseRatio =
        income > 0
            ? (expenses / income) * 100
            : 0;


    // =====================================
    // FINANCIAL STATUS
    // =====================================

    let status;

    let statusIcon;


    if (
        income === 0 &&
        expenses > 0
    ) {

        status =
            "You have expenses but no income recorded yet.";

        statusIcon = "⚠️";


    } else if (
        expenseRatio >= 80
    ) {

        status =
            "Your spending is getting close to your income.";

        statusIcon = "⚠️";


    } else if (
        expenseRatio >= 60
    ) {

        status =
            "You're using a significant portion of your income.";

        statusIcon = "👀";


    } else {

        status =
            "Your spending is currently below your income.";

        statusIcon = "✅";

    }


    // =====================================
    // SAVING TIP
    // =====================================

    let savingTip;


    if (
        categoryPercentage >= 50
    ) {

        savingTip =
            `Consider reducing your ${categoryName} spending. ` +
            `It makes up more than half of your expenses.`;


    } else if (
        expenseRatio >= 80
    ) {

        savingTip =
            "Try setting a spending limit for your next month.";


    } else if (
        balance > 0
    ) {

        savingTip =
            "You have money left after your recorded expenses. " +
            "Consider saving part of your remaining balance.";


    } else {

        savingTip =
            "Keep tracking your transactions to discover spending patterns.";

    }


    // =====================================
    // CATEGORY BREAKDOWN
    // =====================================

    let categoryHTML = "";


    categories
        .slice(0, 4)
        .forEach(category => {

            const amount =
                Number(category.total);


            const percentage =
                expenses > 0
                    ? (
                        amount /
                        expenses
                    ) * 100
                    : 0;


            categoryHTML += `

                <div class="category-row">

                    <div class="category-header">

                        <span>
                            ${category.category}
                        </span>

                        <span>
                            ₹${amount.toFixed(0)}
                        </span>

                    </div>


                    <div class="category-bar">

                        <div
                            class="category-progress"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </div>

            `;

        });


    // =====================================
    // DISPLAY INSIGHT
    // =====================================

    insight.innerHTML = `

        <div class="insight-main">


            <div class="insight-top">

                <div class="insight-icon">
                    💡
                </div>


                <div>

                    <div class="insight-label">
                        TOP SPENDING CATEGORY
                    </div>


                    <div class="insight-title">
                        ${categoryName}
                    </div>

                </div>

            </div>


            <div class="insight-stat">


                <div>

                    <span class="stat-label">
                        Spent
                    </span>


                    <strong>
                        ₹${categoryAmount.toFixed(2)}
                    </strong>

                </div>


                <div>

                    <span class="stat-label">
                        Share
                    </span>


                    <strong>
                        ${categoryPercentage.toFixed(1)}%
                    </strong>

                </div>

            </div>


            <div class="insight-status">

                <span class="status-icon">
                    ${statusIcon}
                </span>


                <span>
                    ${status}
                </span>

            </div>


            <div class="insight-balance">


                <div>

                    <span>
                        Remaining Balance
                    </span>


                    <strong>
                        ₹${balance.toFixed(2)}
                    </strong>

                </div>


                <div>

                    <span>
                        Spent vs Income
                    </span>


                    <strong>
                        ${expenseRatio.toFixed(1)}%
                    </strong>

                </div>

            </div>


            ${
                categoryHTML
                    ? `

                        <div class="breakdown-title">
                            Spending Breakdown
                        </div>


                        <div class="category-breakdown">

                            ${categoryHTML}

                        </div>

                    `
                    : ""
            }


            <div class="saving-tip">

                <span>
                    💰
                </span>


                <div>

                    <strong>
                        Smart Tip
                    </strong>


                    <p>
                        ${savingTip}
                    </p>

                </div>

            </div>


        </div>

    `;
}


// =====================================
// DARK / LIGHT MODE
// =====================================

const themeToggle =
    document.getElementById(
        "themeToggle"
    );


if (themeToggle) {

    const savedTheme =
        localStorage.getItem(
            "theme"
        );


    // Load saved theme

    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );

        themeToggle.textContent =
            "☀️";


    } else {

        document.body.classList.remove(
            "dark"
        );

        themeToggle.textContent =
            "🌙";

    }


    // Toggle theme

    themeToggle.addEventListener(
        "click",
        function() {

            document.body.classList.toggle(
                "dark"
            );


            const darkMode =
                document.body.classList.contains(
                    "dark"
                );


            if (darkMode) {

                themeToggle.textContent =
                    "☀️";

                localStorage.setItem(
                    "theme",
                    "dark"
                );


            } else {

                themeToggle.textContent =
                    "🌙";

                localStorage.setItem(
                    "theme",
                    "light"
                );

            }

        }
    );

}


// =====================================
// LIVE CLOCK
// =====================================

function updateClock() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {

                hour: "2-digit",

                minute: "2-digit",

                second: "2-digit",

                hour12: true

            }
        );


    const clock =
        document.getElementById(
            "currentTime"
        );


    if (clock) {

        clock.textContent =
            time;

    }

}


// Show immediately

updateClock();


// Update every second

setInterval(
    updateClock,
    1000
);


// =====================================
// BUTTON RIPPLE EFFECT
// =====================================

const addButton =
    document.querySelector(
        "#transactionForm button[type='submit']"
    );


if (addButton) {

    addButton.addEventListener(
        "click",
        function(event) {

            const ripple =
                document.createElement(
                    "span"
                );


            ripple.classList.add(
                "ripple"
            );


            const rect =
                this.getBoundingClientRect();


            const size =
                Math.max(
                    rect.width,
                    rect.height
                );


            ripple.style.width =
                size + "px";


            ripple.style.height =
                size + "px";


            ripple.style.left =
                (
                    event.clientX -
                    rect.left -
                    size / 2
                ) + "px";


            ripple.style.top =
                (
                    event.clientY -
                    rect.top -
                    size / 2
                ) + "px";


            this.appendChild(
                ripple
            );


            setTimeout(
                () => {
                    ripple.remove();
                },
                600
            );

        }
    );

}


// =====================================
// INITIAL LOAD
// =====================================

loadDashboard();

loadTransactions();
