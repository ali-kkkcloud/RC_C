// File Name: js/admin-functions.js (FIXED VERSION)

// Admin Functions with Real Database Integration

class AdminManager {
    constructor() {
        this.employees = [];
        this.systemSettings = {};
        this.analytics = {};
        
        this.initializeAdmin();
    }

    async initializeAdmin() {
        await this.loadEmployees();
        await this.loadSystemSettings();
        await this.loadAnalytics();
        this.updateDashboardStats();
        this.setupAdminEventListeners();
    }

    // FIXED: Real Database Loading
    async loadEmployees() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            if (userData.isDemo) {
                // Demo account - load mock data
                this.employees = StorageUtils.getLocal('admin_employees', this.getMockEmployees());
            } else {
                // Real account - load from database
                const { data, error } = await supabase
                    .from('employees')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.employees = data || [];
            }
            
            this.refreshEmployeeTable();
        } catch (error) {
            console.error('Error loading employees:', error);
            showNotification('Failed to load employees', 'error');
            this.employees = this.getMockEmployees(); // Fallback to mock data
        }
    }

    // FIXED: Real Employee Stats
    async loadEmployeeStats() {
        try {
            if (this.employees.length === 0) {
                await this.loadEmployees();
            }

            const totalEmployees = this.employees.length;
            const activeEmployees = this.employees.filter(emp => emp.status === 'active').length;
            const presentToday = Math.floor(activeEmployees * 0.85); // Mock attendance for demo

            // Update dashboard elements
            const totalEmp = document.getElementById('totalEmployees');
            const presentEmp = document.getElementById('presentToday');
            
            if (totalEmp) totalEmp.textContent = totalEmployees;
            if (presentEmp) presentEmp.textContent = presentToday;

        } catch (error) {
            console.error('Error loading employee stats:', error);
            showNotification('Failed to load employee statistics', 'error');
        }
    }

    // FIXED: Real Attendance Stats
    async loadAttendanceStats() {
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', new Date().toISOString().split('T')[0]);

            if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
                throw error;
            }

            const todayAttendance = data || [];
            const presentCount = todayAttendance.filter(att => att.status === 'present').length;
            const lateCount = todayAttendance.filter(att => att.status === 'late').length;

            // Update attendance dashboard if elements exist
            const presentElement = document.getElementById('presentToday');
            const lateElement = document.getElementById('lateToday');
            
            if (presentElement) presentElement.textContent = presentCount;
            if (lateElement) lateElement.textContent = lateCount;

        } catch (error) {
            console.error('Error loading attendance stats:', error);
        }
    }

    // FIXED: Real Task Stats
    async loadTaskStats() {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('status');

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            const tasks = data || [];
            const pendingTasks = tasks.filter(task => task.status === 'pending').length;
            const completedTasks = tasks.filter(task => task.status === 'completed').length;
            const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;

            // Update task stats
            const pendingElement = document.getElementById('pendingTasks');
            const completedElement = document.getElementById('completedTasks');
            const inProgressElement = document.getElementById('inProgressTasks');

            if (pendingElement) pendingElement.textContent = pendingTasks;
            if (completedElement) completedElement.textContent = completedTasks;
            if (inProgressElement) inProgressElement.textContent = inProgressTasks;

        } catch (error) {
            console.error('Error loading task stats:', error);
        }
    }

    // FIXED: Real Employee Addition
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
            phone: employeeData.phone || '',
            performance_score: 0,
            attendance_rate: 0,
            created_at: new Date().toISOString()
        };

        try {
            if (userData.isDemo) {
                // Demo account - add to local storage
                this.employees.push(newEmployee);
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - add to database
                const { data, error } = await supabase
                    .from('employees')
                    .insert([newEmployee])
                    .select()
                    .single();

                if (error) throw error;
                this.employees.push(data);
                
                // Also register user account if password provided
                if (employeeData.password && window.authManager) {
                    try {
                        await window.authManager.registerUser({
                            ...employeeData,
                            password: employeeData.password
                        });
                    } catch (authError) {
                        console.warn('Auth registration failed:', authError);
                        // Don't fail the employee creation if auth fails
                    }
                }
            }

            this.refreshEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee added successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error adding employee:', error);
            showNotification('Failed to add employee: ' + error.message, 'error');
            return false;
        }
    }

    // FIXED: Real Employee Update
    async updateEmployee(employeeId, updateData) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
        if (employeeIndex === -1) {
            showNotification('Employee not found', 'error');
            return false;
        }

        const userData = StorageUtils.getLocal('currentUser');

        try {
            // Update local data
            this.employees[employeeIndex] = { 
                ...this.employees[employeeIndex], 
                ...updateData,
                updated_at: new Date().toISOString()
            };

            if (userData.isDemo) {
                // Demo account - update local storage
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - update database
                const { error } = await supabase
                    .from('employees')
                    .update({
                        ...updateData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', employeeId);

                if (error) throw error;
            }

            this.refreshEmployeeTable();
            showNotification('Employee updated successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error updating employee:', error);
            showNotification('Failed to update employee: ' + error.message, 'error');
            return false;
        }
    }

    // FIXED: Real Employee Deletion
    async deleteEmployee(employeeId) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
        if (employeeIndex === -1) {
            showNotification('Employee not found', 'error');
            return false;
        }

        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
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
                    .from('employees')
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
            showNotification('Failed to delete employee: ' + error.message, 'error');
            return false;
        }
    }

    // FIXED: Real Employee Table Rendering
    refreshEmployeeTable() {
        const tableBody = document.getElementById('employeesTableBody');
        if (!tableBody) return;

        if (this.employees.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div style="padding: 40px;">
                            <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
                            <p style="color: #666; margin: 0;">No employees found</p>
                            <button class="btn btn-primary mt-15" onclick="showAddEmployeeModal()">
                                <i class="fas fa-plus"></i> Add First Employee
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.employees.map(employee => `
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
                    <span class="badge badge-${employee.status === 'active' ? 'success' : 'danger'}">
                        <i class="fas fa-circle"></i>
                        ${StringUtils.capitalize(employee.status)}
                    </span>
                </td>
                <td>${DateTimeUtils.formatDate(employee.created_at || new Date())}</td>
                <td>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${employee.performance_score || 0}%"></div>
                    </div>
                    <small>${employee.performance_score || 0}%</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editEmployee('${employee.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${employee.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewEmployeeDetails('${employee.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // FIXED: Dashboard Stats Update
    updateDashboardStats() {
        const activeEmployees = this.employees.filter(emp => emp.status === 'active');
        const totalEmployees = this.employees.length;
        
        const avgPerformance = activeEmployees.length > 0 
            ? activeEmployees.reduce((sum, emp) => sum + (emp.performance_score || 0), 0) / activeEmployees.length
            : 0;
            
        const avgAttendance = activeEmployees.length > 0
            ? activeEmployees.reduce((sum, emp) => sum + (emp.attendance_rate || 0), 0) / activeEmployees.length
            : 0;

        // Update dashboard elements if they exist
        const elements = {
            'totalEmployees': totalEmployees,
            'activeEmployees': activeEmployees.length,
            'avgPerformance': Math.round(avgPerformance),
            'avgAttendance': Math.round(avgAttendance)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // Mock data for demo accounts
    getMockEmployees() {
        return [
            {
                id: 'emp_001',
                name: 'John Doe',
                email: 'john.doe@company.com',
                department: 'IT Department',
                role: 'employee',
                status: 'active',
                hire_date: '2024-01-15',
                phone: '+1 (555) 123-4567',
                performance_score: 85,
                attendance_rate: 92,
                created_at: '2024-01-15T10:00:00Z'
            },
            {
                id: 'emp_002',
                name: 'Jane Smith',
                email: 'jane.smith@company.com',
                department: 'HR',
                role: 'manager',
                status: 'active',
                hire_date: '2023-06-20',
                phone: '+1 (555) 987-6543',
                performance_score: 94,
                attendance_rate: 96,
                created_at: '2023-06-20T09:00:00Z'
            },
            {
                id: 'emp_003',
                name: 'Mike Johnson',
                email: 'mike.johnson@company.com',
                department: 'Finance',
                role: 'employee',
                status: 'inactive',
                hire_date: '2023-02-14',
                phone: '+1 (555) 654-3210',
                performance_score: 72,
                attendance_rate: 75,
                created_at: '2023-02-14T11:00:00Z'
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
                break_duration: 60
            },
            attendance: {
                late_threshold: 15,
                early_checkout_threshold: 30
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
        
        return {
            totalEmployees,
            activeEmployees: activeEmployees.length,
            inactiveEmployees: totalEmployees - activeEmployees.length,
            avgPerformance: activeEmployees.length > 0 
                ? Math.round(activeEmployees.reduce((sum, emp) => sum + (emp.performance_score || 0), 0) / activeEmployees.length)
                : 0,
            avgAttendance: activeEmployees.length > 0
                ? Math.round(activeEmployees.reduce((sum, emp) => sum + (emp.attendance_rate || 0), 0) / activeEmployees.length)
                : 0
        };
    }

    setupAdminEventListeners() {
        // Employee management events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="edit-employee"]') || e.target.closest('[onclick*="editEmployee"]')) {
                const employeeId = e.target.dataset.employeeId || 
                    e.target.closest('button').onclick.toString().match(/'([^']+)'/)?.[1];
                if (employeeId) this.showEditEmployeeModal(employeeId);
            } else if (e.target.matches('[data-action="delete-employee"]') || e.target.closest('[onclick*="deleteEmployee"]')) {
                const employeeId = e.target.dataset.employeeId || 
                    e.target.closest('button').onclick.toString().match(/'([^']+)'/)?.[1];
                if (employeeId) this.deleteEmployee(employeeId);
            }
        });
    }

    showEditEmployeeModal(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            showNotification('Employee not found', 'error');
            return;
        }

        // Pre-fill the add employee modal with existing data
        document.getElementById('employeeName').value = employee.name;
        document.getElementById('employeeEmail').value = employee.email;
        document.getElementById('employeeDepartment').value = employee.department;
        document.getElementById('employeeRole').value = employee.role;
        document.getElementById('employeePhone').value = employee.phone || '';
        document.getElementById('employeeHireDate').value = employee.hire_date;

        // Change modal title and button text
        document.querySelector('#addEmployeeModal .modal-title').textContent = 'Edit Employee';
        document.querySelector('#addEmployeeModal .btn-primary').textContent = 'Update Employee';
        document.querySelector('#addEmployeeModal .btn-primary').onclick = () => this.saveEmployeeEdit(employeeId);

        // Show password field as optional for edits
        const passwordField = document.getElementById('employeePassword');
        if (passwordField) {
            passwordField.required = false;
            passwordField.placeholder = 'Leave blank to keep current password';
        }

        // Show modal
        document.getElementById('addEmployeeModal').style.display = 'flex';
    }

    async saveEmployeeEdit(employeeId) {
        const formData = {
            name: document.getElementById('employeeName').value,
            email: document.getElementById('employeeEmail').value,
            department: document.getElementById('employeeDepartment').value,
            role: document.getElementById('employeeRole').value,
            phone: document.getElementById('employeePhone').value,
            hire_date: document.getElementById('employeeHireDate').value
        };

        if (await this.updateEmployee(employeeId, formData)) {
            this.closeModal('addEmployeeModal');
            this.resetEmployeeModal();
        }
    }

    resetEmployeeModal() {
        // Reset modal to add mode
        document.querySelector('#addEmployeeModal .modal-title').textContent = 'Add New Employee';
        document.querySelector('#addEmployeeModal .btn-primary').textContent = 'Add Employee';
        document.querySelector('#addEmployeeModal .btn-primary').onclick = () => window.saveEmployee();
        
        const passwordField = document.getElementById('employeePassword');
        if (passwordField) {
            passwordField.required = true;
            passwordField.placeholder = 'Temporary password for the employee';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    filterEmployees(searchTerm) {
        if (!searchTerm) {
            this.refreshEmployeeTable();
            return;
        }

        const filteredEmployees = this.employees.filter(employee => 
            employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.department.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const tableBody = document.getElementById('employeesTableBody');
        if (!tableBody) return;

        if (filteredEmployees.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p style="color: #666; padding: 20px;">No employees found matching "${searchTerm}"</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Render filtered employees (same as refreshEmployeeTable but with filtered data)
        tableBody.innerHTML = filteredEmployees.map(employee => `
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
                    <span class="badge badge-${employee.status === 'active' ? 'success' : 'danger'}">
                        <i class="fas fa-circle"></i>
                        ${StringUtils.capitalize(employee.status)}
                    </span>
                </td>
                <td>${DateTimeUtils.formatDate(employee.created_at || new Date())}</td>
                <td>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${employee.performance_score || 0}%"></div>
                    </div>
                    <small>${employee.performance_score || 0}%</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editEmployee('${employee.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${employee.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewEmployeeDetails('${employee.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Backup functionality
    async performSystemBackup() {
        try {
            UIUtils.showLoading('Creating system backup...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                employees: this.employees,
                settings: this.systemSettings,
                metadata: {
                    totalEmployees: this.employees.length,
                    activeEmployees: this.employees.filter(emp => emp.status === 'active').length
                }
            };

            const filename = `system_backup_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD-HH-mm')}.json`;
            downloadFile(JSON.stringify(backupData, null, 2), filename, 'application/json');
            
            UIUtils.hideLoading();
            showNotification('System backup created successfully!', 'success');
            
        } catch (error) {
            UIUtils.hideLoading();
            console.error('Backup error:', error);
            showNotification('Failed to create backup', 'error');
        }
    }
}

// Global functions for onclick handlers
window.editEmployee = function(employeeId) {
    if (window.adminManager) {
        window.adminManager.showEditEmployeeModal(employeeId);
    }
};

window.deleteEmployee = function(employeeId) {
    if (window.adminManager) {
        window.adminManager.deleteEmployee(employeeId);
    }
};

window.viewEmployeeDetails = function(employeeId) {
    if (window.adminManager) {
        const employee = window.adminManager.employees.find(emp => emp.id === employeeId);
        if (employee) {
            showNotification(`Viewing details for ${employee.name}`, 'info');
            // Here you could open a detailed view modal
        }
    }
};

window.filterEmployees = function(searchTerm) {
    if (window.adminManager) {
        window.adminManager.filterEmployees(searchTerm);
    }
};

window.saveEmployee = async function() {
    if (!window.adminManager) return;

    const formData = {
        name: document.getElementById('employeeName').value,
        email: document.getElementById('employeeEmail').value,
        department: document.getElementById('employeeDepartment').value,
        role: document.getElementById('employeeRole').value,
        phone: document.getElementById('employeePhone').value,
        hire_date: document.getElementById('employeeHireDate').value,
        password: document.getElementById('employeePassword').value
    };

    // Validate form
    if (!formData.name || !formData.email || !formData.department || !formData.role || !formData.hire_date || !formData.password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (!ValidationUtils.isEmail(formData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (await window.adminManager.addEmployee(formData)) {
        window.adminManager.closeModal('addEmployeeModal');
        document.getElementById('addEmployeeForm').reset();
    }
};

window.showAddEmployeeModal = function() {
    if (window.adminManager) {
        window.adminManager.resetEmployeeModal();
        document.getElementById('addEmployeeModal').style.display = 'flex';
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

console.log('Admin Functions (Fixed) loaded successfully');
