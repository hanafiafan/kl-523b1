/**
 * Main.js — Sidebar navigation, global utilities
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Set active link based on current URL
    const currentPath = window.location.pathname.split('/').pop() || 'input.html';
    document.querySelectorAll('.sidebar-nav a.nav-item').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update data count badge
    updateDataBadge();
});


/**
 * Show loading overlay
 */
function showLoading(text = 'Memproses data...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) {
        overlay.classList.add('active');
        if (loadingText) loadingText.textContent = text;
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Update data count badge in sidebar
 */
function updateDataBadge() {
    const badge = document.getElementById('dataCountBadge');
    if (!badge) return;

    const dataStr = sessionStorage.getItem('kmeansData');
    if (dataStr) {
        const data = JSON.parse(dataStr);
        badge.textContent = data.length;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.style.cssText = 'position:fixed; top:24px; right:24px; z-index:9999; max-width:400px; box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    
    const iconMap = {
        'info': 'info',
        'success': 'check-circle',
        'warning': 'alert-triangle',
        'error': 'alert-circle'
    };
    
    toast.innerHTML = `
        <i data-lucide="${iconMap[type] || 'info'}" width="18" height="18"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Cluster color palette
 */
const CLUSTER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
];

const CLUSTER_COLORS_RGBA = [
    'rgba(59,130,246,0.6)', 'rgba(16,185,129,0.6)', 'rgba(245,158,11,0.6)', 'rgba(239,68,68,0.6)',
    'rgba(139,92,246,0.6)', 'rgba(236,72,153,0.6)', 'rgba(6,182,212,0.6)', 'rgba(249,115,22,0.6)'
];

const CLUSTER_NAMES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];
