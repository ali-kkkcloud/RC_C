// File Name: js/reports.js

// Reports and Analytics System

class ReportsManager {
    constructor() {
        this.reportCache = {};
        this.chartInstances = {};
        
        this.initializeReports();
    }

    async initializeReports() {
        await this.loadReportData();
        this.setupReportEventListeners();
        this.renderDefaultCharts();
    }

    async loadReportData() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            // Load various data sources for reports
            this.attendanceData = await this.getAttendanceData();
            this.taskData = await this.getTaskData();
            this.employeeData = await this.getEmployeeData();
            this.performanceData = await this.getPerformanceData();
            
        } catch (error) {
            console.error('Error loading report data:', error);
        }
    }

    async getAttendanceData() {
        // Mock attendance data for demo
        const mockData = [];
        const today = new Date();
        
        // Generate 30 days of attendance data
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            mockData.push({
                date: date.toISOString().split('T')[0],
                present: Math.floor(Math.random() * 10) + 35, // 35-45 employees
                absent: Math.floor(Math.random() * 5) + 2,    // 2-7 employees
                late: Math.floor(Math.random() * 8) + 3,      // 3-11 employees
                total_hours: Math.floor(Math.random() * 50) + 300 // 300-350 total hours
            });
        }
        
        return mockData;
    }

    async getTaskData() {
        // Mock task data
        return {
            completed: 145,
            in_progress: 23,
            pending: 67,
            overdue: 12,
            by_priority: {
                high: 45,
                medium: 78,
                low: 102
            },
            by_category: {
                development: 89,
                design: 34,
                documentation: 23,
                meeting: 45,
                review: 34
            }
        };
    }

    async getEmployeeData() {
        // Get employee data from admin manager if available
        if (window.adminManager && window.adminManager.employees) {
            return window.adminManager.employees;
        }
        
        // Mock employee data
        return [
            { department: 'IT', performance: 85, attendance: 92 },
            { department: 'Marketing', performance: 92, attendance: 96 },
            { department: 'Sales', performance: 78, attendance: 88 },
            { department: 'HR', performance: 95, attendance: 98 },
            { department: 'Finance', performance: 87, attendance: 94 }
        ];
    }

    async getPerformanceData() {
        // Mock performance data over time
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => ({
            month,
            productivity: Math.floor(Math.random() * 20) + 75,
            satisfaction: Math.floor(Math.random() * 15) + 80,
            retention: Math.floor(Math.random() * 10) + 90
        }));
    }

    setupReportEventListeners() {
        // Report type selector
        const reportTypeSelect = document.getElementById('reportType');
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', this.handleReportTypeChange.bind(this));
        }

        // Date range selectors
        const dateRangeInputs = document.querySelectorAll('.date-range-input');
        dateRangeInputs.forEach(input => {
            input.addEventListener('change', this.handleDateRangeChange.bind(this));
        });

        // Export buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="export-report"]')) {
                const format = e.target.dataset.format;
                this.exportReport(format);
            }
        });
    }

    renderDefaultCharts() {
        this.renderAttendanceChart();
        this.renderTaskStatusChart();
        this.renderPerformanceChart();
        this.renderDepartmentChart();
    }

    renderAttendanceChart() {
        const canvas = document.getElementById('attendanceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chartInstances.attendance) {
            this.chartInstances.attendance.destroy();
        }

        const last7Days = this.attendanceData.slice(-7);
        
        this.chartInstances.attendance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(day => DateTimeUtils.formatDate(day.date, 'short')),
                datasets: [{
                    label: 'Present',
                    data: last7Days.map(day => day.present),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Absent',
                    data: last7Days.map(day => day.absent),
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Attendance Trend (Last 7 Days)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderTaskStatusChart() {
        const canvas = document.getElementById('taskStatusChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.taskStatus) {
            this.chartInstances.taskStatus.destroy();
        }

        this.chartInstances.taskStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
                datasets: [{
                    data: [
                        this.taskData.completed,
                        this.taskData.in_progress,
                        this.taskData.pending,
                        this.taskData.overdue
                    ],
                    backgroundColor: [
                        '#10B981',
                        '#F59E0B',
                        '#6B7280',
                        '#EF4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Task Status Distribution'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.performance) {
            this.chartInstances.performance.destroy();
        }

        this.chartInstances.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.performanceData.map(item => item.month),
                datasets: [{
                    label: 'Productivity',
                    data: this.performanceData.map(item => item.productivity),
                    backgroundColor: '#4F46E5'
                }, {
                    label: 'Satisfaction',
                    data: this.performanceData.map(item => item.satisfaction),
                    backgroundColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Metrics Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    renderDepartmentChart() {
        const canvas = document.getElementById('departmentChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.department) {
            this.chartInstances.department.destroy();
        }

        const departmentStats = this.calculateDepartmentStats();

        this.chartInstances.department = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: Object.keys(departmentStats),
                datasets: [{
                    label: 'Performance',
                    data: Object.values(departmentStats).map(dept => dept.avgPerformance),
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)'
                }, {
                    label: 'Attendance',
                    data: Object.values(departmentStats).map(dept => dept.avgAttendance),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Department Performance & Attendance'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    calculateDepartmentStats() {
        const stats = {};
        
        this.employeeData.forEach(employee => {
            if (!stats[employee.department]) {
                stats[employee.department] = {
                    employees: [],
                    avgPerformance: 0,
                    avgAttendance: 0
                };
            }
            stats[employee.department].employees.push(employee);
        });

        Object.keys(stats).forEach(dept => {
            const employees = stats[dept].employees;
            stats[dept].avgPerformance = employees.reduce((sum, emp) => sum + emp.performance, 0) / employees.length;
            stats[dept].avgAttendance = employees.reduce((sum, emp) => sum + emp.attendance, 0) / employees.length;
        });

        return stats;
    }

    handleReportTypeChange(event) {
        const reportType = event.target.value;
        this.generateCustomReport(reportType);
    }

    handleDateRangeChange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (startDate && endDate) {
            this.filterReportsByDateRange(startDate, endDate);
        }
    }

    async generateCustomReport(reportType) {
        UIUtils.showLoading('Generating report...');
        
        try {
            let reportData;
            
            switch (reportType) {
                case 'attendance':
                    reportData = await this.generateAttendanceReport();
                    break;
                case 'performance':
                    reportData = await this.generatePerformanceReport();
                    break;
                case 'tasks':
                    reportData = await this.generateTaskReport();
                    break;
                case 'comprehensive':
                    reportData = await this.generateComprehensiveReport();
                    break;
                default:
                    throw new Error('Unknown report type');
            }

            this.displayReport(reportData);
            UIUtils.hideLoading();
            
        } catch (error) {
            UIUtils.hideLoading();
            console.error('Error generating report:', error);
            showNotification('Failed to generate report', 'error');
        }
    }

    async generateAttendanceReport() {
        const totalDays = this.attendanceData.length;
        const totalPresent = this.attendanceData.reduce((sum, day) => sum + day.present, 0);
        const totalAbsent = this.attendanceData.reduce((sum, day) => sum + day.absent, 0);
        const totalHours = this.attendanceData.reduce((sum, day) => sum + day.total_hours, 0);
        
        return {
            type: 'attendance',
            title: 'Attendance Report',
            period: `${this.attendanceData[0].date} to ${this.attendanceData[totalDays - 1].date}`,
            summary: {
                totalDays,
                avgPresent: Math.round(totalPresent / totalDays),
                avgAbsent: Math.round(totalAbsent / totalDays),
                attendanceRate: Math.round((totalPresent / (totalPresent + totalAbsent)) * 100),
                totalHours: totalHours,
                avgHoursPerDay: Math.round(totalHours / totalDays)
            },
            details: this.attendanceData,
            insights: this.generateAttendanceInsights()
        };
    }

    generateAttendanceInsights() {
        const insights = [];
        
        // Find best and worst attendance days
        const sortedDays = [...this.attendanceData].sort((a, b) => b.present - a.present);
        const bestDay = sortedDays[0];
        const worstDay = sortedDays[sortedDays.length - 1];
        
        insights.push(`Best attendance: ${bestDay.present} employees on ${DateTimeUtils.formatDate(bestDay.date)}`);
        insights.push(`Lowest attendance: ${worstDay.present} employees on ${DateTimeUtils.formatDate(worstDay.date)}`);
        
        // Trend analysis
        const recent7Days = this.attendanceData.slice(-7);
        const previous7Days = this.attendanceData.slice(-14, -7);
        
        const recentAvg = recent7Days.reduce((sum, day) => sum + day.present, 0) / 7;
        const previousAvg = previous7Days.reduce((sum, day) => sum + day.present, 0) / 7;
        
        if (recentAvg > previousAvg) {
            insights.push(`Attendance improved by ${Math.round(recentAvg - previousAvg)} employees in the last week`);
        } else if (recentAvg < previousAvg) {
            insights.push(`Attendance decreased by ${Math.round(previousAvg - recentAvg)} employees in the last week`);
        }
        
        return insights;
    }

    async generatePerformanceReport() {
        const avgPerformance = this.performanceData.reduce((sum, month) => sum + month.productivity, 0) / this.performanceData.length;
        const avgSatisfaction = this.performanceData.reduce((sum, month) => sum + month.satisfaction, 0) / this.performanceData.length;
        
        return {
            type: 'performance',
            title: 'Performance Report',
            period: `${this.performanceData[0].month} - ${this.performanceData[this.performanceData.length - 1].month}`,
            summary: {
                avgProductivity: Math.round(avgPerformance),
                avgSatisfaction: Math.round(avgSatisfaction),
                topPerformer: this.getTopPerformer(),
                improvementAreas: this.getImprovementAreas()
            },
            details: this.performanceData,
            departmentBreakdown: this.calculateDepartmentStats()
        };
    }

    getTopPerformer() {
        // Mock top performer data
        return {
            name: 'Sarah Wilson',
            department: 'Marketing',
            score: 95,
            achievements: ['Employee of the Month', 'Perfect Attendance', 'Project Leadership']
        };
    }

    getImprovementAreas() {
        return [
            'Communication between departments',
            'Project deadline management',
            'Training program completion rates'
        ];
    }

    async generateTaskReport() {
        const totalTasks = Object.values(this.taskData).reduce((sum, count) => {
            return typeof count === 'number' ? sum + count : sum;
        }, 0);
        
        return {
            type: 'tasks',
            title: 'Task Management Report',
            summary: {
                totalTasks,
                completionRate: Math.round((this.taskData.completed / totalTasks) * 100),
                overdueRate: Math.round((this.taskData.overdue / totalTasks) * 100),
                avgTasksPerEmployee: Math.round(totalTasks / (this.employeeData.length || 1))
            },
            byPriority: this.taskData.by_priority,
            byCategory: this.taskData.by_category,
            recommendations: this.getTaskRecommendations()
        };
    }

    getTaskRecommendations() {
        return [
            'Consider redistributing high-priority tasks more evenly',
            'Focus on reducing overdue tasks through better deadline management',
            'Implement task automation for routine activities',
            'Provide additional training for project management tools'
        ];
    }

    async generateComprehensiveReport() {
        const attendance = await this.generateAttendanceReport();
        const performance = await this.generatePerformanceReport();
        const tasks = await this.generateTaskReport();
        
        return {
            type: 'comprehensive',
            title: 'Comprehensive System Report',
            generated: new Date().toISOString(),
            sections: {
                attendance,
                performance,
                tasks
            },
            executiveSummary: this.generateExecutiveSummary(attendance, performance, tasks),
            recommendations: this.generateOverallRecommendations()
        };
    }

    generateExecutiveSummary(attendance, performance, tasks) {
        return {
            overallHealth: 'Good',
            keyMetrics: {
                attendanceRate: `${attendance.summary.attendanceRate}%`,
                performanceScore: `${performance.summary.avgProductivity}%`,
                taskCompletionRate: `${tasks.summary.completionRate}%`
            },
            highlights: [
                'Attendance rates remain stable above 90%',
                'Employee satisfaction scores are improving',
                'Task completion rates exceed company targets'
            ],
            concerns: [
                'Slight increase in overdue tasks',
                'Some departments showing performance gaps',
                'Training completion rates below target'
            ]
        };
    }

    generateOverallRecommendations() {
        return [
            {
                priority: 'High',
                area: 'Task Management',
                action: 'Implement automated task assignment and deadline tracking'
            },
            {
                priority: 'Medium',
                area: 'Training',
                action: 'Increase training program engagement through gamification'
            },
            {
                priority: 'Medium',
                area: 'Performance',
                action: 'Conduct department-specific performance improvement sessions'
            },
            {
                priority: 'Low',
                area: 'Attendance',
                action: 'Maintain current attendance policies and monitoring'
            }
        ];
    }

    displayReport(reportData) {
        const reportContainer = document.getElementById('reportContainer');
        if (!reportContainer) return;

        let html = `
            <div class="report-header">
                <h2>${reportData.title}</h2>
                <p class="report-meta">Generated on ${DateTimeUtils.formatDate(new Date(), 'long')}</p>
                ${reportData.period ? `<p class="report-period">Period: ${reportData.period}</p>` : ''}
            </div>
        `;

        if (reportData.type === 'comprehensive') {
            html += this.renderComprehensiveReport(reportData);
        } else {
            html += this.renderStandardReport(reportData);
        }

        reportContainer.innerHTML = html;
    }

    renderComprehensiveReport(data) {
        return `
            <div class="executive-summary">
                <h3>Executive Summary</h3>
                <div class="summary-cards">
                    ${Object.entries(data.executiveSummary.keyMetrics).map(([key, value]) => `
                        <div class="summary-card">
                            <div class="metric-value">${value}</div>
                            <div class="metric-label">${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="highlights-concerns">
                    <div class="highlights">
                        <h4>Key Highlights</h4>
                        <ul>
                            ${data.executiveSummary.highlights.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="concerns">
                        <h4>Areas of Concern</h4>
                        <ul>
                            ${data.executiveSummary.concerns.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="recommendations">
                <h3>Recommendations</h3>
                <div class="recommendations-list">
                    ${data.recommendations.map(rec => `
                        <div class="recommendation-item priority-${rec.priority.toLowerCase()}">
                            <div class="rec-priority">${rec.priority} Priority</div>
                            <div class="rec-area">${rec.area}</div>
                            <div class="rec-action">${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderStandardReport(data) {
        let html = '<div class="report-content">';
        
        if (data.summary) {
            html += `
                <div class="report-summary">
                    <h3>Summary</h3>
                    <div class="summary-grid">
                        ${Object.entries(data.summary).map(([key, value]) => `
                            <div class="summary-item">
                                <div class="summary-label">${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}</div>
                                <div class="summary-value">${value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (data.insights) {
            html += `
                <div class="report-insights">
                    <h3>Key Insights</h3>
                    <ul>
                        ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    exportReport(format = 'csv') {
        const reportData = this.getActiveReportData();
        if (!reportData) {
            showNotification('No report data to export', 'warning');
            return;
        }

        const filename = `${reportData.type}_report_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}`;
        
        switch (format) {
            case 'csv':
                this.exportAsCSV(reportData, filename);
                break;
            case 'json':
                this.exportAsJSON(reportData, filename);
                break;
            case 'pdf':
                this.exportAsPDF(reportData, filename);
                break;
            default:
                showNotification('Unsupported export format', 'error');
        }
    }

    exportAsCSV(data, filename) {
        let csv = '';
        
        if (data.details && Array.isArray(data.details)) {
            // Export detailed data as CSV
            const headers = Object.keys(data.details[0]);
            csv = headers.join(',') + '\n';
            
            data.details.forEach(row => {
                csv += headers.map(header => `"${row[header]}"`).join(',') + '\n';
            });
        } else if (data.summary) {
            // Export summary data as CSV
            csv = 'Metric,Value\n';
            Object.entries(data.summary).forEach(([key, value]) => {
                csv += `"${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}","${value}"\n`;
            });
        }
        
        downloadFile(csv, `${filename}.csv`, 'text/csv');
        showNotification('Report exported as CSV', 'success');
    }

    exportAsJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, `${filename}.json`, 'application/json');
        showNotification('Report exported as JSON', 'success');
    }

    exportAsPDF(data, filename) {
        // Mock PDF export - in real implementation, would use jsPDF or similar
        showNotification('PDF export feature coming soon!', 'info');
    }

    getActiveReportData() {
        // Return the currently displayed report data
        // This would be stored when a report is generated
        return this.reportCache.current || null;
    }

    filterReportsByDateRange(startDate, endDate) {
        const filteredData = this.attendanceData.filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= new Date(startDate) && dayDate <= new Date(endDate);
        });

        // Update charts with filtered data
        this.attendanceData = filteredData;
        this.renderAttendanceChart();
        
        showNotification(`Filtered data from ${startDate} to ${endDate}`, 'info');
    }

    // Real-time dashboard updates
    startRealTimeUpdates() {
        setInterval(() => {
            this.refreshDashboardData();
        }, 30000); // Update every 30 seconds
    }

    async refreshDashboardData() {
        try {
            // In real implementation, fetch latest data from API
            await this.loadReportData();
            this.renderDefaultCharts();
        } catch (error) {
            console.error('Error refreshing dashboard data:', error);
        }
    }

    // Scheduled reports
    scheduleReport(reportType, frequency, emailList) {
        // Mock scheduled reporting
        showNotification(`Scheduled ${reportType} report (${frequency}) for ${emailList.length} recipients`, 'success');
        
        // In real implementation, this would:
        // 1. Store schedule in database
        // 2. Set up server-side cron job
        // 3. Configure email delivery
    }
}

// Initialize reports manager
let reportsManager;

document.addEventListener('DOMContentLoaded', () => {
    // Check if Chart.js is available (would be loaded from CDN)
    if (typeof Chart !== 'undefined') {
        reportsManager = new ReportsManager();
    } else {
        console.warn('Chart.js not loaded - charts will not be displayed');
    }
});

// Global report functions
window.updateAttendanceChart = function(period) {
    if (reportsManager) {
        // Mock update based on period
        showNotification(`Chart updated for ${period}`, 'info');
    }
};

window.exportReport = function(format) {
    if (reportsManager) {
        reportsManager.exportReport(format);
    }
};

window.generateCustomReport = function(type) {
    if (reportsManager) {
        reportsManager.generateCustomReport(type);
    }
};

console.log('Reports module loaded successfully');
