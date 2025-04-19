document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transfer-form');
    const resultDiv = document.getElementById('transfer-result');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recipient = document.getElementById('recipient').value;
        const amount = parseInt(document.getElementById('amount').value);

        try {
            const response = await fetch('/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient, amount })
            });
            
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
            } else {
                updateBalance(data.new_balance);
                showSuccess(`Перевод успешен! Новый баланс: ${data.new_balance}`);
                form.reset();
                loadTransactions();
            }
        } catch (error) {
            showError('Ошибка сети');
        }
    });

    async function loadTransactions() {
        const response = await fetch('/transactions');
        const transactions = await response.json();
        const tbody = document.getElementById('transactions-list');
        
        tbody.innerHTML = transactions.map(tx => `
            <tr class="${tx.sender === '{{ current_user.username }}' ? 'outgoing' : 'incoming'}">
                <td>${tx.sender === '{{ current_user.username }}' ? 'Отправлено' : 'Получено'}</td>
                <td>${tx.sender === '{{ current_user.username }}' ? tx.recipient : tx.sender}</td>
                <td>${tx.amount}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    function updateBalance(newBalance) {
        document.querySelector('.balance').textContent = newBalance;
    }

    function showError(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
    }

    function showSuccess(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'green';
    }

    // Первоначальная загрузка
    loadTransactions();
});
