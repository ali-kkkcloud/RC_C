// File Name: js/supabase-config.js

// Supabase Configuration - FIXED VERSION
const SUPABASE_URL = 'https://sizbhnyyyvbkuarulcmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpemJobnl5eXZia3VhcnVsY216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjcxMzQsImV4cCI6MjA3MDQwMzEzNH0.T67uwBYJp6AbaDB1CwbXh18GjvW9KwPBuyoOhniMaF0';

// Initialize Supabase client - CORRECTED
let supabaseClient = null;

try {
    // Check if supabase is available globally
    if (typeof window !== 'undefined' && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase library not loaded');
    }
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
}

// Global variables
let currentUser = null;
let userRole = null;

// Database table names
const TABLES = {
    EMPLOYEES: 'employees',
    ATTENDANCE: 'attendance',
    TASKS: 'tasks',
    TRAINING: 'training',
    TRAINING_PROGRESS: 'training_progress',
    SHIFTS: 'shifts',
    SETTINGS: 'settings'
};

// Utility functions with error handling
async function getCurrentUser() {
    try {
        if (!supabaseClient) {
            console.warn('Supabase client not initialized');
            return null;
        }
        
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return null;
    }
}

async function signOut() {
    try {
        if (!supabaseClient) {
            // Fallback: clear localStorage and redirect
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
            localStorage.removeItem('rememberLogin');
            window.location.href = 'index.html';
            return null;
        }

        const { error } = await supabaseClient.auth.signOut();
        
        // Clear localStorage regardless of API result
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        localStorage.removeItem('rememberLogin');
        
        if (!error) {
            window.location.href = 'index.html';
        }
        
        return error;
    } catch (error) {
        console.error('Error during sign out:', error);
        // Force logout even if API fails
        localStorage.clear();
        window.location.href = 'index.html';
        return error;
    }
}

// Enhanced authentication check
async function checkAuth() {
    try {
        // Check localStorage first (for demo accounts)
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.isDemo) {
                return true; // Demo account, allow access
            }
        }

        // Check real authentication
        const user = await getCurrentUser();
        if (!user) {
            // Not authenticated, redirect to login
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to login for safety
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return false;
    }
}

// Improved date formatting
function formatDate(date, format = 'short') {
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            },
            time: { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            }
        };

        return dateObj.toLocaleDateString('en-US', options[format] || options.short);
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

// Enhanced time formatting
function formatTime(date) {
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return '--:--';
        }
        
        return dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Time formatting error:', error);
        return '--:--';
    }
}

// Improved notification system
function showNotification(message, type = 'success', duration = 5000) {
    try {
        // Remove existing notifications to prevent spam
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            if (notif.parentElement) {
                notif.remove();
            }
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);

        return notification;
    } catch (error) {
        console.error('Notification error:', error);
        // Fallback to console log
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Database connection test
async function testDatabaseConnection() {
    try {
        if (!supabaseClient) {
            return { connected: false, error: 'Client not initialized' };
        }

        // Simple query to test connection
        const { data, error } = await supabaseClient
            .from('employees')
            .select('count')
            .limit(1);

        if (error) {
            return { connected: false, error: error.message };
        }

        return { connected: true, data };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

// Export for global access
window.supabase = supabaseClient;
window.TABLES = TABLES;
window.getCurrentUser = getCurrentUser;
window.signOut = signOut;
window.checkAuth = checkAuth;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.showNotification = showNotification;
window.testDatabaseConnection = testDatabaseConnection;

// Initialize connection test on load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Supabase Config Loaded Successfully');
    
    // Test database connection
    const connectionTest = await testDatabaseConnection();
    if (connectionTest.connected) {
        console.log('✅ Database connection successful');
    } else {
        console.warn('⚠️ Database connection failed:', connectionTest.error);
    }
});

// Handle beforeunload for cleanup
window.addEventListener('beforeunload', () => {
    // Clean up any pending operations
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notif => notif.remove());
});
