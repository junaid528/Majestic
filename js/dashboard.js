// dashboard.js - Logic for User and Admin Dashboards

document.addEventListener('DOMContentLoaded', () => {
    
    // Check authentication and fetch data
    const checkAuth = async () => {
        try {
            const res = await fetch('/api/me');
            if (!res.ok) {
                window.location.href = 'login.html';
                return;
            }
            const data = await res.json();
            
            // Populate common fields if they exist
            const userNameDisplay = document.getElementById('userNameDisplay');
            const userRoleDisplay = document.getElementById('userRoleDisplay');
            
            if (userNameDisplay) userNameDisplay.textContent = data.user.name;
            if (userRoleDisplay) {
                userRoleDisplay.textContent = data.user.role === 'admin' ? 'Administrator' : `Student (${data.user.class || 'N/A'})`;
            }

            // If on admin panel, but not an admin, redirect
            if (window.location.pathname.includes('admin-dashboard') && data.user.role !== 'admin') {
                window.location.href = 'dashboard.html';
            }

        } catch (err) {
            console.error('Auth check failed:', err);
            window.location.href = 'login.html';
        }
    };

    checkAuth();

    // Logout handling
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = 'login.html';
            } catch (err) {
                // Fallback for simple GET logout if POST fails
                window.location.href = '/api/logout';
            }
        });
    }

    // Sidebar Toggle for Mobile
    const hamburger = document.querySelector('.hamburger');
    const sideNav = document.querySelector('.side-nav');
    
    if (hamburger && sideNav) {
        hamburger.addEventListener('click', () => {
            sideNav.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

});

// Admin Specific functions (exposed globally for HTML onclicks)
let allUsers = [];

window.fetchUsers = async () => {
    try {
        const res = await fetch('/api/users');
        if (res.ok) {
            allUsers = await res.json();
            renderUsers(allUsers);
        }
    } catch (err) {
        console.error('Failed to fetch users:', err);
    }
};

window.renderUsers = (users) => {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.id}</td>
            <td class="font-bold">${user.name || '-'}</td>
            <td>${user.class || 'N/A'}</td>
            <td>${user.parentName || 'N/A'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td><span class="user-role">${user.role}</span></td>
            <td>
                <div class="flex gap-2">
                    <button class="action-btn edit-btn" onclick='openEditModal(${JSON.stringify(user).replace(/'/g, "\\'")})'><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.deleteUser = async (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
    }
};
