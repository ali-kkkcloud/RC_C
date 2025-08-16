// File Name: js/tasks.js
// Task Management System - FIXED VERSION

class TaskManager {
    constructor() {
        this.tasks = [];
        this.filters = {
            status: 'all',
            priority: 'all',
            assignee: 'all',
            dueDate: 'all'
        };
        this.isLoading = false;
        this.searchTimeout = null;
        
        this.initializeTasks();
    }

    async initializeTasks() {
        try {
            await this.loadTasks();
            this.setupEventListeners();
            this.renderTasks();
            this.updateTaskStats();
        } catch (error) {
            console.error('Task initialization error:', error);
            showNotification('Failed to initialize tasks', 'error');
        }
    }

    async loadTasks() {
        if (this.isLoading) return;
        this.isLoading = true;

        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) {
            console.warn('No user data found');
            this.isLoading = false;
            return;
        }

        try {
            if (userData.isDemo) {
                // Demo account - load mock tasks from localStorage
                const existingTasks = StorageUtils.getLocal(`tasks_${userData.id}`, null);
                if (existingTasks && Array.isArray(existingTasks)) {
                    this.tasks = existingTasks;
                } else {
                    this.tasks = this.getMockTasks(userData);
                    StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
                }
            } else {
                // Real account - load from database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { data, error } = await window.supabase
                    .from(TABLES.TASKS)
                    .select('*')
                    .or(`assigned_to.eq.${userData.id},created_by.eq.${userData.id}`)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.tasks = data || [];
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            // Fallback to mock data
            this.tasks = this.getMockTasks(userData);
            showNotification('Using demo data - database connection failed', 'warning');
        } finally {
            this.isLoading = false;
        }
    }

    getMockTasks(userData) {
        if (!userData) return [];
        
        const isAdmin = userData.role === 'admin';
        const now = new Date();
        
        return [
            {
                id: StringUtils.generateId('task'),
                title: 'Finalize Project Plan',
                description: 'Complete the project planning document for Q3 deliverables and timeline review',
                status: 'in_progress',
                priority: 'high',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: DateTimeUtils.addDays(now, 7).toISOString(),
                created_at: DateTimeUtils.addDays(now, -2).toISOString(),
                updated_at: new Date().toISOString(),
                category: 'project',
                estimated_hours: 4,
                actual_hours: 2.5,
                progress: 65,
                attachments: [],
                comments: [
                    {
                        id: StringUtils.generateId('comment'),
                        text: 'Started working on the initial draft',
                        author: userData.name,
                        timestamp: DateTimeUtils.addDays(now, -1).toISOString()
                    }
                ]
            },
            {
                id: StringUtils.generateId('task'),
                title: 'Review Documentation',
                description: 'Review and update the API documentation for the new features',
                status: 'pending',
                priority: 'medium',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: DateTimeUtils.addDays(now, 3).toISOString(),
                created_at: DateTimeUtils.addDays(now, -1).toISOString(),
                updated_at: new Date().toISOString(),
                category: 'documentation',
                estimated_hours: 2,
                actual_hours: 0,
                progress: 0,
                attachments: [],
                comments: []
            },
            {
                id: StringUtils.generateId('task'),
                title: 'Team Standup Meeting',
                description: 'Participate in the daily standup meeting with the development team',
                status: 'completed',
                priority: 'low',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: DateTimeUtils.addDays(now, -1).toISOString(),
                created_at: DateTimeUtils.addDays(now, -3).toISOString(),
                updated_at: DateTimeUtils.addDays(now, -1).toISOString(),
                completed_at: DateTimeUtils.addDays(now, -1).toISOString(),
                category: 'meeting',
                estimated_hours: 0.5,
                actual_hours: 0.5,
                progress: 100,
                attachments: [],
                comments: []
            },
            {
                id: StringUtils.generateId('task'),
                title: 'Security Audit',
                description: 'Conduct monthly security audit and compliance check',
                status: 'pending',
                priority: 'high',
                assigned_to: userData.id,
                assigned_to_name: userData.name,
                created_by: isAdmin ? userData.id : 'admin_001',
                created_by_name: isAdmin ? userData.name : 'Admin User',
                due_date: DateTimeUtils.addDays(now, 14).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                category: 'security',
                estimated_hours: 8,
                actual_hours: 0,
                progress: 0,
                attachments: [],
                comments: []
            }
        ];
    }

