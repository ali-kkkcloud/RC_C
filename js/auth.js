// File Name: js/auth.js

// Authentication Management System

class AuthManager {
    constructor() {
        this.initializeAuth();
        this.setupEventListeners();
    }

    async initializeAuth() {
        // Check if user is already logged in
        const user = await getCurrentUser();
        if (user && window.location.pathname.includes('index.html')) {
            const role = localStorage.getItem('userRole');
            this.redirectToDashboard(role);
        }
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || e.target.closest('.logout-btn')) {
                this.handleLogout();
            }
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Check if it's a demo account
            const demoAccount = this.getDemoAccount(email, password);
            
            if (demoAccount) {
                // Handle demo login
                await this.loginDemo(demoAccount, rememberMe);
            } else {
                // Handle real authentication
                await this.loginReal(email, password, rememberMe);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please check your credentials.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getDemoAccount(email, password) {
        const demoAccounts = {
            'employee@demo.com': {
                password: 'demo123',
                role: 'employee',
                id: 'demo-emp-001',
                name: 'John Doe',
                department: 'IT Department'
            },
            'admin@demo.com': {
                password: 'admin123',
                role: 'admin',
                id: 'demo-admin-001',
                name: 'Admin User',
                department: 'Administration'
            }
        };

        const account = demoAccounts[email];
        if (account && account.password === password) {
            return account;
        }
        return null;
    }

    async loginDemo(account, rememberMe) {
        // Simulate demo user session
        const userData = {
            id: account.id,
            email: account.email,
            name: account.name,
            role: account.role,
            department: account.department,
            isDemo: true
        };

        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('userRole', account.role);
        
        if (rememberMe) {
            localStorage.setItem('rememberLogin', 'true');
        }

        showNotification(`Welcome ${account.name}!`, 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            this.redirectToDashboard(account.role);
        }, 1000);
    }

    async loginReal(email, password, rememberMe) {
        try {
            // Attempt Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            // Get user profile from employees table
            const { data: employeeData, error: profileError } = await supabase
                .from(TABLES.EMPLOYEES)
                .select('*')
                .eq('email', email)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                // Create basic user data if profile not found
                const userData = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.name || 'User',
                    role: 'employee',
                    isDemo: false
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('userRole', 'employee');
            } else {
                // Store complete user data
                const userData = {
                    id: employeeData.id,
                    email: employeeData.email,
                    name: employeeData.name,
                    role: employeeData.role,
                    department: employeeData.department,
                    isDemo: false
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('userRole', employeeData.role);
            }

            if (rememberMe) {
                localStorage.setItem('rememberLogin', 'true');
            }

            const userName = employeeData?.name || data.user.user_metadata?.name || 'User';
            showNotification(`Welcome back, ${userName}!`, 'success');
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                this.redirectToDashboard(employeeData?.role || 'employee');
            }, 1000);

        } catch (error) {
            throw error;
        }
    }

    redirectToDashboard(role) {
        if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'employee-dashboard.html';
        }
    }

    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.showLoading(true);
            
            try {
                // Sign out from Supabase
                await supabase.auth.signOut();
                
                // Clear local storage
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userRole');
                localStorage.removeItem('rememberLogin');
                
                showNotification('Logged out successfully', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
                
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Logout failed', 'error');
            } finally {
                this.showLoading(false);
            }
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        const loginBtn = document.getElementById('loginBtn');
        
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
        
        if (loginBtn) {
            loginBtn.disabled = show;
            if (show) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            } else {
                loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
            }
        }
    }

    // Session management
    async checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (error) {
            console.error('Session check error:', error);
            return null;
        }
    }

    // Password reset functionality
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            
            showNotification('Password reset email sent!', 'success');
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            showNotification('Failed to send reset email', 'error');
            return false;
        }
    }

    // User registration (for admin use)
    async registerUser(userData) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role
                    }
                }
            });

            if (error) throw error;

            // Add user to employees table
            const { error: insertError } = await supabase
                .from(TABLES.EMPLOYEES)
                .insert([{
                    id: data.user.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    department: userData.department,
                    phone: userData.phone,
                    hire_date: new Date().toISOString(),
                    status: 'active'
                }]);

            if (insertError) throw insertError;

            showNotification('User registered successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed: ' + error.message, 'error');
            return false;
        }
    }

    // Get current user info
    getCurrentUserData() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Check if user has admin role
    isAdmin() {
        const userRole = localStorage.getItem('userRole');
        return userRole === 'admin';
    }

    // Check if user is demo account
    isDemoAccount() {
        const userData = this.getCurrentUserData();
        return userData?.isDemo || false;
    }

    // Auto-logout after inactivity
    setupAutoLogout(minutes = 30) {
        let timeout;
        
        const resetTimeout = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                showNotification('Session expired. Please login again.', 'warning');
                this.handleLogout();
            }, minutes * 60 * 1000);
        };

        // Reset timeout on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimeout, true);
        });

        resetTimeout();
    }
}

// User Profile Management
class UserProfile {
    constructor() {
        this.loadUserProfile();
    }

    loadUserProfile() {
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        this.updateProfileDisplay(userData);
    }

    updateProfileDisplay(userData) {
        // Update user name in header
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = userData.name || 'User';
        });

        // Update user avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            const initials = this.getInitials(userData.name || 'User');
            element.textContent = initials;
        });

        // Update profile info in dashboard
        const profileElements = {
            'user-email': userData.email,
            'user-department': userData.department,
            'user-role': userData.role,
            'user-id': userData.id
        };

        Object.entries(profileElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 'N/A';
            }
        });
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    async updateProfile(profileData) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (currentUser.isDemo) {
                // Demo account - just update localStorage
                const updatedUser = { ...currentUser, ...profileData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                showNotification('Profile updated successfully!', 'success');
                return true;
            }

            // Real account - update in database
            const { error } = await supabase
                .from(TABLES.EMPLOYEES)
                .update(profileData)
                .eq('id', currentUser.id);

            if (error) throw error;

            // Update localStorage
            const updatedUser = { ...currentUser, ...profileData };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            this.loadUserProfile();
            showNotification('Profile updated successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Profile update error:', error);
            showNotification('Failed to update profile', 'error');
            return false;
        }
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth manager
    window.authManager = new AuthManager();
    
    // Initialize user profile if not on login page
    if (!window.location.pathname.includes('index.html')) {
        window.userProfile = new UserProfile();
    }
    
    // Setup auto-logout (30 minutes)
    if (!window.location.pathname.includes('index.html')) {
        window.authManager.setupAutoLogout(30);
    }
});

// Supabase auth state listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
});

console.log('Auth module loaded successfully');
