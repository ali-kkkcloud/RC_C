// File Name: js/utils.js
// Utility Functions - FIXED VERSION

// Date and Time Utilities
class DateTimeUtils {
    static formatDate(date, format = 'YYYY-MM-DD') {
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return 'Invalid Date';
            }

            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');

            const formats = {
                'YYYY-MM-DD': `${year}-${month}-${day}`,
                'MM/DD/YYYY': `${month}/${day}/${year}`,
                'DD/MM/YYYY': `${day}/${month}/${year}`,
                'short': dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                'long': dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                }),
                'relative': this.getRelativeDate(dateObj)
            };

            return formats[format] || formats['YYYY-MM-DD'];
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid Date';
        }
    }

    static formatTime(date, format = '12h') {
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return '--:--';
            }

            if (format === '24h') {
                return dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
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

    static getRelativeDate(date) {
        try {
            const now = new Date();
            const targetDate = new Date(date);
            const diffInSeconds = Math.floor((now - targetDate) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
            
            return this.formatDate(date, 'short');
        } catch (error) {
            console.error('Relative date error:', error);
            return 'Unknown';
        }
    }

    static addDays(date, days) {
        try {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        } catch (error) {
            console.error('Add days error:', error);
            return new Date();
        }
    }

    static isToday(date) {
        try {
            const today = new Date();
            const compareDate = new Date(date);
            return today.toDateString() === compareDate.toDateString();
        } catch (error) {
            return false;
        }
    }

    static isThisWeek(date) {
        try {
            const today = new Date();
            const compareDate = new Date(date);
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
            
            return compareDate >= startOfWeek && compareDate <= endOfWeek;
        } catch (error) {
            return false;
        }
    }

    static getWeekDays(date = new Date()) {
        try {
            const week = [];
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                week.push(day);
            }
            
            return week;
        } catch (error) {
            console.error('Get week days error:', error);
            return [];
        }
    }
}

// String Utilities
class StringUtils {
    static capitalize(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static titleCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    static getInitials(name) {
        if (!name || typeof name !== 'string') return 'U';
        
        return name
            .trim()
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    static truncate(str, length = 50) {
        if (!str || typeof str !== 'string') return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    }

    static slugify(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }

    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static escapeHtml(str) {
        if (!str || typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Number Utilities
class NumberUtils {
    static formatCurrency(amount, currency = 'USD') {
        try {
            const num = parseFloat(amount);
            if (isNaN(num)) return '$0.00';
            
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(num);
        } catch (error) {
            console.error('Currency formatting error:', error);
            return '$0.00';
        }
    }

    static formatPercent(value, decimals = 1) {
        try {
            const num = parseFloat(value);
            if (isNaN(num)) return '0%';
            return `${(num * 100).toFixed(decimals)}%`;
        } catch (error) {
            return '0%';
        }
    }

    static formatNumber(num) {
        try {
            const number = parseFloat(num);
            if (isNaN(number)) return '0';
            return new Intl.NumberFormat('en-US').format(number);
        } catch (error) {
            return '0';
        }
    }

    static calculatePercentage(value, total) {
        try {
            const val = parseFloat(value);
            const tot = parseFloat(total);
            if (isNaN(val) || isNaN(tot) || tot === 0) return 0;
            return (val / tot) * 100;
        } catch (error) {
            return 0;
        }
    }

    static roundToDecimal(num, decimals = 2) {
        try {
            const number = parseFloat(num);
            if (isNaN(number)) return 0;
            return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
        } catch (error) {
            return 0;
        }
    }
}

// Array Utilities
class ArrayUtils {
    static groupBy(array, key) {
        if (!Array.isArray(array)) return {};
        
        return array.reduce((groups, item) => {
            const value = item && typeof item === 'object' ? item[key] : null;
            const groupKey = value || 'undefined';
            groups[groupKey] = groups[groupKey] || [];
            groups[groupKey].push(item);
            return groups;
        }, {});
    }

    static sortBy(array, key, order = 'asc') {
        if (!Array.isArray(array)) return [];
        
        return [...array].sort((a, b) => {
            const aVal = a && typeof a === 'object' ? a[key] : a;
            const bVal = b && typeof b === 'object' ? b[key] : b;
            
            if (order === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    }

    static unique(array) {
        if (!Array.isArray(array)) return [];
        return [...new Set(array)];
    }

    static shuffle(array) {
        if (!Array.isArray(array)) return [];
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static chunk(array, size) {
        if (!Array.isArray(array) || size <= 0) return [];
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static findById(array, id) {
        if (!Array.isArray(array)) return null;
        return array.find(item => item && item.id === id) || null;
    }

    static removeById(array, id) {
        if (!Array.isArray(array)) return [];
        return array.filter(item => item && item.id !== id);
    }
}

// Validation Utilities
class ValidationUtils {
    static isEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    static isStrongPassword(password) {
        if (!password || typeof password !== 'string') return false;
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }

    static isEmpty(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
    }

    static isNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    }

    static isDate(value) {
        return value instanceof Date && !isNaN(value);
    }

    static isUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// Storage Utilities with Error Handling
class StorageUtils {
    static setLocal(key, value) {
        try {
            if (!key) {
                console.warn('Storage key is required');
                return false;
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    static getLocal(key, defaultValue = null) {
        try {
            if (!key) {
                console.warn('Storage key is required');
                return defaultValue;
            }
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    static removeLocal(key) {
        try {
            if (!key) {
                console.warn('Storage key is required');
                return false;
            }
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
            if (!key) {
                console.warn('Storage key is required');
                return false;
            }
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to sessionStorage:', error);
            return false;
        }
    }

    static getSession(key, defaultValue = null) {
        try {
            if (!key) {
                console.warn('Storage key is required');
                return defaultValue;
            }
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from sessionStorage:', error);
            return defaultValue;
        }
    }

    static getStorageSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length;
                }
            }
            return total;
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return 0;
        }
    }
}

// DOM Utilities with Error Handling
class DOMUtils {
    static $(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('DOM query error:', error);
            return null;
        }
    }

    static $$(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            console.error('DOM query error:', error);
            return [];
        }
    }

    static createElement(tag, attributes = {}, children = []) {
        try {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = StringUtils.escapeHtml(value);
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
            
            return element;
        } catch (error) {
            console.error('Create element error:', error);
            return document.createElement('div');
        }
    }

    static show(element) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element) {
                element.style.display = 'block';
                element.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Show element error:', error);
        }
    }

    static hide(element) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element) {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        } catch (error) {
            console.error('Hide element error:', error);
        }
    }

    static toggle(element) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element) {
                const isHidden = element.style.display === 'none' || 
                               element.classList.contains('hidden');
                if (isHidden) {
                    this.show(element);
                } else {
                    this.hide(element);
                }
            }
        } catch (error) {
            console.error('Toggle element error:', error);
        }
    }

    static addClass(element, className) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element && className) {
                element.classList.add(className);
            }
        } catch (error) {
            console.error('Add class error:', error);
        }
    }

    static removeClass(element, className) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element && className) {
                element.classList.remove(className);
            }
        } catch (error) {
            console.error('Remove class error:', error);
        }
    }
}

