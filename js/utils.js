// File Name: js/utils.js

// Utility Functions for Employee Management System

// Date and Time Utilities
class DateTimeUtils {
    static formatDate(date, format = 'DD/MM/YYYY') {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        
        switch(format) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'long':
                return d.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'short':
                return d.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            default:
                return `${day}/${month}/${year}`;
        }
    }

    static formatTime(date, format = '12') {
        const d = new Date(date);
        
        if (format === '24') {
            return d.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return d.toLocaleTimeString('en-US', { 
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static getTimeDifference(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diff = end - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            hours,
            minutes,
            total: diff,
            formatted: `${hours}h ${minutes}m`
        };
    }

    static isToday(date) {
        const today = new Date();
        const compareDate = new Date(date);
        
        return today.toDateString() === compareDate.toDateString();
    }

    static isThisWeek(date) {
        const today = new Date();
        const compareDate = new Date(date);
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        
        return compareDate >= startOfWeek && compareDate <= endOfWeek;
    }

    static getWeekDays(date = new Date()) {
        const week = [];
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            week.push(day);
        }
        
        return week;
    }
}

// String Utilities
class StringUtils {
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    static getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    static truncate(str, length = 50) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    }

    static slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }

    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Number Utilities
class NumberUtils {
    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatPercent(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    }

    static formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    static calculatePercentage(value, total) {
        return total === 0 ? 0 : (value / total) * 100;
    }

    static roundToDecimal(num, decimals = 2) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}

// Array Utilities
class ArrayUtils {
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const value = item[key];
            groups[value] = groups[value] || [];
            groups[value].push(item);
            return groups;
        }, {});
    }

    static sortBy(array, key, order = 'asc') {
        return array.sort((a, b) => {
            if (order === 'desc') {
                return b[key] > a[key] ? 1 : -1;
            }
            return a[key] > b[key] ? 1 : -1;
        });
    }

    static unique(array) {
        return [...new Set(array)];
    }

    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

// Validation Utilities
class ValidationUtils {
    static isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    static isStrongPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }

    static isEmpty(value) {
        return value === null || value === undefined || value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    }

    static isNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    }

    static isDate(value) {
        return value instanceof Date && !isNaN(value);
    }
}

// Storage Utilities
class StorageUtils {
    static setLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    static getLocal(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    static removeLocal(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    static clearLocal() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    static setSession(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to sessionStorage:', error);
            return false;
        }
    }

    static getSession(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from sessionStorage:', error);
            return defaultValue;
        }
    }
}

// DOM Utilities
class DOMUtils {
    static $(selector) {
        return document.querySelector(selector);
    }

    static $$(selector) {
        return document.querySelectorAll(selector);
    }

    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    static show(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.style.display = 'block';
    }

    static hide(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.style.display = 'none';
    }

    static toggle(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    static addClass(element, className) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.classList.add(className);
    }

    static removeClass(element, className) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.classList.remove(className);
    }

    static toggleClass(element, className) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) element.classList.toggle(className);
    }
}

// Loading and UI Utilities
class UIUtils {
    static showLoading(message = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="spinner"></div>
                <p>${message}</p>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('show');
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    static showModal(content, title = 'Modal') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }

    static confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modal = UIUtils.showModal(`
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); window.modalResolve(false);">Cancel</button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); window.modalResolve(true);">Confirm</button>
                </div>
            `, title);
            
            window.modalResolve = resolve;
        });
    }

    static alert(message, title = 'Alert', type = 'info') {
        const iconMap = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        return UIUtils.showModal(`
            <div class="alert-content">
                <i class="fas ${iconMap[type]} alert-icon ${type}"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();">OK</button>
            </div>
        `, title);
    }
}

// Export utilities (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DateTimeUtils,
        StringUtils,
        NumberUtils,
        ArrayUtils,
        ValidationUtils,
        StorageUtils,
        DOMUtils,
        UIUtils
    };
}

// Make utilities available globally
window.DateTimeUtils = DateTimeUtils;
window.StringUtils = StringUtils;
window.NumberUtils = NumberUtils;
window.ArrayUtils = ArrayUtils;
window.ValidationUtils = ValidationUtils;
window.StorageUtils = StorageUtils;
window.DOMUtils = DOMUtils;
window.UIUtils = UIUtils;

// Shorthand aliases
window.$ = DOMUtils.$;
window.$$ = DOMUtils.$$;

// Enhanced notification system
function showNotification(message, type = 'success', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${iconMap[type]}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
    
    return notification;
}

// Progress bar utility
function showProgress(percentage, element = null) {
    if (!element) {
        element = document.querySelector('.progress-bar') || document.createElement('div');
        element.className = 'progress-bar';
        document.body.appendChild(element);
    }
    
    element.innerHTML = `
        <div class="progress-fill" style="width: ${percentage}%"></div>
        <span class="progress-text">${Math.round(percentage)}%</span>
    `;
}

// Debounce function
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        showNotification('Failed to copy to clipboard', 'error');
        return false;
    }
}

// Download file
function downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate random color
function generateColor() {
    const colors = [
        '#4F46E5', '#10B981', '#EF4444', '#F59E0B', 
        '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

console.log('Utils module loaded successfully');
