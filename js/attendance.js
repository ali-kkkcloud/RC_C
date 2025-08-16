// File Name: js/attendance.js
// Attendance Management System - FIXED VERSION

class AttendanceManager {
    constructor() {
        this.currentAttendance = null;
        this.isOnBreak = false;
        this.breakStartTime = null;
        this.totalBreakTime = 0;
        this.timers = {
            shift: null,
            break: null,
            update: null
        };
        
        this.initializeAttendance();
    }

    async initializeAttendance() {
        try {
            await this.loadTodayAttendance();
            this.setupEventListeners();
            this.startTimers();
            this.updateDisplay();
        } catch (error) {
            console.error('Attendance initialization error:', error);
            showNotification('Failed to initialize attendance system', 'error');
        }
    }

    setupEventListeners() {
        try {
            // Check-in/Check-out buttons
            const checkInBtn = document.getElementById('checkInBtn');
            const checkOutBtn = document.getElementById('checkOutBtn');
            const breakBtn = document.getElementById('breakBtn');

            if (checkInBtn) {
                checkInBtn.removeEventListener('click', this.handleCheckInBound);
                this.handleCheckInBound = this.handleCheckIn.bind(this);
                checkInBtn.addEventListener('click', this.handleCheckInBound);
            }

            if (checkOutBtn) {
                checkOutBtn.removeEventListener('click', this.handleCheckOutBound);
                this.handleCheckOutBound = this.handleCheckOut.bind(this);
                checkOutBtn.addEventListener('click', this.handleCheckOutBound);
            }

            if (breakBtn) {
                breakBtn.removeEventListener('click', this.handleBreakToggleBound);
                this.handleBreakToggleBound = this.handleBreakToggle.bind(this);
                breakBtn.addEventListener('click', this.handleBreakToggleBound);
            }

            // Calendar navigation
            const monthSelector = document.getElementById('monthSelector');
            const yearSelector = document.getElementById('yearSelector');

            if (monthSelector) {
                monthSelector.removeEventListener('change', this.handleCalendarChangeBound);
                this.handleCalendarChangeBound = this.handleCalendarChange.bind(this);
                monthSelector.addEventListener('change', this.handleCalendarChangeBound);
            }

            if (yearSelector) {
                yearSelector.removeEventListener('change', this.handleCalendarChangeBound);
                yearSelector.addEventListener('change', this.handleCalendarChangeBound);
            }

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    async handleCheckIn() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) {
                showNotification('User not found', 'error');
                return;
            }

            if (this.currentAttendance && this.currentAttendance.check_in) {
                showNotification('You are already checked in', 'warning');
                return;
            }

            const now = new Date();
            const today = DateTimeUtils.formatDate(now, 'YYYY-MM-DD');

            const attendanceData = {
                id: StringUtils.generateId('attendance'),
                employee_id: userData.id,
                employee_name: userData.name,
                date: today,
                check_in: now.toISOString(),
                check_out: null,
                total_hours: 0,
                break_time: 0,
                status: 'present',
                notes: '',
                created_at: now.toISOString(),
                updated_at: now.toISOString()
            };

            if (userData.isDemo) {
                // Demo account - save to localStorage
                StorageUtils.setLocal(`attendance_${userData.id}_${today}`, attendanceData);
            } else {
                // Real account - save to database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.ATTENDANCE)
                    .upsert([attendanceData], { 
                        onConflict: 'employee_id,date' 
                    });

                if (error) throw error;
            }

            this.currentAttendance = attendanceData;
            this.updateDisplay();
            this.updateButtons();
            
            showNotification(`Welcome ${userData.name}! Checked in at ${DateTimeUtils.formatTime(now)}`, 'success');

        } catch (error) {
            console.error('Check-in error:', error);
            showNotification('Check-in failed: ' + error.message, 'error');
        }
    }

    async handleCheckOut() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) {
                showNotification('User not found', 'error');
                return;
            }

            if (!this.currentAttendance || !this.currentAttendance.check_in) {
                showNotification('You need to check in first', 'warning');
                return;
            }

            if (this.currentAttendance.check_out) {
                showNotification('You are already checked out', 'warning');
                return;
            }

            // End break if currently on break
            if (this.isOnBreak) {
                this.endBreak();
            }

            const now = new Date();
            const checkInTime = new Date(this.currentAttendance.check_in);
            const totalMilliseconds = now - checkInTime;
            const totalHours = Math.max(0, (totalMilliseconds - this.totalBreakTime) / (1000 * 60 * 60));

            this.currentAttendance.check_out = now.toISOString();
            this.currentAttendance.total_hours = NumberUtils.roundToDecimal(totalHours, 2);
            this.currentAttendance.break_time = Math.round(this.totalBreakTime / (1000 * 60)); // in minutes
            this.currentAttendance.updated_at = now.toISOString();

            const today = DateTimeUtils.formatDate(now, 'YYYY-MM-DD');

            if (userData.isDemo) {
                // Demo account - update localStorage
                StorageUtils.setLocal(`attendance_${userData.id}_${today}`, this.currentAttendance);
            } else {
                // Real account - update database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.ATTENDANCE)
                    .update({
                        check_out: this.currentAttendance.check_out,
                        total_hours: this.currentAttendance.total_hours,
                        break_time: this.currentAttendance.break_time,
                        updated_at: this.currentAttendance.updated_at
                    })
                    .eq('id', this.currentAttendance.id);

                if (error) throw error;
            }

            this.updateDisplay();
            this.updateButtons();
            this.stopTimers();
            
            showNotification(
                `Checked out successfully! Total hours: ${this.formatHours(totalHours)}`, 
                'success'
            );

        } catch (error) {
            console.error('Check-out error:', error);
            showNotification('Check-out failed: ' + error.message, 'error');
        }
    }

    async handleBreakToggle() {
        try {
            if (!this.currentAttendance || !this.currentAttendance.check_in) {
                showNotification('You need to check in first', 'warning');
                return;
            }

            if (this.currentAttendance.check_out) {
                showNotification('You are already checked out', 'warning');
                return;
            }

            if (this.isOnBreak) {
                this.endBreak();
                showNotification('Break ended', 'info');
            } else {
                this.startBreak();
                showNotification('Break started', 'info');
            }

            this.updateDisplay();
            this.updateButtons();

        } catch (error) {
            console.error('Break toggle error:', error);
            showNotification('Break operation failed: ' + error.message, 'error');
        }
    }

    startBreak() {
        this.isOnBreak = true;
        this.breakStartTime = new Date();
        
        // Start break timer
        this.timers.break = setInterval(() => {
            this.updateBreakTimer();
        }, 1000);
    }

    endBreak() {
        if (this.isOnBreak && this.breakStartTime) {
            const breakDuration = new Date() - this.breakStartTime;
            this.totalBreakTime += breakDuration;
            this.isOnBreak = false;
            this.breakStartTime = null;
            
            // Stop break timer
            if (this.timers.break) {
                clearInterval(this.timers.break);
                this.timers.break = null;
            }
        }
    }

    updateBreakTimer() {
        if (this.isOnBreak && this.breakStartTime) {
            const currentBreakTime = new Date() - this.breakStartTime;
            const totalCurrentBreak = this.totalBreakTime + currentBreakTime;
            
            const breakElement = document.getElementById('breakTime');
            if (breakElement) {
                breakElement.textContent = this.formatDuration(totalCurrentBreak);
            }
        }
    }

    handleCalendarChange() {
        try {
            const monthSelector = document.getElementById('monthSelector');
            const yearSelector = document.getElementById('yearSelector');
            
            if (monthSelector && yearSelector) {
                const month = parseInt(monthSelector.value);
                const year = parseInt(yearSelector.value);
                
                if (!isNaN(month) && !isNaN(year)) {
                    this.loadCalendarData(year, month);
                }
            }
        } catch (error) {
            console.error('Calendar change error:', error);
        }
    }

    async loadCalendarData(year, month) {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) return;

            // Load attendance data for the selected month
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            const attendanceHistory = await this.getAttendanceHistory(
                DateTimeUtils.formatDate(startDate, 'YYYY-MM-DD'),
                DateTimeUtils.formatDate(endDate, 'YYYY-MM-DD')
            );

            // Update calendar display
            this.renderCalendar(year, month, attendanceHistory);
            
        } catch (error) {
            console.error('Calendar data loading error:', error);
        }
    }

    renderCalendar(year, month, attendanceData) {
        try {
            const calendarBody = document.getElementById('attendanceCalendarBody');
            if (!calendarBody) return;

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());

            let calendarHTML = '';
            let currentDate = new Date(startDate);

            // Generate 6 weeks of calendar
            for (let week = 0; week < 6; week++) {
                calendarHTML += '<tr>';
                
                for (let day = 0; day < 7; day++) {
                    const dateStr = DateTimeUtils.formatDate(currentDate, 'YYYY-MM-DD');
                    const isCurrentMonth = currentDate.getMonth() === month;
                    const isToday = DateTimeUtils.isToday(currentDate);
                    
                    // Find attendance record for this date
                    const attendance = attendanceData.find(a => a.date === dateStr);
                    
                    let cellClass = 'calendar-cell';
                    if (!isCurrentMonth) cellClass += ' other-month';
                    if (isToday) cellClass += ' today';
                    if (attendance) {
                        cellClass += ` ${attendance.status}`;
                    }

                    calendarHTML += `
                        <td class="${cellClass}" data-date="${dateStr}">
                            <div class="calendar-date">${currentDate.getDate()}</div>
                            ${attendance ? `
                                <div class="attendance-info">
                                    <div class="attendance-status ${attendance.status}">
                                        ${attendance.status === 'present' ? '✓' : 
                                          attendance.status === 'absent' ? '✗' : 
                                          attendance.status === 'half-day' ? '½' : '?'}
                                    </div>
                                    ${attendance.total_hours ? `
                                        <div class="attendance-hours">${this.formatHours(attendance.total_hours)}</div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </td>
                    `;
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                calendarHTML += '</tr>';
            }

            calendarBody.innerHTML = calendarHTML;
            
        } catch (error) {
            console.error('Calendar rendering error:', error);
        }
    }

    startTimers() {
        // Update display every second
        this.timers.update = setInterval(() => {
            this.updateTimers();
        }, 1000);

        // Update current time display
        this.updateCurrentTime();
        setInterval(() => {
            this.updateCurrentTime();
        }, 1000);
    }

    stopTimers() {
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearInterval(timer);
            }
        });
        this.timers = { shift: null, break: null, update: null };
    }

    updateCurrentTime() {
        try {
            const currentTimeElement = document.getElementById('currentTime');
            if (currentTimeElement) {
                const now = new Date();
                currentTimeElement.textContent = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            }
        } catch (error) {
            console.error('Current time update error:', error);
        }
    }

    updateTimers() {
        try {
            if (!this.currentAttendance || !this.currentAttendance.check_in || this.currentAttendance.check_out) {
                return;
            }

            const now = new Date();
            const checkInTime = new Date(this.currentAttendance.check_in);
            
            // Calculate shift duration
            const shiftDuration = now - checkInTime;
            const shiftElement = document.getElementById('shiftTime');
            if (shiftElement) {
                shiftElement.textContent = this.formatDuration(shiftDuration);
            }

            // Calculate working time (excluding breaks)
            const workingTime = shiftDuration - this.totalBreakTime - 
                (this.isOnBreak && this.breakStartTime ? now - this.breakStartTime : 0);
            const workingElement = document.getElementById('workingTime');
            if (workingElement) {
                workingElement.textContent = this.formatDuration(Math.max(0, workingTime));
            }

            // Update break time
            this.updateBreakTimer();

        } catch (error) {
            console.error('Timer update error:', error);
        }
    }

    updateDisplay() {
        try {
            this.updateAttendanceStatus();
            this.updateAttendanceInfo();
            this.updateButtons();
        } catch (error) {
            console.error('Display update error:', error);
        }
    }

    updateAttendanceStatus() {
        try {
            const statusElement = document.getElementById('attendanceStatus');
            if (!statusElement) return;

            if (this.currentAttendance && this.currentAttendance.check_in && !this.currentAttendance.check_out) {
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
        } catch (error) {
            console.error('Status update error:', error);
        }
    }

    updateAttendanceInfo() {
        try {
            const checkInTimeElement = document.getElementById('checkInTime');
            const checkOutTimeElement = document.getElementById('checkOutTime');
            const totalHoursElement = document.getElementById('totalHours');

            if (this.currentAttendance) {
                if (checkInTimeElement) {
                    checkInTimeElement.textContent = this.currentAttendance.check_in 
                        ? DateTimeUtils.formatTime(this.currentAttendance.check_in)
                        : '--:--';
                }

                if (checkOutTimeElement) {
                    checkOutTimeElement.textContent = this.currentAttendance.check_out 
                        ? DateTimeUtils.formatTime(this.currentAttendance.check_out)
                        : '--:--';
                }

                if (totalHoursElement) {
                    totalHoursElement.textContent = this.currentAttendance.total_hours 
                        ? this.formatHours(this.currentAttendance.total_hours)
                        : '0h 0m';
                }
            } else {
                if (checkInTimeElement) checkInTimeElement.textContent = '--:--';
                if (checkOutTimeElement) checkOutTimeElement.textContent = '--:--';
                if (totalHoursElement) totalHoursElement.textContent = '0h 0m';
            }
        } catch (error) {
            console.error('Attendance info update error:', error);
        }
    }

    updateButtons() {
        try {
            const checkInBtn = document.getElementById('checkInBtn');
            const checkOutBtn = document.getElementById('checkOutBtn');
            const breakBtn = document.getElementById('breakBtn');

            const isCheckedIn = this.currentAttendance && this.currentAttendance.check_in && !this.currentAttendance.check_out;

            if (checkInBtn) {
                checkInBtn.disabled = isCheckedIn;
                checkInBtn.textContent = isCheckedIn ? 'Checked In' : 'Check In';
            }

            if (checkOutBtn) {
                checkOutBtn.disabled = !isCheckedIn;
            }

            if (breakBtn) {
                breakBtn.disabled = !isCheckedIn;
                if (isCheckedIn) {
                    breakBtn.innerHTML = this.isOnBreak 
                        ? '<i class="fas fa-play"></i> End Break'
                        : '<i class="fas fa-pause"></i> Start Break';
                } else {
                    breakBtn.innerHTML = '<i class="fas fa-pause"></i> Break';
                }
            }
        } catch (error) {
            console.error('Button update error:', error);
        }
    }

    async loadTodayAttendance() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        const today = DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD');
        
        try {
            if (userData.isDemo) {
                const attendance = StorageUtils.getLocal(`attendance_${userData.id}_${today}`);
                this.currentAttendance = attendance;
            } else {
                if (!window.supabase) {
                    console.warn('Database not available');
                    return;
                }

                const { data, error } = await window.supabase
                    .from(TABLES.ATTENDANCE)
                    .select('*')
                    .eq('employee_id', userData.id)
                    .eq('date', today)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error loading attendance:', error);
                    return;
                }

                this.currentAttendance = data;
            }

            // If checked in but not checked out, restore break state if needed
            if (this.currentAttendance && this.currentAttendance.check_in && !this.currentAttendance.check_out) {
                // Restore any saved break state
                const breakState = StorageUtils.getSession(`break_state_${userData.id}_${today}`);
                if (breakState) {
                    this.isOnBreak = breakState.isOnBreak;
                    this.breakStartTime = breakState.breakStartTime ? new Date(breakState.breakStartTime) : null;
                    this.totalBreakTime = breakState.totalBreakTime || 0;
                }
            }

        } catch (error) {
            console.error('Error loading today\'s attendance:', error);
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
                
                for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                    const dateStr = DateTimeUtils.formatDate(date, 'YYYY-MM-DD');
                    const attendance = StorageUtils.getLocal(`attendance_${userData.id}_${dateStr}`);
                    if (attendance) {
                        history.push(attendance);
                    }
                }
                
                return history;
            } else {
                // Real account - get from database
                if (!window.supabase) {
                    return [];
                }

                const { data, error } = await window.supabase
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
        try {
            const history = await this.getAttendanceHistory(startDate, endDate);
            
            const report = {
                period: `${DateTimeUtils.formatDate(startDate, 'short')} - ${DateTimeUtils.formatDate(endDate, 'short')}`,
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                halfDays: 0,
                totalHours: 0,
                averageHours: 0,
                totalBreakTime: 0,
                attendanceRate: 0,
                records: history
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
                ? NumberUtils.roundToDecimal(report.totalHours / report.presentDays, 2)
                : 0;

            report.attendanceRate = report.totalDays > 0
                ? NumberUtils.roundToDecimal((report.presentDays + report.halfDays * 0.5) / report.totalDays * 100, 2)
                : 0;

            return report;
        } catch (error) {
            console.error('Error generating attendance report:', error);
            return null;
        }
    }

    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '00:00:00';

        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatHours(hours) {
        if (!hours || hours < 0) return '0h 0m';
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    }

    // Save break state to session storage for persistence
    saveBreakState() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) return;

            const today = DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD');
            const breakState = {
                isOnBreak: this.isOnBreak,
                breakStartTime: this.breakStartTime ? this.breakStartTime.toISOString() : null,
                totalBreakTime: this.totalBreakTime
            };

            StorageUtils.setSession(`break_state_${userData.id}_${today}`, breakState);
        } catch (error) {
            console.error('Error saving break state:', error);
        }
    }

    // Export attendance data
    async exportAttendanceData(startDate, endDate) {
        try {
            const history = await this.getAttendanceHistory(startDate, endDate);
            const userData = StorageUtils.getLocal('currentUser');
            
            const csvContent = this.generateAttendanceCSV(history);
            const filename = `attendance_${userData.name.replace(/\s+/g, '_')}_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
            
            if (downloadFile(csvContent, filename, 'text/csv')) {
                showNotification('Attendance data exported successfully!', 'success');
            } else {
                showNotification('Export failed', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Export failed: ' + error.message, 'error');
        }
    }

    generateAttendanceCSV(records) {
        const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Break Time (min)', 'Notes'];
        const rows = records.map(record => [
            record.date,
            record.status,
            record.check_in ? DateTimeUtils.formatTime(record.check_in) : '',
            record.check_out ? DateTimeUtils.formatTime(record.check_out) : '',
            record.total_hours || 0,
            record.break_time || 0,
            record.notes || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    // Cleanup method
    destroy() {
        try {
            // Save current break state
            this.saveBreakState();
            
            // Stop all timers
            this.stopTimers();
            
            // Remove event listeners
            const checkInBtn = document.getElementById('checkInBtn');
            const checkOutBtn = document.getElementById('checkOutBtn');
            const breakBtn = document.getElementById('breakBtn');
            const monthSelector = document.getElementById('monthSelector');
            const yearSelector = document.getElementById('yearSelector');

            if (checkInBtn && this.handleCheckInBound) {
                checkInBtn.removeEventListener('click', this.handleCheckInBound);
            }
            if (checkOutBtn && this.handleCheckOutBound) {
                checkOutBtn.removeEventListener('click', this.handleCheckOutBound);
            }
            if (breakBtn && this.handleBreakToggleBound) {
                breakBtn.removeEventListener('click', this.handleBreakToggleBound);
            }
            if (monthSelector && this.handleCalendarChangeBound) {
                monthSelector.removeEventListener('change', this.handleCalendarChangeBound);
            }
            if (yearSelector && this.handleCalendarChangeBound) {
                yearSelector.removeEventListener('change', this.handleCalendarChangeBound);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Initialize attendance manager when DOM is loaded
let attendanceManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        attendanceManager = new AttendanceManager();
        window.attendanceManager = attendanceManager;
    } catch (error) {
        console.error('Attendance manager initialization error:', error);
    }
});

// Save break state periodically and on page unload
setInterval(() => {
    if (attendanceManager && typeof attendanceManager.saveBreakState === 'function') {
        attendanceManager.saveBreakState();
    }
}, 30000); // Every 30 seconds

window.addEventListener('beforeunload', () => {
    if (attendanceManager && typeof attendanceManager.destroy === 'function') {
        attendanceManager.destroy();
    }
});

console.log('Attendance management system loaded successfully');
