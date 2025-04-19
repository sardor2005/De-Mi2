document.addEventListener('DOMContentLoaded', function() {
    // Загрузка истории транзакций
    loadTransactions();
    
    // Обработка формы перевода
    document.getElementById('transfer-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const recipient = document.getElementById('recipient').value;
        const amount = parseInt(document.getElementById('amount').value);
        const resultDiv = document.getElementById('transfer-result');
        
        if (!recipient || !amount) {
            resultDiv.textContent = "Заполните все поля!";
            resultDiv.style.color = "red";
            return;
        }
        
        try {
            const response = await fetch('/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient, amount })
            });
            
            const data = await response.json();
            
            if (data.error) {
                resultDiv.textContent = `Ошибка: ${data.error}`;
                resultDiv.style.color = "red";
            } else {
                resultDiv.textContent = `✅ Успешно! Новый баланс: ${data.new_balance} коинов`;
                resultDiv.style.color = "green";
                
                // Обновляем баланс на странице
                document.querySelector('.balance').textContent = data.new_balance;
                
                // Очищаем форму
                e.target.reset();
                
                // Обновляем историю транзакций
                loadTransactions();
            }
        } catch (error) {
            resultDiv.textContent = `Ошибка сети: ${error.message}`;
            resultDiv.style.color = "red";
        }
    });
});

async function loadTransactions() {
    try {
        const response = await fetch('/transactions');
        const transactions = await response.json();
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.className = tx.sender === currentUser ? 'outgoing' : 'incoming';
            
            row.innerHTML = `
                <td>${tx.sender === currentUser ? '➡️ Отправлено' : '⬅️ Получено'}</td>
                <td>${tx.sender === currentUser ? tx.recipient : tx.sender}</td>
                <td>${tx.amount}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            `;
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
    }
}
