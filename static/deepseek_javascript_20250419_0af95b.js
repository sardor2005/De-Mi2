document.addEventListener('DOMContentLoaded', () => {
    const transferForm = document.getElementById('transfer-form');
    const resultDiv = document.getElementById('transfer-result');
    
    transferForm.addEventListener('submit', async (e) => {
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
                resultDiv.textContent = data.error;
                resultDiv.style.color = 'red';
            } else {
                resultDiv.textContent = `Успешно! Новый баланс: ${data.new_balance}`;
                resultDiv.style.color = 'green';
                document.querySelector('.balance').textContent = data.new_balance;
                transferForm.reset();
                loadTransactions();
            }
        } catch (err) {
            resultDiv.textContent = 'Ошибка сети';
            resultDiv.style.color = 'red';
        }
    });
    
    async function loadTransactions() {
        const response = await fetch('/transactions');
        const transactions = await response.json();
        const tbody = document.getElementById('transactions-list');
        
        tbody.innerHTML = transactions.map(tx => `
            <tr class="${tx.sender === '{{ current_user.username }}' ? 'outgoing' : 'incoming'}">
                <td>${tx.sender === '{{ current_user.username }}' ? '➡️ Отправлено' : '⬅️ Получено'}</td>
                <td>${tx.sender === '{{ current_user.username }}' ? tx.recipient : tx.sender}</td>
                <td>${tx.amount}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    }
    
    loadTransactions();
});