    setupEventListeners() {
        try {
            // Task form submission
            const taskForm = document.getElementById('createTaskForm');
            if (taskForm) {
                taskForm.removeEventListener('submit', this.handleCreateTaskBound);
                this.handleCreateTaskBound = this.handleCreateTask.bind(this);
                taskForm.addEventListener('submit', this.handleCreateTaskBound);
            }

            // Filter change events
            const filterSelects = document.querySelectorAll('.task-filter');
            filterSelects.forEach(select => {
                select.removeEventListener('change', this.handleFilterChangeBound);
                this.handleFilterChangeBound = this.handleFilterChange.bind(this);
                select.addEventListener('change', this.handleFilterChangeBound);
            });

            // Search input with debounce
            const searchInput = document.getElementById('taskSearch');
            if (searchInput) {
                searchInput.removeEventListener('input', this.handleSearchBound);
                this.handleSearchBound = debounce(this.handleSearch.bind(this), 300);
                searchInput.addEventListener('input', this.handleSearchBound);
            }

            // Task action buttons - use event delegation
            document.removeEventListener('click', this.handleTaskActionBound);
            this.handleTaskActionBound = this.handleTaskAction.bind(this);
            document.addEventListener('click', this.handleTaskActionBound);

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    handleFilterChange(event) {
        const filterType = event.target.dataset.filterType || event.target.name;
        const value = event.target.value;
        
        if (this.filters.hasOwnProperty(filterType)) {
            this.filters[filterType] = value;
            this.renderTasks();
        }
    }

    handleSearch(event) {
        this.renderTasks();
    }

    handleTaskAction(event) {
        const target = event.target.closest('[data-task-action]');
        if (!target) return;

        event.preventDefault();
        const action = target.dataset.taskAction;
        const taskId = target.dataset.taskId;

        switch (action) {
            case 'update-status':
                const newStatus = target.dataset.newStatus;
                this.updateTaskStatus(taskId, newStatus);
                break;
            case 'view-details':
                this.viewTaskDetails(taskId);
                break;
            case 'edit':
                this.editTask(taskId);
                break;
            case 'delete':
                this.deleteTask(taskId);
                break;
            case 'add-comment':
                this.showAddCommentModal(taskId);
                break;
            default:
                console.warn('Unknown task action:', action);
        }
    }

    async createTask(taskData) {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) {
            showNotification('User not found', 'error');
            return false;
        }

        // Validate required fields
        if (!taskData.title || !taskData.description) {
            showNotification('Title and description are required', 'error');
            return false;
        }

        const newTask = {
            id: StringUtils.generateId('task'),
            title: taskData.title.trim(),
            description: taskData.description.trim(),
            status: 'pending',
            priority: taskData.priority || 'medium',
            assigned_to: taskData.assigned_to || userData.id,
            assigned_to_name: taskData.assigned_to_name || userData.name,
            created_by: userData.id,
            created_by_name: userData.name,
            due_date: taskData.due_date || DateTimeUtils.addDays(new Date(), 7).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: taskData.category || 'general',
            estimated_hours: parseFloat(taskData.estimated_hours) || 0,
            actual_hours: 0,
            progress: 0,
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
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { data, error } = await window.supabase
                    .from(TABLES.TASKS)
                    .insert([newTask])
                    .select()
                    .single();

                if (error) throw error;
                this.tasks.unshift(data);
            }

            this.renderTasks();
            this.updateTaskStats();
            showNotification('Task created successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error creating task:', error);
            showNotification('Failed to create task: ' + error.message, 'error');
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
        const oldStatus = task.status;
        
        try {
            // Update task properties
            task.status = newStatus;
            task.updated_at = new Date().toISOString();
            
            if (newStatus === 'completed') {
                task.completed_at = new Date().toISOString();
                task.progress = 100;
            } else if (newStatus === 'in_progress' && oldStatus === 'pending') {
                task.started_at = new Date().toISOString();
            }

            if (userData.isDemo) {
                // Demo account - update localStorage
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                // Real account - update database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const updateData = {
                    status: newStatus,
                    updated_at: task.updated_at,
                    progress: task.progress
                };

                if (task.completed_at) updateData.completed_at = task.completed_at;
                if (task.started_at) updateData.started_at = task.started_at;

                const { error } = await window.supabase
                    .from(TABLES.TASKS)
                    .update(updateData)
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            this.updateTaskStats();
            showNotification(`Task marked as ${newStatus.replace('_', ' ')}!`, 'success');
            return true;

        } catch (error) {
            // Revert changes on error
            task.status = oldStatus;
            console.error('Error updating task status:', error);
            showNotification('Failed to update task status: ' + error.message, 'error');
            return false;
        }
    }

    async addTaskComment(taskId, commentText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }

        if (!commentText || !commentText.trim()) {
            showNotification('Comment text is required', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');
        
        const newComment = {
            id: StringUtils.generateId('comment'),
            text: commentText.trim(),
            author: userData.name,
            author_id: userData.id,
            timestamp: new Date().toISOString()
        };

        try {
            if (!task.comments) task.comments = [];
            task.comments.unshift(newComment);
            task.updated_at = new Date().toISOString();

            if (userData.isDemo) {
                // Demo account - update localStorage
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                // Real account - update database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.TASKS)
                    .update({
                        comments: task.comments,
                        updated_at: task.updated_at
                    })
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            showNotification('Comment added successfully!', 'success');
            return true;

        } catch (error) {
            // Remove comment on error
            task.comments.shift();
            console.error('Error adding comment:', error);
            showNotification('Failed to add comment: ' + error.message, 'error');
            return false;
        }
    }

    async updateTaskProgress(taskId, progress) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }

        const progressNum = Math.max(0, Math.min(100, parseInt(progress)));
        const userData = StorageUtils.getLocal('currentUser');
        
        try {
            task.progress = progressNum;
            task.updated_at = new Date().toISOString();

            // Auto-update status based on progress
            if (progressNum === 100 && task.status !== 'completed') {
                task.status = 'completed';
                task.completed_at = new Date().toISOString();
            } else if (progressNum > 0 && task.status === 'pending') {
                task.status = 'in_progress';
                task.started_at = new Date().toISOString();
            }

            if (userData.isDemo) {
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const updateData = {
                    progress: progressNum,
                    status: task.status,
                    updated_at: task.updated_at
                };

                if (task.completed_at) updateData.completed_at = task.completed_at;
                if (task.started_at) updateData.started_at = task.started_at;

                const { error } = await window.supabase
                    .from(TABLES.TASKS)
                    .update(updateData)
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            this.updateTaskStats();
            showNotification('Progress updated successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error updating task progress:', error);
            showNotification('Failed to update progress: ' + error.message, 'error');
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
            estimated_hours: formData.get('estimated_hours')
        };

        this.createTask(taskData).then(success => {
            if (success) {
                event.target.reset();
                // Close modal if exists
                const modal = document.getElementById('createTaskModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
    }

    getFilteredTasks() {
        let filteredTasks = [...this.tasks];
        
        // Search filter
        const searchInput = document.getElementById('taskSearch');
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                task.category.toLowerCase().includes(searchTerm)
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
        if (this.filters.assignee === 'mine' && userData) {
            filteredTasks = filteredTasks.filter(task => task.assigned_to === userData.id);
        } else if (this.filters.assignee === 'created' && userData) {
            filteredTasks = filteredTasks.filter(task => task.created_by === userData.id);
        }

        // Due date filter
        const now = new Date();
        if (this.filters.dueDate === 'overdue') {
            filteredTasks = filteredTasks.filter(task => 
                new Date(task.due_date) < now && task.status !== 'completed'
            );
        } else if (this.filters.dueDate === 'today') {
            filteredTasks = filteredTasks.filter(task => 
                DateTimeUtils.isToday(task.due_date)
            );
        } else if (this.filters.dueDate === 'week') {
            filteredTasks = filteredTasks.filter(task => 
                DateTimeUtils.isThisWeek(task.due_date)
            );
        }

        return filteredTasks;
    }

    renderTasks() {
        try {
            const taskList = document.getElementById('taskList');
            if (!taskList) {
                console.warn('Task list element not found');
                return;
            }

            if (this.isLoading) {
                taskList.innerHTML = '<div class="loading-state">Loading tasks...</div>';
                return;
            }

            const filteredTasks = this.getFilteredTasks();

            if (filteredTasks.length === 0) {
                taskList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <h3>No tasks found</h3>
                        <p>Try adjusting your filters or create a new task.</p>
                    </div>
                `;
                return;
            }

            taskList.innerHTML = filteredTasks.map(task => this.renderTaskCard(task)).join('');
        } catch (error) {
            console.error('Error rendering tasks:', error);
            const taskList = document.getElementById('taskList');
            if (taskList) {
                taskList.innerHTML = '<div class="error-state">Error loading tasks</div>';
            }
        }
    }

    renderTaskCard(task) {
        if (!task) return '';

        const dueDate = new Date(task.due_date);
        const isOverdue = dueDate < new Date() && task.status !== 'completed';
        const dueDateClass = isOverdue ? 'overdue' : '';
        
        return `
            <div class="task-card ${task.status} ${task.priority}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">
                        <h4>${StringUtils.escapeHtml(task.title)}</h4>
                        <span class="task-priority ${task.priority}">${StringUtils.capitalize(task.priority)}</span>
                    </div>
                    <div class="task-status">
                        <span class="badge badge-${this.getStatusBadgeClass(task.status)}">
                            ${StringUtils.capitalize(task.status.replace('_', ' '))}
                        </span>
                    </div>
                </div>
                
                <div class="task-content">
                    <p class="task-description">${StringUtils.escapeHtml(task.description)}</p>
                    
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-user"></i>
                            <span>${StringUtils.escapeHtml(task.assigned_to_name)}</span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-calendar"></i>
                            <span class="${dueDateClass}">
                                Due: ${DateTimeUtils.formatDate(task.due_date, 'short')}
                            </span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${StringUtils.capitalize(task.category)}</span>
                        </div>
                    </div>

                    ${task.progress !== undefined ? `
                        <div class="task-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${task.progress}%"></div>
                            </div>
                            <span class="progress-text">${task.progress}%</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-actions">
                    ${task.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" data-task-action="update-status" data-task-id="${task.id}" data-new-status="in_progress">
                            <i class="fas fa-play"></i> Start
                        </button>
                    ` : ''}
                    
                    ${task.status === 'in_progress' ? `
                        <button class="btn btn-sm btn-success" data-task-action="update-status" data-task-id="${task.id}" data-new-status="completed">
                            <i class="fas fa-check"></i> Complete
                        </button>
                        <button class="btn btn-sm btn-warning" data-task-action="update-status" data-task-id="${task.id}" data-new-status="on_hold">
                            <i class="fas fa-pause"></i> Hold
                        </button>
                    ` : ''}
                    
                    ${task.status === 'on_hold' ? `
                        <button class="btn btn-sm btn-primary" data-task-action="update-status" data-task-id="${task.id}" data-new-status="in_progress">
                            <i class="fas fa-play"></i> Resume
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-sm btn-outline" data-task-action="view-details" data-task-id="${task.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    
                    <button class="btn btn-sm btn-outline" data-task-action="add-comment" data-task-id="${task.id}">
                        <i class="fas fa-comment"></i> 
                        ${task.comments && task.comments.length ? `(${task.comments.length})` : ''}
                    </button>
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
        try {
            const stats = this.calculateTaskStats();
            
            // Update dashboard stats if elements exist
            const elements = {
                'totalTasks': stats.total,
                'pendingTasks': stats.pending,
                'inProgressTasks': stats.inProgress,
                'completedTasks': stats.completed,
                'overdueTasks': stats.overdue
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || '0';
                }
            });

            // Update progress chart if exists
            const progressChart = document.getElementById('taskProgressChart');
            if (progressChart && typeof Chart !== 'undefined') {
                this.updateTaskChart(stats);
            }
        } catch (error) {
            console.error('Error updating task stats:', error);
        }
    }

    calculateTaskStats() {
        const now = new Date();
        
        return {
            total: this.tasks.length,
            pending: this.tasks.filter(t => t.status === 'pending').length,
            inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
            completed: this.tasks.filter(t => t.status === 'completed').length,
            onHold: this.tasks.filter(t => t.status === 'on_hold').length,
            cancelled: this.tasks.filter(t => t.status === 'cancelled').length,
            overdue: this.tasks.filter(t => 
                new Date(t.due_date) < now && t.status !== 'completed'
            ).length,
            highPriority: this.tasks.filter(t => t.priority === 'high').length,
            mediumPriority: this.tasks.filter(t => t.priority === 'medium').length,
            lowPriority: this.tasks.filter(t => t.priority === 'low').length
        };
    }

    getTaskById(taskId) {
        return this.tasks.find(t => t.id === taskId) || null;
    }

    viewTaskDetails(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) {
            showNotification('Task not found', 'error');
            return;
        }

        const modalContent = `
            <div class="task-details">
                <h4>${StringUtils.escapeHtml(task.title)}</h4>
                <p>${StringUtils.escapeHtml(task.description)}</p>
                
                <div class="task-details-grid">
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="badge badge-${this.getStatusBadgeClass(task.status)}">
                            ${StringUtils.capitalize(task.status.replace('_', ' '))}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Priority:</label>
                        <span class="priority-${task.priority}">${StringUtils.capitalize(task.priority)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Assigned To:</label>
                        <span>${StringUtils.escapeHtml(task.assigned_to_name)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Due Date:</label>
                        <span>${DateTimeUtils.formatDate(task.due_date, 'long')}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category:</label>
                        <span>${StringUtils.capitalize(task.category)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Progress:</label>
                        <span>${task.progress || 0}%</span>
                    </div>
                </div>

                ${task.comments && task.comments.length > 0 ? `
                    <div class="task-comments">
                        <h5>Comments (${task.comments.length})</h5>
                        <div class="comments-list">
                            ${task.comments.map(comment => `
                                <div class="comment-item">
                                    <div class="comment-header">
                                        <strong>${StringUtils.escapeHtml(comment.author)}</strong>
                                        <small>${DateTimeUtils.formatDate(comment.timestamp, 'relative')}</small>
                                    </div>
                                    <p>${StringUtils.escapeHtml(comment.text)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        UIUtils.showModal(modalContent, 'Task Details');
    }

    showAddCommentModal(taskId) {
        const modalContent = `
            <form id="addCommentForm">
                <input type="hidden" name="taskId" value="${taskId}">
                <div class="form-group">
                    <label for="commentText">Add Comment:</label>
                    <textarea id="commentText" name="commentText" class="form-control" rows="3" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Comment</button>
                </div>
            </form>
        `;

        const modal = UIUtils.showModal(modalContent, 'Add Comment');
        
        // Handle form submission
        const form = modal.querySelector('#addCommentForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const taskId = formData.get('taskId');
            const commentText = formData.get('commentText');
            
            this.addTaskComment(taskId, commentText).then(success => {
                if (success) {
                    modal.remove();
                }
            });
        });
    }

    async deleteTask(taskId) {
        const confirmed = await UIUtils.confirm('Are you sure you want to delete this task?', 'Delete Task');
        if (!confirmed) return;

        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            showNotification('Task not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');
        
        try {
            // Remove from array
            this.tasks.splice(taskIndex, 1);

            if (userData.isDemo) {
                StorageUtils.setLocal(`tasks_${userData.id}`, this.tasks);
            } else {
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.TASKS)
                    .delete()
                    .eq('id', taskId);

                if (error) throw error;
            }

            this.renderTasks();
            this.updateTaskStats();
            showNotification('Task deleted successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Failed to delete task: ' + error.message, 'error');
            return false;
        }
    }

    // Export tasks to CSV
    exportTasks() {
        try {
            const csvContent = this.generateTasksCSV();
            const userData = StorageUtils.getLocal('currentUser');
            const filename = `tasks_${userData.name.replace(/\s+/g, '_')}_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
            
            if (downloadFile(csvContent, filename, 'text/csv')) {
                showNotification('Tasks exported successfully!', 'success');
            } else {
                showNotification('Export failed', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Export failed: ' + error.message, 'error');
        }
    }

    generateTasksCSV() {
        const headers = ['Title', 'Description', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Category', 'Progress', 'Created Date'];
        const rows = this.tasks.map(task => [
            task.title,
            task.description,
            task.status,
            task.priority,
            task.assigned_to_name,
            DateTimeUtils.formatDate(task.due_date),
            task.category,
            task.progress || 0,
            DateTimeUtils.formatDate(task.created_at)
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    // Cleanup method
    destroy() {
        try {
            // Remove event listeners
            const taskForm = document.getElementById('createTaskForm');
            if (taskForm && this.handleCreateTaskBound) {
                taskForm.removeEventListener('submit', this.handleCreateTaskBound);
            }

            const filterSelects = document.querySelectorAll('.task-filter');
            filterSelects.forEach(select => {
                if (this.handleFilterChangeBound) {
                    select.removeEventListener('change', this.handleFilterChangeBound);
                }
            });

            const searchInput = document.getElementById('taskSearch');
            if (searchInput && this.handleSearchBound) {
                searchInput.removeEventListener('input', this.handleSearchBound);
            }

            if (this.handleTaskActionBound) {
                document.removeEventListener('click', this.handleTaskActionBound);
            }

            // Clear timeouts
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Initialize task manager when DOM is loaded
let taskManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        taskManager = new TaskManager();
        window.taskManager = taskManager;
    } catch (error) {
        console.error('Task manager initialization error:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (taskManager && typeof taskManager.destroy === 'function') {
        taskManager.destroy();
    }
});

console.log('Task management system loaded successfully');
