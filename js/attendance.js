// File Name: js/attendance.js

// Attendance Management System

class AttendanceManager {
    constructor() {
        this.currentAttendance = null;
        this.breakSessions = [];
        this.isOnBreak = false;
        this.shiftStartTime = null;
        this.totalWorkTime = 0;
        this.totalBreakTime = 0;
        
        this.initializeAttendance();
        this.loadTodayAttendance();
    }

    async initializeAttendance() {
        await this.checkExistingAttendance();
        this.updateAttendanceDisplay();
        this.startTimer();
    }

    async checkExistingAttendance() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        const today = DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD');
        
        try {
            if (userData.isDemo) {
                // Demo account - check localStorage
                const demoAttendance = StorageUtils.getLocal(`attendance_${userData.id}_${today}`);
                if (demoAttendance) {
                    this.currentAttendance = demoAttendance;
                    this.shiftStartTime = new Date(demoAttendance.check_in);
                    this.breakSessions = demoAttendance.breaks || [];
                    this.calculateTotals();
                }
            } else {
                // Real account - check database
                const { data, error } = await supabase
                    .from(TABLES.ATTENDANCE)
                    .select('*')
                    .eq('employee_id', userData.id)
                    .eq('date', today)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching attendance:', error);
                    return;
                }

                if (data) {
                    this.currentAttendance = data;
                    this.shiftStartTime = new Date(data.check_in);
                    this.breakSessions = data.breaks || [];
                    this.calculateTotals();
                }
            }
        } catch (error) {
            console.error('Error checking attendance:', error);
        }
    }

    async checkIn() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) {
            showNotification('User not found', 'error');
            return false;
        }

        const now = new Date();
        const today = DateTimeUtils.formatDate(now, 'YYYY-MM-DD');
        
        if (this.currentAttendance && !this.currentAttendance.check_out) {
            showNotification('You are already checked in!', 'warning');
            return false;
        }

        try {
            const attendanceData = {
                employee_id: userData.id,
                employee_name: userData.name,
                date: today,
                check_in: now.toISOString(),
                check_out: null,
                total_hours: 0,
                break_time: 0,
                status: 'present',
                breaks: []
            };

            if (userData.isDemo) {
                // Demo account - save to localStorage
                StorageUtils.setLocal(`attendance_${userData.id}_${today}`, attendanceData);
                this.currentAttendance = attendanceData;
            } else {
                // Real account - save to database
                const { data, error } = await supabase
                    .from(TABLES.ATTENDANCE)
                    .insert([attendanceData])
                    .select()
                    .single();

                if (error) throw error;
                this.currentAttendance = data;
            }

            this.shiftStartTime = now;
            this.breakSessions = [];
            this.updateAttendanceDisplay();
            
            showNotification('Checked in successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Check-in error:', error);
            showNotification('Failed to check in', 'error');
            return false;
        }
    }

    async checkOut() {
        if (!this.currentAttendance || this.currentAttendance.check_out) {
            showNotification('You are not checked in!', 'warning');
            return false;
        }

        if (this.isOnBreak) {
            showNotification('Please end your break before checking out', 'warning');
            return false;
        }

        const confirmed = await UIUtils.confirm(
            'Are you sure you want to check out for today?',
            'Confirm Check Out'
        );

        if (!confirmed) return false;

        const userData = StorageUtils.getLocal('currentUser');
        const now = new Date();
        
        try {
            this.calculateTotals();
            
            const updatedAttendance = {
                ...this.currentAttendance,
                check_out: now.toISOString(),
                total_hours: this.totalWorkTime / (1000 * 60 * 60), // Convert to hours
                break_time: this.totalBreakTime / (1000 * 60), // Convert to minutes
                breaks: this.breakSessions
            };

            if (userData.isDemo) {
                // Demo account - update localStorage
                const today = DateTimeUtils.formatDate(now, 'YYYY-MM-DD');
                StorageUtils.setLocal(`attendance_${userData.id}_${today}`, updatedAttendance);
            } else {
                // Real account - update database
                const { error } = await supabase
                    .from(TABLES.ATTENDANCE)
                    .update(updatedAttendance)
                    .eq('id', this.currentAttendance.id);

                if (error) throw error;
            }

            this.currentAttendance = updatedAttendance;
            this.shiftStartTime = null;
            this.updateAttendanceDisplay();
            
            showNotification(
                `Checked out successfully! Total hours: ${this.formatHours(updatedAttendance.total_hours)}`,
                'success'
            );
            return true;

        } catch (error) {
            console.error('Check-out error:', error);
            showNotification('Failed to check out', 'error');
            return false;
        }
    }

    async startBreak() {
        if (!this.currentAttendance || this.currentAttendance.check_out) {
            showNotification('You must be checked in to take a break', 'warning');
            return false;
        }

        if (this.isOnBreak) {
            showNotification('You are already on break!', 'warning');
            return false;
        }

        const now = new Date();
        const breakSession = {
            start: now.toISOString(),
            end: null,
            duration: 0
        };

        this.breakSessions.push(breakSession);
        this.isOnBreak = true;
        this.updateAttendanceDisplay();
        
        showNotification('Break started', 'info');
        return true;
    }

    async endBreak() {
        if (!this.isOnBreak) {
            showNotification('You are not on break!', 'warning');
            return false;
        }

        const now = new Date();
        const currentBreak = this.breakSessions[this.breakSessions.length - 1];
        
        if (currentBreak && !currentBreak.end) {
            currentBreak.end = now.toISOString();
            currentBreak.duration = new Date(currentBreak.end) - new Date(currentBreak.start);
        }

        this.isOnBreak = false;
        this.updateAttendanceDisplay();
        
        const breakDuration = this.formatDuration(currentBreak.duration);
        showNotification(`Break ended. Duration: ${breakDuration}`, 'success');
        return true;
    }

    calculateTotals() {
        if (!this.shiftStartTime) return;

        const now = new Date();
        const endTime = this.currentAttendance?.check_out 
            ? new Date(this.currentAttendance.check_out) 
            : now;

        this.totalWorkTime = endTime - this.shiftStartTime;

        // Calculate total break time
        this.totalBreakTime = this.breakSessions.reduce((total, session) => {
            if (session.end) {
                return total + (new Date(session.end) - new Date(session.start));
            } else if (session.start && this.isOnBreak) {
                return total + (now - new Date(session.start));
            }
            return total;
        }, 0);

        // Subtract break time from work time
        this.totalWorkTime -= this.totalBreakTime;
    }

    updateAttendanceDisplay() {
        this.updateButtons();
        this.updateTimers();
        this.updateStatus();
    }

    updateButtons() {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const breakBtn = document.getElementById('breakBtn');
        const endBreakBtn = document.getElementById('endBreakBtn');
        const attendanceBtn = document.getElementById('attendanceBtn');

        const isCheckedIn = this.currentAttendance && !this.currentAttendance.check_out;

        if (attendanceBtn) {
            if (isCheckedIn) {
                attendanceBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Check Out';
                attendanceBtn.className = 'btn btn-danger';
                attendanceBtn.onclick = () => this.checkOut();
            } else {
                attendanceBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Check In';
                attendanceBtn.className = 'btn btn-primary';
                attendanceBtn.onclick = () => this.checkIn();
            }
        }

        if (checkInBtn) {
            checkInBtn.disabled = isCheckedIn;
            checkInBtn.style.display = isCheckedIn ? 'none' : 'inline-flex';
        }

        if (checkOutBtn) {
            checkOutBtn.disabled = !isCheckedIn;
            checkOutBtn.style.display = isCheckedIn ? 'inline-flex' : 'none';
        }

        if (breakBtn) {
            breakBtn.disabled = !isCheckedIn || this.isOnBreak;
            breakBtn.style.display = this.isOnBreak ? 'none' : 'inline-flex';
        }

        if (endBreakBtn) {
            endBreakBtn.disabled = !this.isOnBreak;
            endBreakBtn.style.display = this.isOnBreak ? 'inline-flex' : 'none';
        }
    }

    updateTimers() {
        if (!this.shiftStartTime) return;

        this.calculateTotals();

        const workTimeElement = document.getElementById('workTime');
        const breakTimeElement = document.getElementById('breakTime');
        const shiftTimer = document.getElementById('shiftTimer');

        if (workTimeElement) {
            workTimeElement.textContent = this.formatDuration(this.totalWorkTime);
        }

        if (breakTimeElement) {
            breakTimeElement.textContent = this.formatDuration(this.totalBreakTime);
        }

        if (shiftTimer) {
            shiftTimer.textContent = this.formatDuration(this.totalWorkTime);
        }

        // Update progress circle if exists
        this.updateProgressCircle();
    }

    updateProgressCircle() {
        const progressCircle = document.getElementById('timerProgress');
        if (!progressCircle) return;

        const standardWorkDay = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
        const progress = Math.min((this.totalWorkTime / standardWorkDay) * 100, 100);
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (progress / 100) * circumference;

        progressCircle.style.strokeDashoffset = offset;
    }

    updateStatus() {
        const statusElement = document.getElementById('shiftStatus');
        if (!statusElement) return;

        if (this.currentAttendance && !this.currentAttendance.check_out) {
            if (this.isOnBreak) {
                statusElement.innerHTML = '<i class="fas fa-pause-circle"></i> On Break';
                statusElement.className = 'badge badge-warning';
            } else {
                statusElement.innerHTML = '<i class="fas fa-circle"></i> On Shift';
                statusElement.className = 'badge badge-success';
            }
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Off Shift';
            statusElement.className = 'badge badge-danger';
        }
    }

    startTimer() {
        setInterval(() => {
            this.updateTimers();
        }, 1000);
    }

    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '00:00:00';

        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatHours(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    }

    async loadTodayAttendance() {
        // This method loads today's attendance for display
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        const today = DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD');
        
        try {
            if (userData.isDemo) {
                const attendance = StorageUtils.getLocal(`attendance_${userData.id}_${today}`);
                this.displayAttendanceInfo(attendance);
            } else {
                const { data, error } = await supabase
                    .from(TABLES.ATTENDANCE)
                    .select('*')
                    .eq('employee_id', userData.id)
                    .eq('date', today)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error loading attendance:', error);
                    return;
                }

                this.displayAttendanceInfo(data);
            }
        } catch (error) {
            console.error('Error loading today\'s attendance:', error);
        }
    }

    displayAttendanceInfo(attendance) {
        const checkInTimeElement = document.getElementById('checkInTime');
        const checkOutTimeElement = document.getElementById('checkOutTime');
        const totalHoursElement = document.getElementById('totalHours');

        if (attendance) {
            if (checkInTimeElement) {
                checkInTimeElement.textContent = attendance.check_in 
                    ? DateTimeUtils.formatTime(attendance.check_in)
                    : '--:--';
            }

            if (checkOutTimeElement) {
                checkOutTimeElement.textContent = attendance.check_out 
                    ? DateTimeUtils.formatTime(attendance.check_out)
                    : '--:--';
            }

            if (totalHoursElement) {
                totalHoursElement.textContent = attendance.total_hours 
                    ? this.formatHours(attendance.total_hours)
                    : '0h 0m';
            }
        } else {
            if (checkInTimeElement) checkInTimeElement.textContent = '--:--';
            if (checkOutTimeElement) checkOutTimeElement.textContent = '--:--';
            if (totalHoursElement) totalHoursElement.textContent = '0h 0m';
        }
    }

    async getAttendanceHistory(startDate, endDate) {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return [];

        try {
            if (userData.isDemo) {
                // Demo account - get from localStorage
                const history = [];
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
                    const dateStr = DateTimeUtils.formatDate(date, 'YYYY-MM-DD');
                    const attendance = StorageUtils.getLocal(`attendance_${userData.id}_${dateStr}`);
                    if (attendance) {
                        history.push(attendance);
                    }
                }
                
                return history;
            } else {
                // Real account - get from database
                const { data, error } = await supabase
                    .from(TABLES.ATTENDANCE)
                    .select('*')
                    .eq('employee_id', userData.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false });

                if (error) throw error;
                return data || [];
            }
        } catch (error) {
            console.error('Error fetching attendance history:', error);
            return [];
        }
    }

    async generateAttendanceReport(startDate, endDate) {
        const history = await this.getAttendanceHistory(startDate, endDate);
        
        const report = {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            halfDays: 0,
            totalHours: 0,
            averageHours: 0,
            totalBreakTime: 0,
            attendance: history
        };

        history.forEach(record => {
            report.totalDays++;
            
            if (record.status === 'present') {
                report.presentDays++;
                report.totalHours += record.total_hours || 0;
                report.totalBreakTime += record.break_time || 0;
            } else if (record.status === 'half-day') {
                report.halfDays++;
                report.totalHours += record.total_hours || 0;
            } else {
                report.absentDays++;
            }
        });

        report.averageHours = report.presentDays > 0 
            ? report.totalHours / report.presentDays 
            : 0;

        return report;
    }
}

