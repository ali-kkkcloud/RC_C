// File Name: js/admin-functions.js
// Admin Functions - FIXED VERSION

class AdminManager {
    constructor() {
        this.employees = [];
        this.isLoading = false;
        this.filters = {
            department: 'all',
            status: 'all',
            role: 'all'
        };
        
        this.initializeAdmin();
    }

    async initializeAdmin() {
        try {
            // Check admin privileges
            if (!this.checkAdminAccess()) {
                showNotification('Access denied. Admin privileges required.', 'error');
                setTimeout(() => {
                    window.location.href = 'employee-dashboard.html';
                }, 2000);
                return;
            }

            this.isLoading = true;
            UIUtils.showLoading('Loading admin dashboard...');

            await this.loadEmployees();
            await this.loadDashboardStats();
            this.setupEventListeners();
            this.renderEmployeeTable();
            this.updateDashboardStats();

        } catch (error) {
            console.error('Admin initialization error:', error);
            showNotification('Failed to initialize admin dashboard', 'error');
        } finally {
            this.isLoading = false;
            UIUtils.hideLoading();
        }
    }

    checkAdminAccess() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            return userData && userData.role === 'admin';
        } catch (error) {
            console.error('Access check error:', error);
            return false;
        }
    }

    setupEventListeners() {
        try {
            // Employee management buttons
            document.removeEventListener('click', this.handleAdminActionBound);
            this.handleAdminActionBound = this.handleAdminAction.bind(this);
            document.addEventListener('click', this.handleAdminActionBound);

            // Filter controls
            const filterSelects = document.querySelectorAll('.admin-filter');
            filterSelects.forEach(select => {
                select.removeEventListener('change', this.handleFilterChangeBound);
                this.handleFilterChangeBound = this.handleFilterChange.bind(this);
                select.addEventListener('change', this.handleFilterChangeBound);
            });

            // Search functionality
            const searchInput = document.getElementById('employeeSearch');
            if (searchInput) {
                searchInput.removeEventListener('input', this.handleSearchBound);
                this.handleSearchBound = debounce(this.handleSearch.bind(this), 300);
                searchInput.addEventListener('input', this.handleSearchBound);
            }

            // Form submissions
            const addEmployeeForm = document.getElementById('addEmployeeForm');
            if (addEmployeeForm) {
                addEmployeeForm.removeEventListener('submit', this.handleAddEmployeeBound);
                this.handleAddEmployeeBound = this.handleAddEmployee.bind(this);
                addEmployeeForm.addEventListener('submit', this.handleAddEmployeeBound);
            }

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    handleAdminAction(event) {
        const target = event.target.closest('[data-admin-action]');
        if (!target) return;

        event.preventDefault();
        const action = target.dataset.adminAction;
        const employeeId = target.dataset.employeeId;
        const userId = target.dataset.userId;

        switch (action) {
            case 'add-employee':
                this.showAddEmployeeModal();
                break;
            case 'edit-employee':
                this.editEmployee(employeeId);
                break;
            case 'delete-employee':
                this.deleteEmployee(employeeId);
                break;
            case 'view-employee':
                this.viewEmployeeDetails(employeeId);
                break;
            case 'toggle-status':
                this.toggleEmployeeStatus(employeeId);
                break;
            case 'reset-password':
                this.resetEmployeePassword(employeeId);
                break;
            case 'export-data':
                this.exportEmployeeData();
                break;
            case 'generate-report':
                this.generateReport(target.dataset.reportType);
                break;
            default:
                console.warn('Unknown admin action:', action);
        }
    }

    handleFilterChange(event) {
        const filterType = event.target.dataset.filterType || event.target.name;
        const value = event.target.value;
        
        if (this.filters.hasOwnProperty(filterType)) {
            this.filters[filterType] = value;
            this.renderEmployeeTable();
        }
    }

    handleSearch(event) {
        this.renderEmployeeTable();
    }

    handleAddEmployee(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const employeeData = {
            name: formData.get('name'),
            email: formData.get('email'),
            department: formData.get('department'),
            role: formData.get('role'),
            phone: formData.get('phone'),
            hire_date: formData.get('hire_date'),
            password: formData.get('password')
        };

        this.addEmployee(employeeData).then(success => {
            if (success) {
                event.target.reset();
                this.closeModal('addEmployeeModal');
            }
        });
    }

    async loadEmployees() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            if (userData.isDemo) {
                // Demo account - load mock data
                const existingEmployees = StorageUtils.getLocal('admin_employees', null);
                if (existingEmployees && Array.isArray(existingEmployees)) {
                    this.employees = existingEmployees;
                } else {
                    this.employees = this.getMockEmployees();
                    StorageUtils.setLocal('admin_employees', this.employees);
                }
            } else {
                // Real account - load from database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { data, error } = await window.supabase
                    .from(TABLES.EMPLOYEES)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.employees = data || [];
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            // Fallback to mock data
            this.employees = this.getMockEmployees();
            showNotification('Using demo data - database connection failed', 'warning');
        }
    }

    getMockEmployees() {
        return [
            {
                id: 'emp_001',
                name: 'John Doe',
                email: 'john@company.com',
                department: 'IT',
                role: 'employee',
                status: 'active',
                hire_date: '2023-01-15',
                phone: '+1 (555) 123-4567',
                performance_score: 85,
                last_active: DateTimeUtils.addDays(new Date(), -1).toISOString(),
                attendance_rate: 92,
                completed_tasks: 45,
                pending_tasks: 3,
                total_training_hours: 24,
                created_at: '2023-01-15T00:00:00.000Z'
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
                last_active: DateTimeUtils.addDays(new Date(), 0).toISOString(),
                attendance_rate: 96,
                completed_tasks: 52,
                pending_tasks: 2,
                total_training_hours: 18,
                created_at: '2023-03-20T00:00:00.000Z'
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
                last_active: DateTimeUtils.addDays(new Date(), -2).toISOString(),
                attendance_rate: 88,
                completed_tasks: 38,
                pending_tasks: 7,
                total_training_hours: 32,
                created_at: '2022-11-10T00:00:00.000Z'
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
                last_active: new Date().toISOString(),
                attendance_rate: 98,
                completed_tasks: 67,
                pending_tasks: 1,
                total_training_hours: 45,
                created_at: '2022-06-01T00:00:00.000Z'
            },
            {
                id: 'emp_005',
                name: 'David Brown',
                email: 'david@company.com',
                department: 'Finance',
                role: 'employee',
                status: 'inactive',
                hire_date: '2023-08-15',
                phone: '+1 (555) 654-3210',
                performance_score: 70,
                last_active: DateTimeUtils.addDays(new Date(), -7).toISOString(),
                attendance_rate: 75,
                completed_tasks: 25,
                pending_tasks: 5,
                total_training_hours: 12,
                created_at: '2023-08-15T00:00:00.000Z'
            }
        ];
    }

    async addEmployee(employeeData) {
        try {
            // Validate required fields
            if (!employeeData.name || !employeeData.email || !employeeData.password) {
                showNotification('Name, email, and password are required', 'error');
                return false;
            }

            if (!ValidationUtils.isEmail(employeeData.email)) {
                showNotification('Please enter a valid email address', 'error');
                return false;
            }

            // Check for duplicate email
            const existingEmployee = this.employees.find(emp => emp.email === employeeData.email);
            if (existingEmployee) {
                showNotification('Employee with this email already exists', 'error');
                return false;
            }

            const userData = StorageUtils.getLocal('currentUser');
            const newEmployee = {
                id: StringUtils.generateId('emp'),
                name: employeeData.name.trim(),
                email: employeeData.email.toLowerCase().trim(),
                department: employeeData.department || 'General',
                role: employeeData.role || 'employee',
                status: 'active',
                hire_date: employeeData.hire_date || DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD'),
                phone: employeeData.phone || null,
                performance_score: 0,
                last_active: null,
                attendance_rate: 0,
                completed_tasks: 0,
                pending_tasks: 0,
                total_training_hours: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (userData.isDemo) {
                // Demo account - add to local storage
                this.employees.unshift(newEmployee);
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - add to database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                // First, create auth user
                if (window.authManager && typeof window.authManager.registerUser === 'function') {
                    const registrationSuccess = await window.authManager.registerUser({
                        email: employeeData.email,
                        password: employeeData.password,
                        name: employeeData.name,
                        role: employeeData.role,
                        department: employeeData.department,
                        phone: employeeData.phone
                    });

                    if (!registrationSuccess) {
                        throw new Error('Failed to create user account');
                    }
                }

                // Add to employees table
                const { data, error } = await window.supabase
                    .from(TABLES.EMPLOYEES)
                    .insert([newEmployee])
                    .select()
                    .single();

                if (error) throw error;
                this.employees.unshift(data);
            }

            this.renderEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee added successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error adding employee:', error);
            showNotification('Failed to add employee: ' + error.message, 'error');
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
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.EMPLOYEES)
                    .update({
                        ...updateData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', employeeId);

                if (error) throw error;
            }

            this.renderEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee updated successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error updating employee:', error);
            showNotification('Failed to update employee: ' + error.message, 'error');
            return false;
        }
    }

    async deleteEmployee(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                showNotification('Employee not found', 'error');
                return false;
            }

            const confirmed = await UIUtils.confirm(
                `Are you sure you want to delete ${employee.name}? This action cannot be undone.`,
                'Delete Employee'
            );

            if (!confirmed) return false;

            const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
            const userData = StorageUtils.getLocal('currentUser');

            // Remove from local array
            this.employees.splice(employeeIndex, 1);

            if (userData.isDemo) {
                // Demo account - update local storage
                StorageUtils.setLocal('admin_employees', this.employees);
            } else {
                // Real account - delete from database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.EMPLOYEES)
                    .delete()
                    .eq('id', employeeId);

                if (error) throw error;
            }

            this.renderEmployeeTable();
            this.updateDashboardStats();
            showNotification('Employee deleted successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error deleting employee:', error);
            showNotification('Failed to delete employee: ' + error.message, 'error');
            return false;
        }
    }

    async toggleEmployeeStatus(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                showNotification('Employee not found', 'error');
                return false;
            }

            const newStatus = employee.status === 'active' ? 'inactive' : 'active';
            await this.updateEmployee(employeeId, { status: newStatus });

        } catch (error) {
            console.error('Error toggling employee status:', error);
            showNotification('Failed to update employee status', 'error');
        }
    }

    async resetEmployeePassword(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                showNotification('Employee not found', 'error');
                return false;
            }

            const confirmed = await UIUtils.confirm(
                `Send password reset email to ${employee.name} (${employee.email})?`,
                'Reset Password'
            );

            if (!confirmed) return false;

            const userData = StorageUtils.getLocal('currentUser');

            if (userData.isDemo) {
                // Demo account - just show notification
                showNotification('Password reset email sent (demo mode)', 'success');
            } else {
                // Real account - send reset email
                if (window.authManager && typeof window.authManager.resetPassword === 'function') {
                    const success = await window.authManager.resetPassword(employee.email);
                    if (success) {
                        showNotification(`Password reset email sent to ${employee.email}`, 'success');
                    }
                } else {
                    throw new Error('Password reset functionality not available');
                }
            }

            return true;

        } catch (error) {
            console.error('Error resetting password:', error);
            showNotification('Failed to send password reset email', 'error');
            return false;
        }
    }

    viewEmployeeDetails(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                showNotification('Employee not found', 'error');
                return;
            }

            const detailsContent = `
                <div class="employee-details">
                    <div class="employee-header">
                        <h4>${StringUtils.escapeHtml(employee.name)}</h4>
                        <span class="badge badge-${employee.status === 'active' ? 'success' : 'danger'}">
                            ${StringUtils.capitalize(employee.status)}
                        </span>
                    </div>
                    
                    <div class="employee-info-grid">
                        <div class="info-item">
                            <label>Email:</label>
                            <span>${StringUtils.escapeHtml(employee.email)}</span>
                        </div>
                        <div class="info-item">
                            <label>Department:</label>
                            <span>${StringUtils.escapeHtml(employee.department)}</span>
                        </div>
                        <div class="info-item">
                            <label>Role:</label>
                            <span>${StringUtils.capitalize(employee.role)}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone:</label>
                            <span>${StringUtils.escapeHtml(employee.phone || 'Not provided')}</span>
                        </div>
                        <div class="info-item">
                            <label>Hire Date:</label>
                            <span>${DateTimeUtils.formatDate(employee.hire_date, 'long')}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Active:</label>
                            <span>${employee.last_active ? DateTimeUtils.formatDate(employee.last_active, 'relative') : 'Never'}</span>
                        </div>
                    </div>

                    <div class="employee-stats">
                        <h5>Performance Statistics</h5>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${employee.performance_score || 0}</div>
                                <div class="stat-label">Performance Score</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${employee.attendance_rate || 0}%</div>
                                <div class="stat-label">Attendance Rate</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${employee.completed_tasks || 0}</div>
                                <div class="stat-label">Completed Tasks</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${employee.total_training_hours || 0}h</div>
                                <div class="stat-label">Training Hours</div>
                            </div>
                        </div>
                    </div>

                    <div class="employee-actions">
                        <button class="btn btn-primary" data-admin-action="edit-employee" data-employee-id="${employee.id}">
                            <i class="fas fa-edit"></i> Edit Employee
                        </button>
                        <button class="btn btn-outline" data-admin-action="reset-password" data-employee-id="${employee.id}">
                            <i class="fas fa-key"></i> Reset Password
                        </button>
                        <button class="btn btn-${employee.status === 'active' ? 'warning' : 'success'}" data-admin-action="toggle-status" data-employee-id="${employee.id}">
                            <i class="fas fa-toggle-${employee.status === 'active' ? 'off' : 'on'}"></i> 
                            ${employee.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </div>
            `;

            UIUtils.showModal(detailsContent, 'Employee Details');

        } catch (error) {
            console.error('View employee details error:', error);
            showNotification('Failed to load employee details', 'error');
        }
    }

    editEmployee(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                showNotification('Employee not found', 'error');
                return;
            }

            const editContent = `
                <form id="editEmployeeForm" class="employee-edit-form">
                    <input type="hidden" name="employeeId" value="${employee.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editName">Full Name</label>
                            <input type="text" id="editName" name="name" class="form-control" value="${StringUtils.escapeHtml(employee.name)}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">Email Address</label>
                            <input type="email" id="editEmail" name="email" class="form-control" value="${StringUtils.escapeHtml(employee.email)}" required>
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
                                <option value="Operations" ${employee.department === 'Operations' ? 'selected' : ''}>Operations</option>
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
                            <input type="tel" id="editPhone" name="phone" class="form-control" value="${StringUtils.escapeHtml(employee.phone || '')}">
                        </div>
                        <div class="form-group">
                            <label for="editStatus">Status</label>
                            <select id="editStatus" name="status" class="form-control" required>
                                <option value="active" ${employee.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${employee.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Employee</button>
                    </div>
                </form>
            `;

            const modal = UIUtils.showModal(editContent, 'Edit Employee');

            // Handle form submission
            const form = modal.querySelector('#editEmployeeForm');
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

        } catch (error) {
            console.error('Edit employee error:', error);
            showNotification('Failed to open employee editor', 'error');
        }
    }

    showAddEmployeeModal() {
        try {
            const modal = document.getElementById('addEmployeeModal');
            if (modal) {
                modal.style.display = 'flex';
            } else {
                console.warn('Add employee modal not found');
            }
        } catch (error) {
            console.error('Show add employee modal error:', error);
        }
    }

    closeModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('Close modal error:', error);
        }
    }

    getFilteredEmployees() {
        try {
            let filteredEmployees = [...this.employees];

            // Search filter
            const searchInput = document.getElementById('employeeSearch');
            if (searchInput && searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase().trim();
                filteredEmployees = filteredEmployees.filter(emp =>
                    emp.name.toLowerCase().includes(searchTerm) ||
                    emp.email.toLowerCase().includes(searchTerm) ||
                    emp.department.toLowerCase().includes(searchTerm)
                );
            }

            // Department filter
            if (this.filters.department !== 'all') {
                filteredEmployees = filteredEmployees.filter(emp => emp.department === this.filters.department);
            }

            // Status filter
            if (this.filters.status !== 'all') {
                filteredEmployees = filteredEmployees.filter(emp => emp.status === this.filters.status);
            }

            // Role filter
            if (this.filters.role !== 'all') {
                filteredEmployees = filteredEmployees.filter(emp => emp.role === this.filters.role);
            }

            return filteredEmployees;
        } catch (error) {
            console.error('Filter employees error:', error);
            return this.employees;
        }
    }

    renderEmployeeTable() {
        try {
            const employeeTableBody = document.getElementById('employeeTableBody');
            if (!employeeTableBody) {
                console.warn('Employee table body not found');
                return;
            }

            if (this.isLoading) {
                employeeTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading employees...</td></tr>';
                return;
            }

            const filteredEmployees = this.getFilteredEmployees();

            if (filteredEmployees.length === 0) {
                employeeTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No employees found</td></tr>';
                return;
            }

            employeeTableBody.innerHTML = filteredEmployees.map(employee => `
                <tr class="employee-row" data-employee-id="${employee.id}">
                    <td>
                        <div class="employee-info">
                            <div class="employee-avatar">
                                ${StringUtils.getInitials(employee.name)}
                            </div>
                            <div class="employee-details">
                                <div class="employee-name">${StringUtils.escapeHtml(employee.name)}</div>
                                <div class="employee-email">${StringUtils.escapeHtml(employee.email)}</div>
                            </div>
                        </div>
                    </td>
                    <td>${StringUtils.escapeHtml(employee.department)}</td>
                    <td>
                        <span class="role-badge ${employee.role}">
                            ${StringUtils.capitalize(employee.role)}
                        </span>
                    </td>
                    <td>
                        <span class="badge badge-${employee.status === 'active' ? 'success' : 'danger'}">
                            ${StringUtils.capitalize(employee.status)}
                        </span>
                    </td>
                    <td>${DateTimeUtils.formatDate(employee.hire_date, 'short')}</td>
                    <td>
                        ${employee.last_active 
                            ? DateTimeUtils.formatDate(employee.last_active, 'relative')
                            : 'Never'
                        }
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" data-admin-action="view-employee" data-employee-id="${employee.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary" data-admin-action="edit-employee" data-employee-id="${employee.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" data-admin-action="reset-password" data-employee-id="${employee.id}" title="Reset Password">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" data-admin-action="delete-employee" data-employee-id="${employee.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Render employee table error:', error);
            const employeeTableBody = document.getElementById('employeeTableBody');
            if (employeeTableBody) {
                employeeTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading employees</td></tr>';
            }
        }
    }

    async loadDashboardStats() {
        try {
            // In a real implementation, this would load various statistics
            // For now, calculate from employee data
            await this.loadEmployees();
        } catch (error) {
            console.error('Load dashboard stats error:', error);
        }
    }

    updateDashboardStats() {
        try {
            const stats = this.calculateDashboardStats();

            const elements = {
                'totalEmployees': stats.totalEmployees,
                'activeEmployees': stats.activeEmployees,
                'totalDepartments': stats.totalDepartments,
                'averagePerformance': stats.averagePerformance + '%'
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });

        } catch (error) {
            console.error('Update dashboard stats error:', error);
        }
    }

    calculateDashboardStats() {
        try {
            const totalEmployees = this.employees.length;
            const activeEmployees = this.employees.filter(emp => emp.status === 'active').length;
            const departments = [...new Set(this.employees.map(emp => emp.department))];
            const avgPerformance = totalEmployees > 0
                ? Math.round(this.employees.reduce((sum, emp) => sum + (emp.performance_score || 0), 0) / totalEmployees)
                : 0;

            return {
                totalEmployees,
                activeEmployees,
                totalDepartments: departments.length,
                averagePerformance: avgPerformance
            };
        } catch (error) {
            console.error('Calculate dashboard stats error:', error);
            return {
                totalEmployees: 0,
                activeEmployees: 0,
                totalDepartments: 0,
                averagePerformance: 0
            };
        }
    }

    exportEmployeeData() {
        try {
            const csvContent = this.generateEmployeeCSV();
            const filename = `employees_export_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
            
            if (downloadFile(csvContent, filename, 'text/csv')) {
                showNotification('Employee data exported successfully!', 'success');
            } else {
                showNotification('Export failed', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Export failed: ' + error.message, 'error');
        }
    }

    generateEmployeeCSV() {
        const headers = [
            'Name', 'Email', 'Department', 'Role', 'Status', 'Hire Date', 
            'Phone', 'Performance Score', 'Attendance Rate', 'Last Active'
        ];
        
        const rows = this.employees.map(emp => [
            emp.name,
            emp.email,
            emp.department,
            emp.role,
            emp.status,
            emp.hire_date,
            emp.phone || '',
            emp.performance_score || 0,
            emp.attendance_rate || 0,
            emp.last_active ? DateTimeUtils.formatDate(emp.last_active) : ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    generateReport(reportType) {
        try {
            showNotification(`Generating ${reportType} report...`, 'info');
            
            // In a real implementation, this would generate comprehensive reports
            setTimeout(() => {
                showNotification(`${StringUtils.capitalize(reportType)} report generated successfully!`, 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Generate report error:', error);
            showNotification('Failed to generate report', 'error');
        }
    }

    // Cleanup method
    destroy() {
        try {
            // Remove event listeners
            if (this.handleAdminActionBound) {
                document.removeEventListener('click', this.handleAdminActionBound);
            }

            const filterSelects = document.querySelectorAll('.admin-filter');
            filterSelects.forEach(select => {
                if (this.handleFilterChangeBound) {
                    select.removeEventListener('change', this.handleFilterChangeBound);
                }
            });

            const searchInput = document.getElementById('employeeSearch');
            if (searchInput && this.handleSearchBound) {
                searchInput.removeEventListener('input', this.handleSearchBound);
            }

            const addEmployeeForm = document.getElementById('addEmployeeForm');
            if (addEmployeeForm && this.handleAddEmployeeBound) {
                addEmployeeForm.removeEventListener('submit', this.handleAddEmployeeBound);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Initialize admin manager when DOM is loaded
let adminManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Only initialize if on admin pages
        if (window.location.pathname.includes('admin')) {
            adminManager = new AdminManager();
            window.adminManager = adminManager;
        }
    } catch (error) {
        console.error('Admin manager initialization error:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (adminManager && typeof adminManager.destroy === 'function') {
        adminManager.destroy();
    }
});

console.log('Admin functions loaded successfully');
