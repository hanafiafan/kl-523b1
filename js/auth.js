/**
 * auth.js
 * Handles Login and Register UI logic
 */

let authMode = 'login'; // 'login' or 'register'

function switchTab(mode) {
    authMode = mode;
    
    document.getElementById('tabLogin').className = 'auth-tab ' + (mode === 'login' ? 'active' : '');
    document.getElementById('tabRegister').className = 'auth-tab ' + (mode === 'register' ? 'active' : '');
    
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    
    if (mode === 'login') {
        btnText.textContent = 'Sign In';
        btnIcon.setAttribute('data-lucide', 'log-in');
    } else {
        btnText.textContent = 'Create Account';
        btnIcon.setAttribute('data-lucide', 'user-plus');
    }
    
    lucide.createIcons();
}

async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if (!window.isSupabaseConfigured) {
        showToast('Supabase belum dikonfigurasi. Anda tidak bisa login.', 'error');
        return;
    }
    
    showLoading(authMode === 'login' ? 'Signing in...' : 'Creating account...');
    
    try {
        if (authMode === 'login') {
            await window.signIn(email, password);
            showToast('Login berhasil!', 'success');
            setTimeout(() => {
                window.location.href = 'input.html';
            }, 1000);
        } else {
            await window.signUp(email, password);
            showToast('Registrasi berhasil! Silakan periksa email Anda jika konfirmasi diaktifkan.', 'success');
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        }
    } catch (error) {
        showToast(error.message || 'Terjadi kesalahan otentikasi', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}
