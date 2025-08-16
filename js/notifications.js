// File Name: js/notifications.js
// Advanced Notification System - FIXED VERSION

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.settings = {
            position: 'top-right',
            autoClose: true,
            duration: 5000,
            maxNotifications: 5,
            showProgress: true,
            enableSound: false,
            groupSimilar: true
        };
        
        this.initializeNotificationSystem();
    }

    initializeNotificationSystem() {
        try {
            this.createContainer();
            this.loadSettings();
            this.setupEventListeners();
            this.startPeriodicChecks();
            this.checkMissedNotifications();
        } catch (error) {
            console.error('Notification system initialization error:', error);
        }
    }

    createContainer() {
        try {
            // Remove existing container if it exists
            const existingContainer = document.getElementById('notificationContainer');
            if (existingContainer) {
                existingContainer.remove();
            }

            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = `notification-container ${this.settings.position}`;
            this.container.setAttribute('role', 'status');
            this.container.setAttribute('aria-live', 'polite');
            
            // Add container styles
            this.container.style.cssText = `
                position: fixed;
                z-index: 9999;
                pointer-events: none;
                max-width: 400px;
                padding: 20px;
            `;
            
            this.updateContainerPosition();
            document.body.appendChild(this.container);
        } catch (error) {
            console.error('Create notification container error:', error);
        }
    }

    updateContainerPosition() {
        if (!this.container) return;

        const positions = {
            'top-right': { top: '0', right: '0' },
            'top-left': { top: '0', left: '0' },
            'bottom-right': { bottom: '0', right: '0' },
            'bottom-left': { bottom: '0', left: '0' },
            'top-center': { top: '0', left: '50%', transform: 'translateX(-50%)' },
            'bottom-center': { bottom: '0', left: '50%', transform: 'translateX(-50%)' }
        };

        const position = positions[this.settings.position] || positions['top-right'];
        
        Object.assign(this.container.style, position);
    }

    loadSettings() {
        try {
            const savedSettings = StorageUtils.getLocal('notification_settings', {});
            this.settings = { ...this.settings, ...savedSettings };
            this.updateContainerPosition();
        } catch (error) {
            console.error('Load notification settings error:', error);
        }
    }

    saveSettings() {
        try {
            StorageUtils.setLocal('notification_settings', this.settings);
        } catch (error) {
            console.error('Save notification settings error:', error);
        }
    }

    setupEventListeners() {
        try {
            // Handle notification interactions
            document.addEventListener('click', this.handleNotificationClick.bind(this));
            
            // Handle window focus for updating notification status
            window.addEventListener('focus', this.handleWindowFocus.bind(this));
            
            // Handle system notifications
            document.addEventListener('systemNotification', this.handleSystemNotification.bind(this));
            
            // Clean up expired notifications periodically
            setInterval(() => {
                this.cleanupExpiredNotifications();
            }, 30000); // Every 30 seconds

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    handleNotificationClick(event) {
        try {
            const notificationElement = event.target.closest('.notification-item');
            if (!notificationElement) return;

            const notificationId = notificationElement.dataset.notificationId;
            const action = event.target.dataset.action;

            switch (action) {
                case 'close':
                    this.close(notificationId);
                    break;
                case 'pin':
                    this.pin(notificationId);
                    break;
                case 'action':
                    this.executeAction(notificationId, event.target.dataset.actionId);
                    break;
                default:
                    // Mark as read on click
                    this.markAsRead(notificationId);
            }
        } catch (error) {
            console.error('Notification click handler error:', error);
        }
    }

    handleWindowFocus() {
        try {
            // Update last active time and check for new notifications
            StorageUtils.setLocal('last_active_time', new Date().toISOString());
            this.checkForNewNotifications();
        } catch (error) {
            console.error('Window focus handler error:', error);
        }
    }

    handleSystemNotification(event) {
        try {
            const { message, type, options } = event.detail;
            this.show(message, type, options);
        } catch (error) {
            console.error('System notification handler error:', error);
        }
    }

    show(message, type = 'info', options = {}) {
        try {
            if (!message || typeof message !== 'string') {
                console.warn('Invalid notification message');
                return null;
            }

            const notification = this.createNotification(message, type, options);
            
            // Check for similar notifications if grouping is enabled
            if (this.settings.groupSimilar) {
                const similar = this.findSimilarNotification(notification);
                if (similar) {
                    return this.updateSimilarNotification(similar, notification);
                }
            }

            // Add to notifications array
            this.notifications.unshift(notification);
            
            // Limit number of notifications
            if (this.notifications.length > this.settings.maxNotifications) {
                const removed = this.notifications.splice(this.settings.maxNotifications);
                removed.forEach(n => this.removeFromDOM(n.id));
            }

            // Create DOM element and add to container
            const element = this.createNotificationElement(notification);
            notification.element = element;
            
            if (this.container) {
                this.container.insertBefore(element, this.container.firstChild);
                
                // Trigger animation
                requestAnimationFrame(() => {
                    element.classList.add('notification-show');
                });
            }

            // Save to history
            this.saveToHistory(notification);

            // Auto-close if enabled
            if (this.settings.autoClose && !notification.persistent) {
                this.scheduleAutoClose(notification);
            }

            // Play sound if enabled
            if (this.settings.enableSound && notification.playSound !== false) {
                this.playNotificationSound(type);
            }

            // Update badge count
            this.updateNotificationBadge();

            return notification.id;

        } catch (error) {
            console.error('Show notification error:', error);
            return null;
        }
    }

    createNotification(message, type, options) {
        const notification = {
            id: StringUtils.generateId('notif'),
            message: StringUtils.escapeHtml(message),
            type: type,
            timestamp: new Date().toISOString(),
            read: false,
            persistent: options.persistent || false,
            playSound: options.playSound !== false,
            actions: options.actions || [],
            data: options.data || {},
            ...options
        };

        return notification;
    }

    createNotificationElement(notification) {
        try {
            const element = document.createElement('div');
            element.className = `notification-item notification-${notification.type}`;
            element.dataset.notificationId = notification.id;
            element.setAttribute('role', 'alert');
            element.style.pointerEvents = 'auto';

            const typeConfig = this.getTypeConfig(notification.type);
            
            element.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        <div class="notification-icon">
                            <i class="${typeConfig.icon}"></i>
                        </div>
                        <div class="notification-meta">
                            ${notification.title ? `<h4 class="notification-title">${notification.title}</h4>` : ''}
                            <small class="notification-time">${DateTimeUtils.formatDate(notification.timestamp, 'relative')}</small>
                        </div>
                        <div class="notification-controls">
                            ${!notification.persistent ? `
                                <button class="notification-btn" data-action="close" title="Close">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : `
                                <button class="notification-btn" data-action="pin" title="Pin">
                                    <i class="fas fa-thumbtack"></i>
                                </button>
                            `}
                        </div>
                    </div>
                    
                    <div class="notification-body">
                        <p class="notification-message">${notification.message}</p>
                        
                        ${notification.actions && notification.actions.length > 0 ? `
                            <div class="notification-actions">
                                ${notification.actions.map(action => `
                                    <button class="notification-action-btn" data-action="action" data-action-id="${action.id}">
                                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                                        ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${this.settings.showProgress && this.settings.autoClose && !notification.persistent ? `
                        <div class="notification-progress">
                            <div class="notification-progress-bar"></div>
                        </div>
                    ` : ''}
                </div>
            `;

            // Add styles
            element.style.cssText = `
                background: white;
                border-left: 4px solid ${typeConfig.color};
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                padding: 16px;
                opacity: 0;
                transform: translateX(${this.settings.position.includes('right') ? '100%' : '-100%'});
                transition: all 0.3s ease;
                min-width: 300px;
                max-width: 400px;
                word-wrap: break-word;
            `;

            return element;

        } catch (error) {
            console.error('Create notification element error:', error);
            return document.createElement('div');
        }
    }

    getTypeConfig(type) {
        const configs = {
            success: {
                icon: 'fas fa-check-circle',
                color: '#10b981'
            },
            error: {
                icon: 'fas fa-exclamation-circle',
                color: '#ef4444'
            },
            warning: {
                icon: 'fas fa-exclamation-triangle',
                color: '#f59e0b'
            },
            info: {
                icon: 'fas fa-info-circle',
                color: '#3b82f6'
            },
            system: {
                icon: 'fas fa-cog',
                color: '#6b7280'
            },
            reminder: {
                icon: 'fas fa-bell',
                color: '#8b5cf6'
            }
        };

        return configs[type] || configs.info;
    }

    scheduleAutoClose(notification) {
        try {
            const duration = notification.duration || this.settings.duration;
            
            notification.closeTimeout = setTimeout(() => {
                this.close(notification.id);
            }, duration);

            // Update progress bar if shown
            if (this.settings.showProgress && notification.element) {
                const progressBar = notification.element.querySelector('.notification-progress-bar');
                if (progressBar) {
                    progressBar.style.cssText = `
                        width: 100%;
                        height: 3px;
                        background: rgba(0, 0, 0, 0.1);
                        animation: notificationProgress ${duration}ms linear;
                    `;
                }
            }
        } catch (error) {
            console.error('Schedule auto close error:', error);
        }
    }

    close(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification) return false;

            // Clear auto-close timeout
            if (notification.closeTimeout) {
                clearTimeout(notification.closeTimeout);
            }

            // Remove from DOM with animation
            if (notification.element) {
                notification.element.classList.add('notification-hide');
                setTimeout(() => {
                    this.removeFromDOM(notificationId);
                }, 300);
            }

            // Remove from notifications array
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            
            // Update badge count
            this.updateNotificationBadge();

            return true;
        } catch (error) {
            console.error('Close notification error:', error);
            return false;
        }
    }

    closeAll() {
        try {
            const notificationIds = [...this.notifications.map(n => n.id)];
            notificationIds.forEach(id => this.close(id));
        } catch (error) {
            console.error('Close all notifications error:', error);
        }
    }

    removeFromDOM(notificationId) {
        try {
            if (this.container) {
                const element = this.container.querySelector(`[data-notification-id="${notificationId}"]`);
                if (element) {
                    element.remove();
                }
            }
        } catch (error) {
            console.error('Remove from DOM error:', error);
        }
    }

    pin(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification) return false;

            notification.persistent = true;
            
            // Clear auto-close timeout
            if (notification.closeTimeout) {
                clearTimeout(notification.closeTimeout);
                notification.closeTimeout = null;
            }

            // Update DOM element
            if (notification.element) {
                const progressBar = notification.element.querySelector('.notification-progress');
                if (progressBar) {
                    progressBar.style.display = 'none';
                }

                const closeBtn = notification.element.querySelector('[data-action="close"]');
                if (closeBtn) {
                    closeBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
                    closeBtn.dataset.action = 'unpin';
                    closeBtn.title = 'Unpin';
                }
            }

            return true;
        } catch (error) {
            console.error('Pin notification error:', error);
            return false;
        }
    }

    executeAction(notificationId, actionId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification) return false;

            const action = notification.actions.find(a => a.id === actionId);
            if (!action) return false;

            // Execute action callback if provided
            if (typeof action.callback === 'function') {
                action.callback(notification);
            }

            // Handle common actions
            switch (action.type) {
                case 'dismiss':
                    this.close(notificationId);
                    break;
                case 'navigate':
                    if (action.url) {
                        window.location.href = action.url;
                    }
                    break;
                case 'download':
                    if (action.data) {
                        downloadFile(action.data.content, action.data.filename, action.data.type);
                    }
                    break;
            }

            return true;
        } catch (error) {
            console.error('Execute action error:', error);
            return false;
        }
    }

    markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification) return false;

            notification.read = true;
            
            // Update history
            const history = StorageUtils.getLocal('notification_history', []);
            const historyItem = history.find(h => h.id === notificationId);
            if (historyItem) {
                historyItem.read = true;
                StorageUtils.setLocal('notification_history', history);
            }

            // Update badge count
            this.updateNotificationBadge();

            return true;
        } catch (error) {
            console.error('Mark as read error:', error);
            return false;
        }
    }

    findSimilarNotification(newNotification) {
        try {
            return this.notifications.find(existing => 
                existing.type === newNotification.type &&
                existing.message === newNotification.message &&
                (new Date() - new Date(existing.timestamp)) < 60000 // Within 1 minute
            );
        } catch (error) {
            console.error('Find similar notification error:', error);
            return null;
        }
    }

    updateSimilarNotification(existing, newNotification) {
        try {
            // Update count if it exists
            if (!existing.count) existing.count = 1;
            existing.count++;

            // Update timestamp
            existing.timestamp = newNotification.timestamp;

            // Update DOM element
            if (existing.element) {
                const messageElement = existing.element.querySelector('.notification-message');
                if (messageElement) {
                    messageElement.innerHTML = `${existing.message} <span class="notification-count">(${existing.count})</span>`;
                }

                const timeElement = existing.element.querySelector('.notification-time');
                if (timeElement) {
                    timeElement.textContent = DateTimeUtils.formatDate(existing.timestamp, 'relative');
                }

                // Re-trigger animation
                existing.element.classList.remove('notification-show');
                requestAnimationFrame(() => {
                    existing.element.classList.add('notification-show');
                });
            }

            return existing.id;
        } catch (error) {
            console.error('Update similar notification error:', error);
            return null;
        }
    }

    playNotificationSound(type) {
        try {
            // Create audio context if supported
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Generate different tones for different types
                const frequencies = {
                    success: 800,
                    error: 400,
                    warning: 600,
                    info: 500,
                    system: 300,
                    reminder: 700
                };

                const frequency = frequencies[type] || frequencies.info;
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (error) {
            console.error('Play notification sound error:', error);
        }
    }

    saveToHistory(notification) {
        try {
            const history = StorageUtils.getLocal('notification_history', []);
            
            // Remove element reference before saving
            const historyItem = { ...notification };
            delete historyItem.element;
            delete historyItem.closeTimeout;
            
            history.unshift(historyItem);
            
            // Keep only last 100 notifications
            if (history.length > 100) {
                history.splice(100);
            }
            
            StorageUtils.setLocal('notification_history', history);
        } catch (error) {
            console.error('Save to history error:', error);
        }
    }

    getHistory(limit = 20) {
        try {
            return StorageUtils.getLocal('notification_history', []).slice(0, limit);
        } catch (error) {
            console.error('Get history error:', error);
            return [];
        }
    }

    clearHistory() {
        try {
            StorageUtils.removeLocal('notification_history');
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Clear history error:', error);
        }
    }

    showNotificationCenter() {
        try {
            const history = this.getHistory(50);
            
            const centerContent = `
                <div class="notification-center">
                    <div class="notification-center-header">
                        <h4>Notifications</h4>
                        <div class="notification-center-actions">
                            <button class="btn btn-sm btn-outline" onclick="notificationManager.markAllAsRead()">
                                Mark All Read
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="notificationManager.clearHistory()">
                                Clear All
                            </button>
                        </div>
                    </div>
                    
                    <div class="notification-center-body">
                        ${history.length > 0 ? history.map(notification => `
                            <div class="notification-history-item ${notification.read ? 'read' : 'unread'}">
                                <div class="notification-history-icon ${notification.type}">
                                    <i class="${this.getTypeConfig(notification.type).icon}"></i>
                                </div>
                                <div class="notification-history-content">
                                    ${notification.title ? `<h5>${StringUtils.escapeHtml(notification.title)}</h5>` : ''}
                                    <p>${notification.message}</p>
                                    <small>${DateTimeUtils.formatDate(notification.timestamp, 'relative')}</small>
                                </div>
                                <div class="notification-history-actions">
                                    <button class="btn-icon" onclick="notificationManager.markAsRead('${notification.id}')" title="Mark as read">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn-icon" onclick="notificationManager.removeFromHistory('${notification.id}')" title="Remove">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') : '<div class="notification-center-empty">No notifications</div>'}
                    </div>
                </div>
            `;

            UIUtils.showModal(centerContent, 'Notification Center');
        } catch (error) {
            console.error('Show notification center error:', error);
        }
    }

    markAllAsRead() {
        try {
            const history = StorageUtils.getLocal('notification_history', []);
            history.forEach(notification => {
                notification.read = true;
            });
            StorageUtils.setLocal('notification_history', history);
            
            this.notifications.forEach(notification => {
                notification.read = true;
            });
            
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    }

    removeFromHistory(notificationId) {
        try {
            const history = StorageUtils.getLocal('notification_history', []);
            const updatedHistory = history.filter(n => n.id !== notificationId);
            StorageUtils.setLocal('notification_history', updatedHistory);
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Remove from history error:', error);
        }
    }

    updateNotificationBadge() {
        try {
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
        } catch (error) {
            console.error('Update notification badge error:', error);
        }
    }

    getUnreadCount() {
        try {
            const history = StorageUtils.getLocal('notification_history', []);
            return history.filter(n => !n.read).length;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    }

    startPeriodicChecks() {
        try {
            // Check for system notifications every minute
            setInterval(() => {
                this.checkSystemNotifications();
            }, 60000);

            // Initial check after 5 seconds
            setTimeout(() => {
                this.checkSystemNotifications();
            }, 5000);
        } catch (error) {
            console.error('Start periodic checks error:', error);
        }
    }

    checkSystemNotifications() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) return;

            // Check for various system notifications
            this.checkTaskDeadlines();
            this.checkMeetingReminders();
            this.checkTrainingDue();
            this.checkSystemUpdates();
        } catch (error) {
            console.error('Check system notifications error:', error);
        }
    }

    checkTaskDeadlines() {
        try {
            if (!window.taskManager || !window.taskManager.tasks) return;

            const now = new Date();
            const upcomingTasks = window.taskManager.tasks.filter(task => {
                if (task.status === 'completed') return false;
                
                const dueDate = new Date(task.due_date);
                const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
                
                return hoursUntilDue > 0 && hoursUntilDue <= 24; // Due within 24 hours
            });

            upcomingTasks.forEach(task => {
                const notificationId = `task_deadline_${task.id}`;
                
                // Check if we already sent this notification
                const existing = this.notifications.find(n => n.id === notificationId);
                if (existing) return;

                const dueDate = new Date(task.due_date);
                const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));

                this.show(
                    `Task "${task.title}" is due in ${hoursUntilDue} hours`,
                    'warning',
                    {
                        id: notificationId,
                        title: 'Task Deadline Reminder',
                        persistent: true,
                        actions: [
                            {
                                id: 'view_task',
                                label: 'View Task',
                                type: 'navigate',
                                url: `tasks.html?task=${task.id}`
                            },
                            {
                                id: 'dismiss',
                                label: 'Dismiss',
                                type: 'dismiss'
                            }
                        ]
                    }
                );
            });
        } catch (error) {
            console.error('Check task deadlines error:', error);
        }
    }

    checkMeetingReminders() {
        try {
            // Mock meeting reminder
            const now = new Date();
            const nextMeeting = new Date();
            nextMeeting.setHours(now.getHours() + 1); // Mock meeting in 1 hour

            const timeDiff = nextMeeting - now;
            const minutesUntilMeeting = Math.round(timeDiff / (1000 * 60));

            if (minutesUntilMeeting === 15) { // 15 minutes before
                this.show(
                    'You have a team meeting in 15 minutes',
                    'reminder',
                    {
                        title: 'Meeting Reminder',
                        persistent: true,
                        actions: [
                            {
                                id: 'join_meeting',
                                label: 'Join Meeting',
                                type: 'navigate',
                                url: 'https://meet.example.com/room'
                            }
                        ]
                    }
                );
            }
        } catch (error) {
            console.error('Check meeting reminders error:', error);
        }
    }

    checkTrainingDue() {
        try {
            if (!window.trainingManager) return;

            // Check for training courses that need attention
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) return;

            // Mock check for overdue training
            const overdueTraining = StorageUtils.getLocal(`overdue_training_${userData.id}`, []);
            
            if (overdueTraining.length > 0) {
                this.show(
                    `You have ${overdueTraining.length} overdue training course(s)`,
                    'warning',
                    {
                        title: 'Training Reminder',
                        actions: [
                            {
                                id: 'view_training',
                                label: 'View Training',
                                type: 'navigate',
                                url: 'training.html'
                            }
                        ]
                    }
                );
            }
        } catch (error) {
            console.error('Check training due error:', error);
        }
    }

    checkSystemUpdates() {
        try {
            // Mock system update notification
            const lastUpdateCheck = StorageUtils.getLocal('last_update_check');
            const now = new Date();
            
            if (!lastUpdateCheck || (now - new Date(lastUpdateCheck)) > 24 * 60 * 60 * 1000) { // 24 hours
                StorageUtils.setLocal('last_update_check', now.toISOString());
                
                // Random chance of showing update notification (for demo)
                if (Math.random() < 0.1) { // 10% chance
                    this.show(
                        'A new system update is available',
                        'system',
                        {
                            title: 'System Update',
                            actions: [
                                {
                                    id: 'update_now',
                                    label: 'Update Now',
                                    callback: () => {
                                        this.show('System update completed!', 'success');
                                    }
                                },
                                {
                                    id: 'later',
                                    label: 'Later',
                                    type: 'dismiss'
                                }
                            ]
                        }
                    );
                }
            }
        } catch (error) {
            console.error('Check system updates error:', error);
        }
    }

    checkMissedNotifications() {
        try {
            const lastActiveTime = StorageUtils.getLocal('last_active_time');
            if (!lastActiveTime) return;

            const lastActive = new Date(lastActiveTime);
            const now = new Date();
            const awayDuration = now - lastActive;

            // If away for more than 30 minutes
            if (awayDuration > 30 * 60 * 1000) {
                this.show(
                    'Welcome back! Check for any updates while you were away.',
                    'info',
                    {
                        title: 'You were away',
                        actions: [
                            {
                                id: 'check_updates',
                                label: 'Check Updates',
                                callback: () => {
                                    this.checkForNewNotifications();
                                }
                            }
                        ]
                    }
                );
            }
        } catch (error) {
            console.error('Check missed notifications error:', error);
        }
    }

    checkForNewNotifications() {
        try {
            // In a real implementation, this would check with the server
            // For now, just refresh system checks
            this.checkSystemNotifications();
        } catch (error) {
            console.error('Check for new notifications error:', error);
        }
    }

    cleanupExpiredNotifications() {
        try {
            const now = new Date();
            const expiredNotifications = this.notifications.filter(notification => {
                const age = now - new Date(notification.timestamp);
                return age > 24 * 60 * 60 * 1000 && !notification.persistent; // 24 hours
            });

            expiredNotifications.forEach(notification => {
                this.close(notification.id);
            });
        } catch (error) {
            console.error('Cleanup expired notifications error:', error);
        }
    }

    updateSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            this.saveSettings();
            
            // Update container position if changed
            if (this.container) {
                this.container.className = `notification-container ${this.settings.position}`;
                this.updateContainerPosition();
            }
        } catch (error) {
            console.error('Update settings error:', error);
        }
    }

    exportNotifications() {
        try {
            const history = StorageUtils.getLocal('notification_history', []);
            const exportData = {
                timestamp: new Date().toISOString(),
                settings: this.settings,
                notifications: history
            };
            
            const filename = `notifications_export_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
            downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
            
            this.show('Notifications exported successfully!', 'success');
        } catch (error) {
            console.error('Export notifications error:', error);
            this.show('Failed to export notifications', 'error');
        }
    }

    // Cleanup method
    destroy() {
        try {
            // Close all notifications
            this.closeAll();
            
            // Remove container
            if (this.container) {
                this.container.remove();
            }
            
            // Clear any pending timeouts
            this.notifications.forEach(notification => {
                if (notification.closeTimeout) {
                    clearTimeout(notification.closeTimeout);
                }
            });
            
            // Remove event listeners
            document.removeEventListener('click', this.handleNotificationClick);
            window.removeEventListener('focus', this.handleWindowFocus);
            document.removeEventListener('systemNotification', this.handleSystemNotification);
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Global notification manager instance
let notificationManager;

// Initialize notification manager
document.addEventListener('DOMContentLoaded', () => {
    try {
        notificationManager = new NotificationManager();
        window.notificationManager = notificationManager;
        
        // Store last active time
        StorageUtils.setLocal('last_active_time', new Date().toISOString());
        
        // Update last active time periodically
        setInterval(() => {
            StorageUtils.setLocal('last_active_time', new Date().toISOString());
        }, 30000);
    } catch (error) {
        console.error('Notification manager initialization error:', error);
    }
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
        notificationManager.clearHistory();
    }
};

// Custom event for triggering system notifications
window.triggerSystemNotification = function(message, type, options) {
    const event = new CustomEvent('systemNotification', {
        detail: { message, type, options }
    });
    document.dispatchEvent(event);
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    .notification-show {
        opacity: 1 !important;
        transform: translateX(0) !important;
    }
    
    .notification-hide {
        opacity: 0 !important;
        transform: translateX(${window.innerWidth > 768 ? '100%' : '-100%'}) !important;
    }
    
    @keyframes notificationProgress {
        from { width: 100%; }
        to { width: 0%; }
    }
    
    .notification-item {
        transition: all 0.3s ease;
    }
    
    .notification-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (notificationManager && typeof notificationManager.destroy === 'function') {
        notificationManager.destroy();
    }
});

console.log('Advanced notification system loaded successfully');