// Calendar utilities for attendance
class AttendanceCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.attendanceData = {};
        this.init();
    }

    init() {
        if (!this.container) return;
        this.loadAttendanceData();
        this.render();
    }

    async loadAttendanceData() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        try {
            const attendanceManager = new AttendanceManager();
            const history = await attendanceManager.getAttendanceHistory(
                DateTimeUtils.formatDate(startDate, 'YYYY-MM-DD'),
                DateTimeUtils.formatDate(endDate, 'YYYY-MM-DD')
            );

            this.attendanceData = {};
            history.forEach(record => {
                this.attendanceData[record.date] = record.status;
            });
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button onclick="attendanceCalendar.previousMonth()" class="btn-icon">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3>${this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                    <button onclick="attendanceCalendar.nextMonth()" class="btn-icon">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    <div>Su</div><div>Mo</div><div>Tu</div><div>We</div>
                    <div>Th</div><div>Fr</div><div>Sa</div>
                </div>
                <div class="calendar-days">
        `;

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = DateTimeUtils.formatDate(date, 'YYYY-MM-DD');
            const isToday = date.toDateString() === today.toDateString();
            const status = this.attendanceData[dateStr] || '';
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${status}" 
                     data-date="${dateStr}" onclick="attendanceCalendar.selectDate('${dateStr}')">
                    <span class="day-number">${day}</span>
                    ${status ? `<span class="status-indicator ${status}"></span>` : ''}
                </div>
            `;
        }

        html += `
                </div>
            </div>
            <div class="calendar-legend">
                <div class="legend-item">
                    <span class="legend-dot present"></span>
                    <span>Present</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot absent"></span>
                    <span>Absent</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot half-day"></span>
                    <span>Half Day</span>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadAttendanceData().then(() => this.render());
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadAttendanceData().then(() => this.render());
    }

    selectDate(dateStr) {
        // Show attendance details for selected date
        console.log('Selected date:', dateStr);
        // Implementation for showing date details
    }
}

// Initialize attendance manager globally
let attendanceManager;
let attendanceCalendar;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('attendanceBtn') || document.getElementById('checkInBtn')) {
        attendanceManager = new AttendanceManager();
    }
    
    if (document.getElementById('attendanceCalendar')) {
        attendanceCalendar = new AttendanceCalendar('attendanceCalendar');
    }
});

// Global functions for buttons
function toggleAttendance() {
    if (attendanceManager) {
        const isCheckedIn = attendanceManager.currentAttendance && 
                           !attendanceManager.currentAttendance.check_out;
        
        if (isCheckedIn) {
            attendanceManager.checkOut();
        } else {
            attendanceManager.checkIn();
        }
    }
}

function toggleBreak() {
    if (attendanceManager) {
        if (attendanceManager.isOnBreak) {
            attendanceManager.endBreak();
        } else {
            attendanceManager.startBreak();
        }
    }
}

function resumeWork() {
    if (attendanceManager) {
        attendanceManager.endBreak();
    }
}

console.log('Attendance module loaded successfully');
