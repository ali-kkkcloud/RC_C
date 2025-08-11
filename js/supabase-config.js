// File Name: js/supabase-config.js

// Supabase Configuration
const SUPABASE_URL = 'https://sizbhnyyyvbkuarulcmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpemJobnl5eXZia3VhcnVsY216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjcxMzQsImV4cCI6MjA3MDQwMzEzNH0.T67uwBYJp6AbaDB1CwbXh18GjvW9KwPBuyoOhniMaF0';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
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

// Common functions
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    }
    return error;
}

// Check if user is authenticated
async function checkAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Format date function
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time function
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

console.log('Supabase Config Loaded Successfully');
