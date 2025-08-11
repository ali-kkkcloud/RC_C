// File Name: js/notifications.js

// Advanced Notification System

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.settings = {
            position: 'top-right',
            duration: 5000,
            maxNotifications: 5,
            enableSound: true,
            enableDesktop: false
        };
        this.types = {
            success: { icon: 'fas fa-check-circle', color: '#10B981' },
            error: { icon: 'fas fa-times-circle', color: '#EF4444' },
            warning: { icon: 'fas fa-exclamation-triangle', color: '#F59E0B' },
            info: { icon: 'fas fa-info-circle', color: '#06B6D4' }
        };
        
        this.initializeNotifications();
    }

    initializeNotifications() {
        this.createNotificationContainer();
        this.loadSettings();
        this.requestDesktopPermission();
        this.setupEventListeners();
        this.startPeriodicCheck();
    }

    createNotificationContainer() {
        if (document.getElementById('notificationContainer')) return;
        
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = `notification-container ${this.settings.position}`;
        document.body.appendChild(container);
    }

    loadSettings() {
        const savedSettings = StorageUtils.getLocal('notification_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...savedSettings };
        }
    }

    async requestDesktopPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                this.settings.enableDesktop = permission === 'granted';
            } catch (error) {
                console.warn('Desktop notifications not supported:', error);
                this.settings.enableDesktop = false;
            }
        }
    }

    setupEventListeners() {
        // Listen for system events that should trigger notifications
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkMissedNotifications();
            }
        });

        // Listen for custom notification events
        document.addEventListener('systemNotification', (event) => {
            this.show(event.detail.message, event.detail.type, event.detail.options);
        });
    }

    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.addToContainer(notification);
        this.playSound(type);
        
        if (this.settings.enableDesktop && document.visibilityState === 'hidden') {
            this.showDesktopNotification(message, type);
        }

        // Auto remove after duration
        if (options.duration !== 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, options.duration || this.settings.duration);
        }

        return notification.id;
    }

    createNotification(message, type, options) {
        const id = StringUtils.generateId('notif');
        const typeConfig = this.types[type] || this.types.info;
        
        const notification = {
            id,
            message,
            type,
            timestamp: new Date(),
            options: {
                title: options.title || null,
                persistent: options.persistent || false,
                actions: options.actions || [],
                data: options.data || {},
                ...options
            }
        };

        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.setAttribute('data-id', id);
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${typeConfig.icon}"></i>
                </div>
                <div class="notification-body">
                    ${notification.options.title ? `<div class="notification-title">${notification.options.title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                    ${notification.options.actions.length > 0 ? this.renderActions(notification.options.actions, id) : ''}
                </div>
                <button class="notification-close" onclick="notificationManager.remove('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-progress"></div>
        `;

        notification.element = element;
        this.notifications.push(notification);
        
        return notification;
    }

    renderActions(actions, notificationId) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action" onclick="notificationManager.handleAction('${notificationId}', '${action.id}')">
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    addToContainer(notification) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        // Remove excess notifications
        const existing = container.children;
        if (existing.length >= this.settings.maxNotifications) {
            const oldest = existing[0];
            this.remove(oldest.getAttribute('data-id'));
        }

        container.appendChild(notification.element);
        
        // Trigger animation
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });
    }

    remove(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        notification.element.classList.add('hide');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification.id);
        });
    }

    handleAction(notificationId, actionId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        const action = notification.options.actions.find(a => a.id === actionId);
        if (action && action.handler) {
            action.handler(notification.options.data);
        }

        // Remove notification after action
        this.remove(notificationId);
    }

    playSound(type) {
        if (!this.settings.enableSound) return;

        try {
            // Create audio context for different notification sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different notification types
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500
            };

            oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    showDesktopNotification(message, type) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const options = {
            body: message,
            icon: '/assets/logo.png',
            badge: '/assets/logo.png',
            tag: `notification-${type}`,
            requireInteraction: type === 'error'
        };

        const notification = new Notification('Employee Portal', options);
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto close desktop notification
        setTimeout(() => {
            notification.close();
        }, this.settings.duration);
    }

    // Predefined notification types
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 8000 });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { ...options, duration: 6000 });
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // System-specific notifications
    attendanceReminder() {
        this.show('Don\'t forget to check in for your shift!', 'info', {
            title: 'Shift Reminder',
            actions: [{
                id: 'checkin',
                label: 'Check In Now',
                icon: 'fas fa-sign-in-alt',
                handler: () => {
                    if (window.attendanceManager) {
                        window.attendanceManager.checkIn();
                    }
                }
            }]
        });
    }

    taskDeadlineWarning(task) {
        this.show(`Task "${task.title}" is due soon!`, 'warning', {
            title: 'Task Deadline',
            data: { taskId: task.id },
            actions: [{
                id: 'view',
                label: 'View Task',
                handler: (data) => {
                    if (window.viewTaskDetails) {
                        window.viewTaskDetails(data.taskId);
                    }
                }
            }]
        });
    }

    trainingAvailable(course) {
        this.show(`New training course available: "${course.title}"`, 'info', {
            title: 'Training Available',
            data: { courseId: course.id },
            actions: [{
                id: 'start',
                label: 'Start Now',
                icon: 'fas fa-play',
                handler: (data) => {
                    if (window.startCourse) {
                        window.startCourse(data.courseId);
                    }
                }
            }]
        });
    }

    systemMaintenance(maintenanceInfo) {
        this.show('System maintenance scheduled. Please save your work.', 'warning', {
            title: 'Maintenance Alert',
            persistent: true,
            data: maintenanceInfo,
            actions: [{
                id: 'dismiss',
                label: 'Understood',
                handler: () => {
                    console.log('Maintenance notification acknowledged');
                }
            }]
        });
    }

    // Batch notifications for multiple events
    batchNotify(notifications) {
        if (notifications.length === 0) return;

        if (notifications.length === 1) {
            const notif = notifications[0];
            this.show(notif.message, notif.type, notif.options);
            return;
        }

        // Group multiple notifications
        const summary = `You have ${notifications.length} new notifications`;
        this.show(summary, 'info', {
            title: 'Multiple Updates',
            actions: [{
                id: 'viewAll',
                label: 'View All',
                handler: () => {
                    this.showNotificationCenter(notifications);
                }
            }]
        });
    }

    showNotificationCenter(notifications = null) {
        const notificationsToShow = notifications || this.getRecentNotifications();
        
        const modalContent = `
            <div class="notification-center">
                <div class="notification-center-header">
                    <h3>Notification Center</h3>
                    <button class="btn btn-sm btn-outline" onclick="notificationManager.clearAll()">
                        Clear All
                    </button>
                </div>
                <div class="notification-center-body">
                    ${notificationsToShow.length === 0 ? 
                        '<div class="empty-state">No notifications</div>' :
                        notificationsToShow.map(notif => this.renderNotificationItem(notif)).join('')
                    }
                </div>
            </div>
        `;

        UIUtils.showModal(modalContent, 'Notifications');
    }

    renderNotificationItem(notification) {
        const typeConfig = this.types[notification.type];
        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <div class="notification-item-icon ${notification.type}">
                    <i class="${typeConfig.icon}"></i>
                </div>
                <div class="notification-item-content">
                    ${notification.options.title ? `<h4>${notification.options.title}</h4>` : ''}
                    <p>${notification.message}</p>
                    <small>${DateTimeUtils.formatDate(notification.timestamp)} ${DateTimeUtils.formatTime(notification.timestamp)}</small>
                </div>
                <div class="notification-item-actions">
                    <button class="btn-icon" onclick="notificationManager.markAsRead('${notification.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon" onclick="notificationManager.removeStored('${notification.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Notification history management
    saveToHistory(notification) {
        const history = StorageUtils.getLocal('notification_history', []);
        history.unshift({
            ...notification,
            read: false,
            element: null // Don't store DOM element
        });
        
        // Keep only last 50 notifications
        if (history.length > 50) {
            history.splice(50);
        }
        
        StorageUtils.setLocal('notification_history', history);
    }

    getRecentNotifications(limit = 20) {
        return StorageUtils.getLocal('notification_history', []).slice(0, limit);
    }

    markAsRead(id) {
        const history = StorageUtils.getLocal('notification_history', []);
        const notification = history.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            StorageUtils.setLocal('notification_history', history);
        }
        this.updateNotificationBadge();
    }

    removeStored(id) {
        const history = StorageUtils.getLocal('notification_history', []);
        const updatedHistory = history.filter(n => n.id !== id);
        StorageUtils.setLocal('notification_history', updatedHistory);
        this.updateNotificationBadge();
    }

    clearAll() {
        StorageUtils.removeLocal('notification_history');
        this.clear();
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const unreadCount = this.getUnreadCount();
        const badge = document.getElementById('notificationBadge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    getUnreadCount() {
        const history = StorageUtils.getLocal('notification_history', []);
        return history.filter(n => !n.read).length;
    }

    // Periodic checks for new notifications
    startPeriodicCheck() {
        setInterval(() => {
            this.checkForSystemNotifications();
        }, 60000); // Check every minute

        // Check immediately
        setTimeout(() => {
            this.checkForSystemNotifications();
        }, 5000);
    }

    async checkForSystemNotifications() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            // Check for shift reminders
            this.checkShiftReminders();
            
            // Check for task deadlines
            this.checkTaskDeadlines();
            
            // Check for training assignments
            this.checkTrainingAssignments();
            
            // Update badge count
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    checkShiftReminders() {
        const now = new Date();
        const userData = StorageUtils.getLocal('currentUser');
        
        // Mock shift time check
        const shiftStart = new Date();
        shiftStart.setHours(9, 0, 0, 0); // 9 AM
        
        const timeDiff = shiftStart - now;
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        
        // Remind 30 minutes before shift
        if (minutesDiff === 30) {
            this.attendanceReminder();
        }
    }

    checkTaskDeadlines() {
        if (!window.taskManager || !window.taskManager.tasks) return;
        
        const now = new Date();
        const upcomingTasks = window.taskManager.tasks.filter(task => {
            if (task.status === 'completed') return false;
            
            const dueDate = new Date(task.due_date);
            const timeDiff = dueDate - now;
            const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
            
            return hoursDiff <= 24 && hoursDiff > 0; // Due within 24 hours
        });

        upcomingTasks.forEach(task => {
            const lastNotified = StorageUtils.getLocal(`task_deadline_notified_${task.id}`);
            if (!lastNotified || (now - new Date(lastNotified)) > 24 * 60 * 60 * 1000) {
                this.taskDeadlineWarning(task);
                StorageUtils.setLocal(`task_deadline_notified_${task.id}`, now.toISOString());
            }
        });
    }

    checkTrainingAssignments() {
        // Mock training check
        const lastTrainingCheck = StorageUtils.getLocal('last_training_check');
        const now = new Date();
        
        if (!lastTrainingCheck || (now - new Date(lastTrainingCheck)) > 7 * 24 * 60 * 60 * 1000) {
            // Check weekly for new training
            StorageUtils.setLocal('last_training_check', now.toISOString());
        }
    }

    checkMissedNotifications() {
        // Check for notifications that occurred while user was away
        const lastActive = StorageUtils.getLocal('last_active_time');
        if (!lastActive) return;

        const missedTime = new Date() - new Date(lastActive);
        if (missedTime > 5 * 60 * 1000) { // More than 5 minutes away
            this.info('Welcome back! Check for any updates while you were away.', {
                title: 'You were away'
            });
        }
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        StorageUtils.setLocal('notification_settings', this.settings);
        
        // Update container position if changed
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.className = `notification-container ${this.settings.position}`;
        }
    }

    // Export notifications for backup
    exportNotifications() {
        const history = StorageUtils.getLocal('notification_history', []);
        const exportData = {
            timestamp: new Date().toISOString(),
            settings: this.settings,
            notifications: history
        };
        
        const filename = `notifications_export_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
        downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
    }
}

// Global notification manager instance
let notificationManager;

// Initialize notification manager
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
    
    // Store last active time
    StorageUtils.setLocal('last_active_time', new Date().toISOString());
    
    // Update last active time periodically
    setInterval(() => {
        StorageUtils.setLocal('last_active_time', new Date().toISOString());
    }, 30000);
});

// Override global showNotification function to use advanced notification manager
window.showNotification = function(message, type = 'info', options = {}) {
    if (notificationManager) {
        return notificationManager.show(message, type, options);
    } else {
        // Fallback to simple notification
        console.log(`${type.toUpperCase()}: ${message}`);
    }
};

// Global notification functions
window.toggleNotifications = function() {
    if (notificationManager) {
        notificationManager.showNotificationCenter();
    }
};

window.clearNotifications = function() {
    if (notificationManager) {
        notificationManager.clearAll();
    }
};

// Custom event for triggering system notifications
window.triggerSystemNotification = function(message, type, options) {
    const event = new CustomEvent('systemNotification', {
        detail: { message, type, options }
    });
    document.dispatchEvent(event);
};

console.log('Advanced notification system loaded successfully');