// UI Utilities
class UIUtils {
    static showLoading(message = 'Loading...') {
        try {
            let overlay = document.getElementById('loadingOverlay');
            if (!overlay) {
                overlay = DOMUtils.createElement('div', {
                    id: 'loadingOverlay',
                    className: 'loading-overlay'
                });
                document.body.appendChild(overlay);
            }
            
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>${StringUtils.escapeHtml(message)}</p>
                </div>
            `;
            overlay.style.display = 'flex';
        } catch (error) {
            console.error('Show loading error:', error);
        }
    }

    static hideLoading() {
        try {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Hide loading error:', error);
        }
    }

    static showModal(content, title = 'Modal') {
        try {
            const modal = DOMUtils.createElement('div', {
                className: 'modal-overlay'
            });
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${StringUtils.escapeHtml(title)}</h3>
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
            
            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
            
            return modal;
        } catch (error) {
            console.error('Show modal error:', error);
            return null;
        }
    }

    static confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            try {
                const modal = UIUtils.showModal(`
                    <p>${StringUtils.escapeHtml(message)}</p>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); window.modalResolve(false);">Cancel</button>
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); window.modalResolve(true);">Confirm</button>
                    </div>
                `, title);
                
                window.modalResolve = resolve;
            } catch (error) {
                console.error('Confirm dialog error:', error);
                resolve(false);
            }
        });
    }

    static alert(message, title = 'Alert', type = 'info') {
        try {
            const iconMap = {
                info: 'fa-info-circle',
                success: 'fa-check-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-times-circle'
            };
            
            return UIUtils.showModal(`
                <div class="alert-content">
                    <i class="fas ${iconMap[type]} alert-icon ${type}"></i>
                    <p>${StringUtils.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();">OK</button>
                </div>
            `, title);
        } catch (error) {
            console.error('Alert dialog error:', error);
        }
    }
}

// Debounce function for performance
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

// Download file utility
function downloadFile(content, filename, contentType = 'text/plain') {
    try {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('Download file error:', error);
        return false;
    }
}

// Copy to clipboard utility
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            textArea.remove();
            return result;
        }
    } catch (error) {
        console.error('Copy to clipboard error:', error);
        return false;
    }
}

// Global exports
window.DateTimeUtils = DateTimeUtils;
window.StringUtils = StringUtils;
window.NumberUtils = NumberUtils;
window.ArrayUtils = ArrayUtils;
window.ValidationUtils = ValidationUtils;
window.StorageUtils = StorageUtils;
window.DOMUtils = DOMUtils;
window.UIUtils = UIUtils;
window.debounce = debounce;
window.throttle = throttle;
window.downloadFile = downloadFile;
window.copyToClipboard = copyToClipboard;

console.log('Utility functions loaded successfully');
