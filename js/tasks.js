// File Name: js/tasks.js

// Task Management System

class TaskManager {
    constructor() {
        this.tasks = [];
        this.filters = {
            status: 'all',
            priority: 'all',
            assignee: 'all',
            dueDate: 'all'
        };
        
        this.initializeTasks();
    }

    async initializeTasks() {
        await this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
    }

    async loadTasks() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            if (userData.isDemo) {
                // Demo account - load mock tasks from localStorage
                this.tasks = StorageUtils.getLocal(`tasks_${userData.id}`, this.getMockTasks(userData));
            } else {
                // Real account - load from database
                const { data, error } = await supabase
                    .from(TABLES.TASKS)
                    .select('*')
                    .or(`assigned_to.eq.${userData.id},created_by.eq.${userData.id}`)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.tasks = data || [];
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = this.getMockTasks(userData);
        }
    }

    getMockTasks(userData) {
        const isAdmin = userData.role === 'admin';
        
        return [
            {
                id: 'task_001',
                title: 'Finalize Project Plan',
                description: 'Complete the project planning document for Q3 deliverables',
                status: 'in_progress',
                priority: 'high',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                updated_at: new Date().toISOString(),
                category: 'project',
                estimated_hours: 4,
                actual_hours: 2.5,
                attachments: [],
                comments: [
                    {
                        id: 'comment_001',
                        text: 'Started working on the initial draft',
                        author: userData.name,
                        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
                    }
                ]
            },
            {
                id: 'task_002',
                title: 'Review Documentation',
                description: 'Review and update the API documentation for the new features',
                status: 'pending',
                priority: 'medium',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
                created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                updated_at: new Date().toISOString(),
                category: 'documentation',
                estimated_hours: 2,
                actual_hours: 0,
                attachments: [],
                comments: []
            },
            {
                id: 'task_003',
                title: 'Team Standup Meeting',
                description: 'Participate in the daily standup meeting with the development team',
                status: 'completed',
                priority: 'low',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                updated_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
                category: 'meeting',
                estimated_hours: 0.5,
                actual_hours: 0.5,
                attachments: [],
                comments: [
                    {
                        id: 'comment_002',
                        text: 'Meeting completed successfully',
                        author: userData.name,
                        timestamp: new Date(Date.now() - 1800000).toISOString()
                    }
                ]
            },
            {
                id: 'task_004',
                title: 'Security Audit',
                description: 'Conduct security audit of the application and prepare report',
                status: 'pending',
                priority: 'high',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 1 week from now
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                category: 'security',
                estimated_hours: 8,
                actual_hours: 0,
                attachments: [],
                comments: []
            }
        ];
    }

    setupEventListeners() {
        // Task form submission
        const taskForm = document.getElementById('createTaskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleCreateTask.bind(this));
        }

        // Filter change events
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-filter')) {
                this.updateFilters();
            }
        });

        // Search input
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                this.renderTasks();
            }, 300));
        }
    }

    async createTask(taskData) {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) {
            showNotification('User not found', 'error');
            return false;
        }

        const newTask = {
            id: StringUtils.generateId('task'),
            title: taskData.title,
            description: taskData.description,
            status: 'pending',
            priority: taskData.priority,
            assigned_to: taskData.assigned_to,
            assigned_to_name: taskData.assigned_to_name,
            created_by: userData.id,
            created_by_name: userData.name,
            due_date: taskData.due_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: taskData.category,
            estimated_hours: taskData.estimated_hours || 0,
            actual_hours: 0,
            attachments: [],
            comments: []
        };

        try {
            if (userData.isDemo) {
                // Demo account - save to localStorage
                this.tasks.unshift(newTask);
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                // Real account - save to database
                const { data, error } = await supabase
                    .from(TABLES.TASKS)
                    .insert([newTask])
                    .select()
                    .single();

                if (error) throw error;
                this.tasks.unshift(data);
            }

            this.renderTasks();
            showNotification('Task created successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error creating task:', error);
            showNotification('Failed to create task', 'error');
            return false;
        }
    }

    async updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');
        
        try {
            task.status = newStatus;
            task.updated_at = new Date().toISOString();
            
            if (newStatus === 'completed') {
                task.completed_at = new Date().toISOString();
            }

            if (userData.isDemo) {
                // Demo account - update localStorage
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                // Real account - update database
                const { error } = await supabase
                    .from(TABLES.TASKS)
                    .update({
                        status: newStatus,
                        updated_at: task.updated_at,
                        completed_at: task.completed_at
                    })
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            showNotification(`Task marked as ${newStatus}!`, 'success');
            return true;

        } catch (error) {
            console.error('Error updating task status:', error);
            showNotification('Failed to update task status', 'error');
            return false;
        }
    }

    async addTaskComment(taskId, commentText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');
        
        const newComment = {
            id: StringUtils.generateId('comment'),
            text: commentText,
            author: userData.name,
            author_id: userData.id,
            timestamp: new Date().toISOString()
        };

        try {
            task.comments = task.comments || [];
            task.comments.push(newComment);
            task.updated_at = new Date().toISOString();

            if (userData.isDemo) {
                // Demo account - update localStorage
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                // Real account - update database
                const { error } = await supabase
                    .from(TABLES.TASKS)
                    .update({
                        comments: task.comments,
                        updated_at: task.updated_at
                    })
                    .eq('id', taskId);

                if (error) throw error;
            }

            showNotification('Comment added successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error adding comment:', error);
            showNotification('Failed to add comment', 'error');
            return false;
        }
    }

    async updateTaskProgress(taskId, actualHours) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;

        const userData = StorageUtils.getLocal('currentUser');

        try {
            task.actual_hours = actualHours;
            task.updated_at = new Date().toISOString();

            if (userData.isDemo) {
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                const { error } = await supabase
                    .from(TABLES.TASKS)
                    .update({
                        actual_hours: actualHours,
                        updated_at: task.updated_at
                    })
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            showNotification('Task progress updated!', 'success');
            return true;

        } catch (error) {
            console.error('Error updating task progress:', error);
            showNotification('Failed to update progress', 'error');
            return false;
        }
    }

    handleCreateTask(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            assigned_to: formData.get('assigned_to'),
            assigned_to_name: formData.get('assigned_to_name'),
            due_date: formData.get('due_date'),
            category: formData.get('category'),
            estimated_hours: parseFloat(formData.get('estimated_hours'))
        };

        if (!taskData.title || !taskData.description) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        this.createTask(taskData).then(success => {
            if (success) {
                event.target.reset();
                // Close modal if exists
                const modal = document.getElementById('createTaskModal');
                if (modal) modal.style.display = 'none';
            }
        });
    }

    updateFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');
        const assigneeFilter = document.getElementById('assigneeFilter');
        
        if (statusFilter) this.filters.status = statusFilter.value;
        if (priorityFilter) this.filters.priority = priorityFilter.value;
        if (assigneeFilter) this.filters.assignee = assigneeFilter.value;
        
        this.renderTasks();
    }

    getFilteredTasks() {
        let filteredTasks = [...this.tasks];
        
        // Search filter
        const searchInput = document.getElementById('taskSearch');
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm)
            );
        }

        // Status filter
        if (this.filters.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === this.filters.status);
        }

        // Priority filter
        if (this.filters.priority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === this.filters.priority);
        }

        // Assignee filter
        const userData = StorageUtils.getLocal('currentUser');
        if (this.filters.assignee === 'me') {
            filteredTasks = filteredTasks.filter(task => task.assigned_to === userData.id);
        } else if (this.filters.assignee === 'others') {
            filteredTasks = filteredTasks.filter(task => task.assigned_to !== userData.id);
        }

        return filteredTasks;
    }

    renderTasks() {
        const taskContainer = document.getElementById('taskList');
        if (!taskContainer) return;

        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>No tasks match your current filters</p>
                </div>
            `;
            return;
        }

        taskContainer.innerHTML = filteredTasks.map(task => this.renderTaskCard(task)).join('');
        this.updateTaskStats();
    }

    renderTaskCard(task) {
        const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
        const userData = StorageUtils.getLocal('currentUser');
        const canEdit = userData.role === 'admin' || task.created_by === userData.id;
        
        return `
            <div class="task-card ${task.status} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-priority ${task.priority}">
                        <i class="fas fa-circle"></i>
                        ${StringUtils.capitalize(task.priority)}
                    </div>
                    <div class="task-status">
                        <span class="badge badge-${this.getStatusBadgeClass(task.status)}">
                            ${StringUtils.titleCase(task.status.replace('_', ' '))}
                        </span>
                    </div>
                    ${canEdit ? `
                        <div class="task-menu">
                            <button class="btn-icon" onclick="showTaskMenu('${task.id}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-content">
                    <h3 class="task-title">${task.title}</h3>
                    <p class="task-description">${StringUtils.truncate(task.description, 100)}</p>
                    
                    <div class="task-meta">
                        <div class="meta-item">
                            <i class="fas fa-user"></i>
                            <span>${task.assigned_to_name}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Due: ${DateTimeUtils.formatDate(task.due_date, 'short')}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${task.estimated_hours}h estimated</span>
                        </div>
                        ${task.category ? `
                            <div class="meta-item">
                                <i class="fas fa-tag"></i>
                                <span>${StringUtils.titleCase(task.category)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${task.actual_hours > 0 ? `
                        <div class="task-progress">
                            <div class="progress-info">
                                <span>Progress: ${task.actual_hours}h / ${task.estimated_hours}h</span>
                                <span>${Math.round((task.actual_hours / task.estimated_hours) * 100)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((task.actual_hours / task.estimated_hours) * 100, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-actions">
                    ${task.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="updateTaskStatus('${task.id}', 'in_progress')">
                            <i class="fas fa-play"></i>
                            Start
                        </button>
                    ` : ''}
                    
                    ${task.status === 'in_progress' ? `
                        <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${task.id}', 'completed')">
                            <i class="fas fa-check"></i>
                            Complete
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="updateTaskStatus('${task.id}', 'on_hold')">
                            <i class="fas fa-pause"></i>
                            Hold
                        </button>
                    ` : ''}
                    
                    ${task.status === 'on_hold' ? `
                        <button class="btn btn-sm btn-primary" onclick="updateTaskStatus('${task.id}', 'in_progress')">
                            <i class="fas fa-play"></i>
                            Resume
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-sm btn-outline" onclick="viewTaskDetails('${task.id}')">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    
                    ${task.comments && task.comments.length > 0 ? `
                        <span class="comment-count">
                            <i class="fas fa-comment"></i>
                            ${task.comments.length}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getStatusBadgeClass(status) {
        const statusMap = {
            'pending': 'secondary',
            'in_progress': 'warning',
            'completed': 'success',
            'on_hold': 'info',
            'cancelled': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    updateTaskStats() {
        const stats = this.calculateTaskStats();
        
        // Update dashboard stats if elements exist
        const totalTasks = document.getElementById('totalTasks');
        const pendingTasks = document.getElementById('pendingTasks');
        const completedTasks = document.getElementById('completedTasks');
        const overdueTasks = document.getElementById('overdueTasks');
        
        if (totalTasks) totalTasks.textContent = stats.total;
        if (pendingTasks) pendingTasks.textContent = stats.pending;
        if (completedTasks) completedTasks.textContent = stats.completed;
        if (overdueTasks) overdueTasks.textContent = stats.overdue;
    }

    calculateTaskStats() {
        const now = new Date();
        
        return {
            total: this.tasks.length,
            pending: this.tasks.filter(t => t.status === 'pending').length,
            inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
            completed: this.tasks.filter(t => t.status === 'completed').length,
            onHold: this.tasks.filter(t => t.status === 'on_hold').length,
            overdue: this.tasks.filter(t => 
                new Date(t.due_date) < now && t.status !== 'completed'
            ).length
        };
    }

    getTaskById(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }

    // Export tasks to CSV
    exportTasks() {
        const csvContent = this.generateTasksCSV();
        const userData = StorageUtils.getLocal('currentUser');
        downloadFile(
            csvContent, 
            `tasks_${userData.name.replace(' ', '_')}_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`, 
            'text/csv'
        );
        showNotification('Tasks exported successfully!', 'success');
    }

    generateTasksCSV() {
        let csv = 'Title,Description,Status,Priority,Assigned To,Due Date,Created Date,Category,Estimated Hours,Actual Hours\n';
        
        this.tasks.forEach(task => {
            csv += `"${task.title}","${task.description}","${task.status}","${task.priority}","${task.assigned_to_name}","${DateTimeUtils.formatDate(task.due_date)}","${DateTimeUtils.formatDate(task.created_at)}","${task.category || ''}","${task.estimated_hours}","${task.actual_hours}"\n`;
        });
        
        return csv;
    }
}

// Global task manager instance
let taskManager;

// Initialize task manager
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('taskList') || 
        document.querySelector('.task-card') ||
        window.location.pathname.includes('task')) {
        taskManager = new TaskManager();
    }
});

// Global functions for task management
window.updateTaskStatus = function(taskId, newStatus) {
    if (taskManager) {
        taskManager.updateTaskStatus(taskId, newStatus);
    }
};

window.viewTaskDetails = function(taskId) {
    const task = taskManager.getTaskById(taskId);
    if (!task) return;
    
    const modalContent = `
        <div class="task-details">
            <h4>${task.title}</h4>
            <p class="task-description">${task.description}</p>
            
            <div class="task-info-grid">
                <div class="info-item">
                    <label>Status:</label>
                    <span class="badge badge-${taskManager.getStatusBadgeClass(task.status)}">
                        ${StringUtils.titleCase(task.status.replace('_', ' '))}
                    </span>
                </div>
                <div class="info-item">
                    <label>Priority:</label>
                    <span class="priority-badge ${task.priority}">
                        ${StringUtils.capitalize(task.priority)}
                    </span>
                </div>
                <div class="info-item">
                    <label>Assigned To:</label>
                    <span>${task.assigned_to_name}</span>
                </div>
                <div class="info-item">
                    <label>Created By:</label>
                    <span>${task.created_by_name}</span>
                </div>
                <div class="info-item">
                    <label>Due Date:</label>
                    <span>${DateTimeUtils.formatDate(task.due_date, 'long')}</span>
                </div>
                <div class="info-item">
                    <label>Category:</label>
                    <span>${task.category ? StringUtils.titleCase(task.category) : 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Estimated Hours:</label>
                    <span>${task.estimated_hours}h</span>
                </div>
                <div class="info-item">
                    <label>Actual Hours:</label>
                    <span>${task.actual_hours}h</span>
                </div>
            </div>
            
            ${task.comments && task.comments.length > 0 ? `
                <div class="task-comments">
                    <h5>Comments</h5>
                    <div class="comments-list">
                        ${task.comments.map(comment => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <strong>${comment.author}</strong>
                                    <small>${DateTimeUtils.formatDate(comment.timestamp)} ${DateTimeUtils.formatTime(comment.timestamp)}</small>
                                </div>
                                <p>${comment.text}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="task-actions mt-20">
                <input type="text" id="newComment" placeholder="Add a comment..." class="form-control">
                <button class="btn btn-primary" onclick="addTaskComment('${task.id}')">
                    <i class="fas fa-comment"></i>
                    Add Comment
                </button>
            </div>
        </div>
    `;
    
    UIUtils.showModal(modalContent, 'Task Details');
};

window.addTaskComment = function(taskId) {
    const commentInput = document.getElementById('newComment');
    if (!commentInput || !commentInput.value.trim()) {
        showNotification('Please enter a comment', 'warning');
        return;
    }
    
    if (taskManager) {
        taskManager.addTaskComment(taskId, commentInput.value.trim()).then(success => {
            if (success) {
                commentInput.value = '';
                // Refresh task details view
                viewTaskDetails(taskId);
            }
        });
    }
};

window.showTaskMenu = function(taskId) {
    showNotification('Task menu feature coming soon!', 'info');
};

window.showCreateTaskModal = function() {
    showNotification('Create task modal feature coming soon!', 'info');
};

console.log('Tasks module loaded successfully');
