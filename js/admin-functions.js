// File Name: js/admin-functions.js

// Admin-only Functions and Features

class AdminManager {
    constructor() {
        this.employees = [];
        this.systemSettings = {};
        this.analytics = {};
        
        this.initializeAdmin();
    }

    async initializeAdmin() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData || userData.role !== 'admin') {
            console.warn('Admin functions are only available for admin users');
            return;
        }

        await this.loadEmployees();
        await this.loadSystemSettings();
        await this.loadAnalytics();
        this.setupAdminEventListeners();
    }

    async loadEmployees() {
        const userData = StorageUtils.getLocal('currentUser');
        
        try {
            if (userData.isDemo) {
                // Demo account - load mock employees
                this.employees = this.getMockEmployees();
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - load from database
                const { data, error } = await supabase
                    .from(TABLES.EMPLOYEES)
                    .select('*')
                    .order('name');

                if (error) throw error;
                this.employees = data || [];
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = this.getMockEmployees();
        }
    }

    getMockEmployees() {
        return [
            {
                id: 'emp_001',
                name: 'John Doe',
                email: 'john@company.com',
                department: 'IT Department',
                role: 'employee',
                status: 'active',
                hire_date: '2023-01-15',
                phone: '+1 (555) 123-4567',
                performance_score: 85,
                last_active: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
                attendance_rate: 92,
                completed_tasks: 45,
                pending_tasks: 3
            },
            {
                id: 'emp_002',
                name: 'Sarah Wilson',
                email: 'sarah@company.com',
                department: 'Marketing',
                role: 'employee',
                status: 'active',
                hire_date: '2023-03-20',
                phone: '+1 (555) 987-6543',
                performance_score: 92,
                last_active: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                attendance_rate: 96,
                completed_tasks: 52,
                pending_tasks: 2
            },
            {
                id: 'emp_003',
                name: 'Mike Johnson',
                email: 'mike@company.com',
                department: 'Sales',
                role: 'employee',
                status: 'active',
                hire_date: '2022-11-10',
                phone: '+1 (555) 456-7890',
                performance_score: 78,
                last_active: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                attendance_rate: 88,
                completed_tasks: 38,
                pending_tasks: 7
            },
            {
                id: 'emp_004',
                name: 'Lisa Chen',
                email: 'lisa@company.com',
                department: 'HR',
                role: 'manager',
                status: 'active',
                hire_date: '2022-06-01',
                phone: '+1 (555) 321-0987',
                performance_score: 95,
                last_active: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
                attendance_rate: 98,
                completed_tasks: 67,
                pending_tasks: 1
            },
            {
                id: 'emp_005',
                name: 'David Brown',
                email: 'david@company.com',
                department: 'Finance',
                role: 'employee',
                status: 'inactive',
                hire_date: '2023-02-14',
                phone: '+1 (555) 654-3210',
                performance_score: 72,
                last_active: new Date(Date.now() - 86400000 * 7).toISOString(), // 1 week ago
                attendance_rate: 75,
                completed_tasks: 25,
                pending_tasks: 12
            }
        ];
    }

    async loadSystemSettings() {
        try {
            this.systemSettings = StorageUtils.getLocal('system_settings', this.getDefaultSettings());
        } catch (error) {
            console.error('Error loading system settings:', error);
            this.systemSettings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            company_name: 'Your Company',
            work_hours: {
                start_time: '09:00',
                end_time: '17:00',
                break_duration: 60 // minutes
            },
            attendance: {
                late_threshold: 15, // minutes
                early_checkout_threshold: 30 // minutes
            },
            notifications: {
                email_enabled: true,
                push_enabled: true,
                shift_reminders: true
            },
            backup: {
                auto_backup: true,
                backup_frequency: 'daily',
                retention_days: 30
            }
        };
    }

    async loadAnalytics() {
        try {
            this.analytics = this.calculateAnalytics();
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.analytics = {};
        }
    }

    calculateAnalytics() {
        const activeEmployees = this.employees.filter(emp => emp.status === 'active');
        const totalEmployees = this.employees.length;
        
        const avgPerformance = activeEmployees.length > 0 
            ? activeEmployees.reduce((sum, emp) => sum + emp.performance_score, 0) / activeEmployees.length
            : 0;
            
        const avgAttendance = activeEmployees.length > 0
            ? activeEmployees.reduce((sum, emp) => sum + emp.attendance_rate, 0) / activeEmployees.length
            : 0;

        const totalTasks = activeEmployees.reduce((sum, emp) => sum + emp.completed_tasks + emp.pending_tasks, 0);
        const completedTasks = activeEmployees.reduce((sum, emp) => sum + emp.completed_tasks, 0);
        const pendingTasks = activeEmployees.reduce((sum, emp) => sum + emp.pending_tasks, 0);

        // Calculate employees present today (mock data)
        const presentToday = Math.floor(activeEmployees.length * 0.85);

        return {
            totalEmployees,
            activeEmployees: activeEmployees.length,
            inactiveEmployees: totalEmployees - activeEmployees.length,
            presentToday,
            avgPerformance: Math.round(avgPerformance),
            avgAttendance: Math.round(avgAttendance),
            totalTasks,
            completedTasks,
            pendingTasks,
            taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    }

    setupAdminEventListeners() {
        // Employee management events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="edit-employee"]')) {
                const employeeId = e.target.dataset.employeeId;
                this.showEditEmployeeModal(employeeId);
            } else if (e.target.matches('[data-action="delete-employee"]')) {
                const employeeId = e.target.dataset.employeeId;
                this.confirmDeleteEmployee(employeeId);
            } else if (e.target.matches('[data-action="toggle-employee-status"]')) {
                const employeeId = e.target.dataset.employeeId;
                this.toggleEmployeeStatus(employeeId);
            }
        });

        // Settings form submission
        const settingsForm = document.getElementById('systemSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', this.handleSettingsUpdate.bind(this));
        }
    }

    async addEmployee(employeeData) {
        const userData = StorageUtils.getLocal('currentUser');
        
        const newEmployee = {
            id: StringUtils.generateId('emp'),
            name: employeeData.name,
            email: employeeData.email,
            department: employeeData.department,
            role: employeeData.role,
            status: 'active',
            hire_date: employeeData.hire_date,
            phone: employeeData.phone,
            performance_score: 0,
            last_active: new Date().toISOString(),
            attendance_rate: 0,
            completed_tasks: 0,
            pending_tasks: 0
        };

        try {
            if (userData.isDemo) {
                // Demo account - add to local storage
                this.employees.push(newEmployee);
                StorageUtils.setLocal('admin_employees', this.employees);
                
                // Also try to register with auth system
                if (window.authManager) {
                    await window.authManager.registerUser({
                        ...employeeData,
                        password: employeeData.password
                    });
                }
            } else {
                // Real account - add to database
                const { data, error } = await supabase
                    .from(TABLES.EMPLOYEES)
                    .insert([newEmployee])
                    .select()
                    .single();

                if (error) throw error;
                this.employees.push(data);
                
                // Register user account
                if (window.authManager) {
                    await window.authManager.registerUser({
                        ...employeeData,
                        password: employeeData.password
                    });
                }
            }

            this.refreshEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee added successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error adding employee:', error);
            showNotification('Failed to add employee', 'error');
            return false;
        }
    }

    async updateEmployee(employeeId, updateData) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
        if (employeeIndex === -1) {
            showNotification('Employee not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');

        try {
            // Update local data
            this.employees[employeeIndex] = { ...this.employees[employeeIndex], ...updateData };

            if (userData.isDemo) {
                // Demo account - update local storage
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - update database
                const { error } = await supabase
                    .from(TABLES.EMPLOYEES)
                    .update(updateData)
                    .eq('id', employeeId);

                if (error) throw error;
            }

            this.refreshEmployeeTable();
            showNotification('Employee updated successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error updating employee:', error);
            showNotification('Failed to update employee', 'error');
            return false;
        }
    }

    async deleteEmployee(employeeId) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
        if (employeeIndex === -1) {
            showNotification('Employee not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');

        try {
            // Remove from local array
            this.employees.splice(employeeIndex, 1);

            if (userData.isDemo) {
                // Demo account - update local storage
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - delete from database
                const { error } = await supabase
                    .from(TABLES.EMPLOYEES)
                    .delete()
                    .eq('id', employeeId);

                if (error) throw error;
            }

            this.refreshEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee deleted successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error deleting employee:', error);
            showNotification('Failed to delete employee', 'error');
            return false;
        }
    }

    async toggleEmployeeStatus(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return false;

        const newStatus = employee.status === 'active' ? 'inactive' : 'active';
        return await this.updateEmployee(employeeId, { status: newStatus });
    }

    showEditEmployeeModal(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const modalContent = `
            <form id="editEmployeeForm">
                <input type="hidden" name="employeeId" value="${employee.id}">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="editName">Full Name</label>
                        <input type="text" id="editName" name="name" class="form-control" value="${employee.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email Address</label>
                        <input type="email" id="editEmail" name="email" class="form-control" value="${employee.email}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="editDepartment">Department</label>
                        <select id="editDepartment" name="department" class="form-control" required>
                            <option value="IT" ${employee.department === 'IT' ? 'selected' : ''}>IT Department</option>
                            <option value="HR" ${employee.department === 'HR' ? 'selected' : ''}>Human Resources</option>
                            <option value="Finance" ${employee.department === 'Finance' ? 'selected' : ''}>Finance</option>
                            <option value="Marketing" ${employee.department === 'Marketing' ? 'selected' : ''}>Marketing</option>
                            <option value="Sales" ${employee.department === 'Sales' ? 'selected' : ''}>Sales</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editRole">Role</label>
                        <select id="editRole" name="role" class="form-control" required>
                            <option value="employee" ${employee.role === 'employee' ? 'selected' : ''}>Employee</option>
                            <option value="manager" ${employee.role === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="admin" ${employee.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="editPhone">Phone Number</label>
                        <input type="tel" id="editPhone" name="phone" class="form-control" value="${employee.phone}">
                    </div>
                    <div class="form-group">
                        <label for="editStatus">Status</label>
                        <select id="editStatus" name="status" class="form-control">
                            <option value="active" ${employee.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${employee.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Employee</button>
                </div>
            </form>
        `;

        const modal = UIUtils.showModal(modalContent, 'Edit Employee');
        
        // Handle form submission
        const form = document.getElementById('editEmployeeForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const updateData = {
                name: formData.get('name'),
                email: formData.get('email'),
                department: formData.get('department'),
                role: formData.get('role'),
                phone: formData.get('phone'),
                status: formData.get('status')
            };

            const success = await this.updateEmployee(employeeId, updateData);
            if (success) {
                modal.remove();
            }
        });
    }

    async confirmDeleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const confirmed = await UIUtils.confirm(
            `Are you sure you want to delete ${employee.name}? This action cannot be undone.`,
            'Delete Employee'
        );

        if (confirmed) {
            await this.deleteEmployee(employeeId);
        }
    }

    refreshEmployeeTable() {
        const tableBody = document.getElementById('employeesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.employees.map(employee => this.renderEmployeeRow(employee)).join('');
    }

    renderEmployeeRow(employee) {
        const lastActiveText = this.getLastActiveText(employee.last_active);
        const statusBadgeClass = employee.status === 'active' ? 'success' : 'danger';
        
        return `
            <tr>
                <td>
                    <div class="employee-info">
                        <div class="employee-avatar">${StringUtils.getInitials(employee.name)}</div>
                        <div>
                            <strong>${employee.name}</strong>
                            <br><small>${employee.email}</small>
                        </div>
                    </div>
                </td>
                <td>${employee.department}</td>
                <td>
                    <span class="badge badge-${statusBadgeClass}">
                        ${StringUtils.capitalize(employee.status)}
                    </span>
                </td>
                <td>${lastActiveText}</td>
                <td>
                    <div class="performance-display">
                        <div class="progress-bar-small">
                            <div class="progress-fill" style="width: ${employee.performance_score}%"></div>
                        </div>
                        <small>${employee.performance_score}%</small>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" data-action="edit-employee" data-employee-id="${employee.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-employee" data-employee-id="${employee.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    getLastActiveText(lastActive) {
        const now = new Date();
        const lastActiveDate = new Date(lastActive);
        const diffMinutes = Math.floor((now - lastActiveDate) / (1000 * 60));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} mins ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
        return `${Math.floor(diffMinutes / 1440)} days ago`;
    }

    updateDashboardStats() {
        this.analytics = this.calculateAnalytics();
        
        // Update dashboard elements
        const elements = {
            'totalEmployees': this.analytics.totalEmployees,
            'presentToday': this.analytics.presentToday,
            'pendingTasks': this.analytics.pendingTasks,
            'avgPerformance': `${this.analytics.avgPerformance}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    async generateSystemReport(reportType = 'comprehensive') {
        UIUtils.showLoading('Generating report...');
        
        try {
            const report = await this.compileSystemReport(reportType);
            const filename = `system_report_${reportType}_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
            
            downloadFile(JSON.stringify(report, null, 2), filename, 'application/json');
            
            UIUtils.hideLoading();
            showNotification('System report generated successfully!', 'success');
            
        } catch (error) {
            UIUtils.hideLoading();
            console.error('Error generating report:', error);
            showNotification('Failed to generate report', 'error');
        }
    }

    async compileSystemReport(reportType) {
        const report = {
            timestamp: new Date().toISOString(),
            reportType: reportType,
            systemInfo: {
                version: '1.0.0',
                totalUsers: this.employees.length,
                activeUsers: this.employees.filter(emp => emp.status === 'active').length
            },
            analytics: this.analytics,
            employees: this.employees.map(emp => ({
                ...emp,
                // Remove sensitive data from report
                email: emp.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
            }))
        };

        if (reportType === 'comprehensive') {
            // Add more detailed information for comprehensive reports
            report.systemSettings = this.systemSettings;
            report.recentActivity = await this.getRecentActivity();
        }

        return report;
    }

    async getRecentActivity() {
        // Mock recent activity data
        return [
            {
                type: 'login',
                user: 'John Doe',
                timestamp: new Date(Date.now() - 120000).toISOString(),
                details: 'User logged in'
            },
            {
                type: 'task_completed',
                user: 'Sarah Wilson',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                details: 'Completed task: Review Documentation'
            },
            {
                type: 'employee_added',
                user: 'Admin',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                details: 'Added new employee: Mike Johnson'
            }
        ];
    }

    handleSettingsUpdate(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const updatedSettings = {
            company_name: formData.get('company_name'),
            work_hours: {
                start_time: formData.get('start_time'),
                end_time: formData.get('end_time'),
                break_duration: parseInt(formData.get('break_duration'))
            },
            attendance: {
                late_threshold: parseInt(formData.get('late_threshold')),
                early_checkout_threshold: parseInt(formData.get('early_checkout_threshold'))
            },
            notifications: {
                email_enabled: formData.get('email_enabled') === 'on',
                push_enabled: formData.get('push_enabled') === 'on',
                shift_reminders: formData.get('shift_reminders') === 'on'
            },
            backup: {
                auto_backup: formData.get('auto_backup') === 'on',
                backup_frequency: formData.get('backup_frequency'),
                retention_days: parseInt(formData.get('retention_days'))
            }
        };

        try {
            this.systemSettings = updatedSettings;
            StorageUtils.setLocal('system_settings', this.systemSettings);
            
            showNotification('Settings updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating settings:', error);
            showNotification('Failed to update settings', 'error');
        }
    }

    async performSystemBackup() {
        UIUtils.showLoading('Creating backup...');
        
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                employees: this.employees,
                settings: this.systemSettings,
                analytics: this.analytics
            };

            const filename = `system_backup_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD-HH-mm')}.json`;
            downloadFile(JSON.stringify(backupData, null, 2), filename, 'application/json');
            
            UIUtils.hideLoading();
            showNotification('System backup created successfully!', 'success');
            
            // Update last backup time in settings
            this.systemSettings.backup.last_backup = new Date().toISOString();
            StorageUtils.setLocal('system_settings', this.systemSettings);
            
        } catch (error) {
            UIUtils.hideLoading();
            console.error('Error creating backup:', error);
            showNotification('Failed to create backup', 'error');
        }
    }

    getSystemHealth() {
        return {
            database: { status: 'operational', response_time: '145ms' },
            api: { status: 'operational', response_time: '89ms' },
            storage: { status: 'warning', usage: '78%' },
            backup: { 
                status: 'operational', 
                last_backup: this.systemSettings.backup?.last_backup || 'Never'
            }
        };
    }
}

// Global admin manager instance
let adminManager;

// Initialize admin manager
document.addEventListener('DOMContentLoaded', () => {
    const userData = StorageUtils.getLocal('currentUser');
    if (userData && userData.role === 'admin') {
        adminManager = new AdminManager();
    }
});

// Global admin functions
window.showAddEmployeeModal = function() {
    const modalContent = `
        <form id="addEmployeeForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="employeeName">Full Name</label>
                    <input type="text" id="employeeName" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="employeeEmail">Email Address</label>
                    <input type="email" id="employeeEmail" name="email" class="form-control" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="employeeDepartment">Department</label>
                    <select id="employeeDepartment" name="department" class="form-control" required>
                        <option value="">Select Department</option>
                        <option value="IT">IT Department</option>
                        <option value="HR">Human Resources</option>
                        <option value="Finance">Finance</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="employeeRole">Role</label>
                    <select id="employeeRole" name="role" class="form-control" required>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="employeePhone">Phone Number</label>
                    <input type="tel" id="employeePhone" name="phone" class="form-control">
                </div>
                <div class="form-group">
                    <label for="employeeHireDate">Hire Date</label>
                    <input type="date" id="employeeHireDate" name="hire_date" class="form-control" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="employeePassword">Temporary Password</label>
                <input type="password" id="employeePassword" name="password" class="form-control" required>
                <small class="text-muted">Employee will need to change this on first login</small>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Employee</button>
            </div>
        </form>
    `;

    const modal = UIUtils.showModal(modalContent, 'Add New Employee');
    
    // Handle form submission
    const form = document.getElementById('addEmployeeForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const employeeData = {
            name: formData.get('name'),
            email: formData.get('email'),
            department: formData.get('department'),
            role: formData.get('role'),
            phone: formData.get('phone'),
            hire_date: formData.get('hire_date'),
            password: formData.get('password')
        };

        if (adminManager) {
            const success = await adminManager.addEmployee(employeeData);
            if (success) {
                modal.remove();
            }
        }
    });
};

window.editEmployee = function(employeeId) {
    if (adminManager) {
        adminManager.showEditEmployeeModal(employeeId);
    }
};

window.deleteEmployee = function(employeeId) {
    if (adminManager) {
        adminManager.confirmDeleteEmployee(employeeId);
    }
};

window.generateReport = function() {
    if (adminManager) {
        adminManager.generateSystemReport();
    }
};

window.performBackup = function() {
    if (adminManager) {
        adminManager.performSystemBackup();
    }
};

window.closeModal = function() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
};

console.log('Admin functions module loaded successfully');
