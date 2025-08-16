// File Name: js/auth.js
// Authentication Management System - FIXED VERSION

class AuthManager {
    constructor() {
        this.isInitializing = false;
        this.initializeAuth();
        this.setupEventListeners();
    }

    async initializeAuth() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            // Check if user is already logged in
            const user = await getCurrentUser();
            if (user && window.location.pathname.includes('index.html')) {
                const role = localStorage.getItem('userRole');
                this.redirectToDashboard(role);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            this.isInitializing = false;
        }
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Logout buttons - Use event delegation to avoid duplicate listeners
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || 
                e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Handle form reset button
        const resetBtn = document.querySelector('.forgot-password');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPasswordReset();
            });
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const rememberMeInput = document.getElementById('rememberMe');
        
        if (!emailInput || !passwordInput) {
            showNotification('Login form elements not found', 'error');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeInput ? rememberMeInput.checked : false;
        
        // Validation
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Check if it's a demo account first
            const demoAccount = this.getDemoAccount(email, password);
            
            if (demoAccount) {
                await this.loginDemo(demoAccount, rememberMe);
            } else {
                await this.loginReal(email, password, rememberMe);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please check your credentials.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getDemoAccount(email, password) {
        const demoAccounts = {
            'employee@demo.com': {
                password: 'demo123',
                role: 'employee',
                id: 'demo-emp-001',
                name: 'John Doe',
                department: 'IT Department',
                email: 'employee@demo.com'
            },
            'admin@demo.com': {
                password: 'admin123',
                role: 'admin',
                id: 'demo-admin-001',
                name: 'Admin User',
                department: 'Administration',
                email: 'admin@demo.com'
            }
        };

        const account = demoAccounts[email.toLowerCase()];
        if (account && account.password === password) {
            return account;
        }
        return null;
    }

    async loginDemo(account, rememberMe) {
        try {
            // Simulate demo user session
            const userData = {
                id: account.id,
                email: account.email,
                name: account.name,
                role: account.role,
                department: account.department,
                isDemo: true,
                loginTime: new Date().toISOString()
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

        } catch (error) {
            console.error('Demo login error:', error);
            showNotification('Demo login failed', 'error');
        }
    }

    async loginReal(email, password, rememberMe) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            // Attempt Supabase authentication
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            if (!data.user) {
                throw new Error('No user data returned');
            }

            // Get user profile from employees table
            const { data: employeeData, error: profileError } = await window.supabase
                .from(TABLES.EMPLOYEES)
                .select('*')
                .eq('email', email)
                .single();

            let userData;

            if (profileError || !employeeData) {
                console.warn('Profile fetch error:', profileError);
                // Create basic user data if profile not found
                userData = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.name || 'User',
                    role: 'employee',
                    department: 'General',
                    isDemo: false,
                    loginTime: new Date().toISOString()
                };
            } else {
                userData = {
                    id: employeeData.id,
                    email: employeeData.email,
                    name: employeeData.name,
                    role: employeeData.role || 'employee',
                    department: employeeData.department || 'General',
                    phone: employeeData.phone,
                    hire_date: employeeData.hire_date,
                    status: employeeData.status,
                    isDemo: false,
                    loginTime: new Date().toISOString()
                };
            }
                
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
            
            if (rememberMe) {
                localStorage.setItem('rememberLogin', 'true');
            }

            showNotification(`Welcome ${userData.name}!`, 'success');
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                this.redirectToDashboard(userData.role);
            }, 1000);

        } catch (error) {
            console.error('Real login error:', error);
            
            // User-friendly error messages
            let errorMessage = 'Login failed. ';
            if (error.message.includes('Invalid login credentials')) {
                errorMessage += 'Please check your email and password.';
            } else if (error.message.includes('network')) {
                errorMessage += 'Please check your internet connection.';
            } else {
                errorMessage += 'Please try again later.';
            }
            
            showNotification(errorMessage, 'error');
        }
    }

    redirectToDashboard(role) {
        try {
            const targetPage = role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
            window.location.href = targetPage;
        } catch (error) {
            console.error('Redirect error:', error);
            // Fallback redirect
            window.location.href = 'employee-dashboard.html';
        }
    }

    async handleLogout() {
        if (this.isLoggingOut) return;
        this.isLoggingOut = true;

        try {
            this.showLoading(true);
            
            // Sign out from Supabase if real user
            const userData = this.getCurrentUserData();
            if (userData && !userData.isDemo && window.supabase) {
                await window.supabase.auth.signOut();
            }
            
            // Clear all local storage
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
            localStorage.removeItem('rememberLogin');
            
            // Clear any other app-specific data
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('tasks_') || 
                           key.startsWith('attendance_') || 
                           key.startsWith('training_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            showNotification('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if there's an error
            localStorage.clear();
            window.location.href = 'index.html';
        } finally {
            this.showLoading(false);
            this.isLoggingOut = false;
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

    // Enhanced session management
    async checkSession() {
        try {
            if (!window.supabase) {
                return null;
            }
            
            const { data: { session }, error } = await window.supabase.auth.getSession();
            if (error) {
                console.error('Session check error:', error);
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('Session check error:', error);
            return null;
        }
    }

    // Password reset functionality
    async resetPassword(email) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            
            const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            
            showNotification('Password reset email sent!', 'success');
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            showNotification(error.message || 'Failed to send reset email', 'error');
            return false;
        }
    }

    showPasswordReset() {
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (!email) {
            showNotification('Please enter your email address first', 'warning');
            if (emailInput) emailInput.focus();
            return;
        }
        
        if (confirm(`Send password reset email to ${email}?`)) {
            this.resetPassword(email);
        }
    }

    // User registration (for admin use)
    async registerUser(userData) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase not available');
            }

            // Validate required fields
            if (!userData.email || !userData.password || !userData.name) {
                throw new Error('Email, password, and name are required');
            }

            if (!this.isValidEmail(userData.email)) {
                throw new Error('Please enter a valid email address');
            }

            const { data, error } = await window.supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role || 'employee'
                    }
                }
            });

            if (error) throw error;

            // Add user to employees table
            const { error: insertError } = await window.supabase
                .from(TABLES.EMPLOYEES)
                .insert([{
                    id: data.user.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role || 'employee',
                    department: userData.department || 'General',
                    phone: userData.phone || null,
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

    // Get current user info with validation
    getCurrentUserData() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) return null;
            
            const parsed = JSON.parse(userData);
            
            // Validate required fields
            if (!parsed.id || !parsed.email) {
                console.warn('Invalid user data found, clearing...');
                localStorage.removeItem('currentUser');
                return null;
            }
            
            return parsed;
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('currentUser');
            return null;
        }
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
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
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
        try {
            const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
            this.updateProfileDisplay(userData);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    updateProfileDisplay(userData) {
        // Update user name in header
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = userData.name || 'User';
            }
        });

        // Update user avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            if (element) {
                const initials = this.getInitials(userData.name || 'User');
                element.textContent = initials;
            }
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
            if (element && value) {
                element.textContent = value;
            }
        });
    }

    getInitials(name) {
        if (!name) return 'U';
        
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
            if (!currentUser) {
                throw new Error('No user found');
            }
            
            if (currentUser.isDemo) {
                // Demo account - just update localStorage
                const updatedUser = { ...currentUser, ...profileData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.loadUserProfile();
                showNotification('Profile updated successfully!', 'success');
                return true;
            }

            // Real account - update in database
            if (!window.supabase) {
                throw new Error('Database not available');
            }

            const { error } = await window.supabase
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
            showNotification('Failed to update profile: ' + error.message, 'error');
            return false;
        }
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize auth manager
        window.authManager = new AuthManager();
        
        // Initialize user profile if not on login page
        if (!window.location.pathname.includes('index.html')) {
            window.userProfile = new UserProfile();
        }
        
        // Setup auto-logout (30 minutes) for authenticated pages
        if (!window.location.pathname.includes('index.html')) {
            window.authManager.setupAutoLogout(30);
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
    }
});

// Supabase auth state listener
if (window.supabase) {
    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
            localStorage.removeItem('rememberLogin');
            
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

console.log('Auth module loaded successfully');
