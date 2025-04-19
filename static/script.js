let currentUser = null;
let isMining = false;

// Tab system
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Show corresponding form
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    
    if (!username || !password) {
        showAlert('Please enter both username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            // Switch to login tab
            document.querySelector('.tab-btn[data-tab="login"]').click();
        } else {
            showAlert(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Network error - please try again', 'error');
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!username || !password) {
        showAlert('Please enter both username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = username;
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('mining-section').style.display = 'block';
            document.getElementById('username-display').textContent = username;
            updateBlockchainInfo();
            updateBalance();
        } else {
            showAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Network error - please try again', 'error');
    }
}

async function mineBlock() {
    if (!currentUser || isMining) return;
    
    isMining = true;
    const mineBtn = document.getElementById('mine-button');
    const miningAnimation = document.getElementById('mining-animation');
    const progressBar = document.getElementById('progress-bar');
    const miningHash = document.getElementById('mining-hash');
    
    // Show mining animation
    miningAnimation.style.display = 'block';
    mineBtn.innerHTML = '<span class="mine-icon">⛏️</span><span class="mine-text">Mining...</span>';
    mineBtn.classList.add('mining');
    
    // Animate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        progressBar.style.width = `${progress}%`;
        
        // Generate random hash for visual effect
        miningHash.textContent = generateRandomHash();
    }, 200);
    
    try {
        const response = await fetch('/mine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: currentUser }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Complete animation
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                miningAnimation.style.display = 'none';
                progressBar.style.width = '0';
                
                // Show success
                showAlert(`Block #${data.block.index} mined! Reward: 1 coin`, 'success');
                
                // Update UI
                updateBlockchainInfo();
                updateBalance();
                
                // Reset mining button
                mineBtn.innerHTML = '<span class="mine-icon">⛏️</span><span class="mine-text">Mine Block</span>';
                mineBtn.classList.remove('mining');
                isMining = false;
            }, 500);
        } else {
            clearInterval(progressInterval);
            miningAnimation.style.display = 'none';
            progressBar.style.width = '0';
            mineBtn.innerHTML = '<span class="mine-icon">⛏️</span><span class="mine-text">Mine Block</span>';
            mineBtn.classList.remove('mining');
            isMining = false;
            showAlert(data.error || 'Mining failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        clearInterval(progressInterval);
        miningAnimation.style.display = 'none';
        progressBar.style.width = '0';
        mineBtn.innerHTML = '<span class="mine-icon">⛏️</span><span class="mine-text">Mine Block</span>';
        mineBtn.classList.remove('mining');
        isMining = false;
        showAlert('Network error - please try again', 'error');
    }
}

function generateRandomHash() {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

async function updateBlockchainInfo() {
    try {
        const response = await fetch('/chain');
        const data = await response.json();
        
        document.getElementById('block-count').textContent = data.length;
        
        const blocksContainer = document.getElementById('blocks-container');
        blocksContainer.innerHTML = '';
        
        // Show blocks in reverse order (newest first)
        data.chain.slice().reverse().forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block animate__animated animate__fadeIn';
            blockElement.innerHTML = `
                <div class="block-header">
                    <span class="block-number">Block #${block.index}</span>
                    <span class="block-time">${formatTimestamp(block.timestamp)}</span>
                </div>
                <div class="block-hash" title="${block.hash}">${block.hash.substring(0, 16)}...</div>
                <div class="block-data">${block.data}</div>
            `;
            blocksContainer.appendChild(blockElement);
        });
    } catch (error) {
        console.error('Error updating blockchain:', error);
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
}

async function updateBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/balance/${currentUser}`);
        const data = await response.json();
        
        if (response.ok) {
            const balanceElement = document.getElementById('balance');
            balanceElement.textContent = data.balance;
            
            // Add animation
            balanceElement.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                balanceElement.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
        }
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

function logout() {
    currentUser = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('mining-section').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.querySelector('.tab-btn[data-tab="login"]').click();
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} animate__animated animate__fadeInDown`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('animate__fadeOutUp');
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 3000);
}

// Add some styles for alerts
const style = document.createElement('style');
style.textContent = `
    .alert {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    
    .alert-success {
        background-color: var(--success);
    }
    
    .alert-error {
        background-color: var(--danger);
    }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add any initialization code here
});