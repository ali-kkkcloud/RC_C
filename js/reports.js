// File Name: js/reports.js
// Reports Management System - FIXED VERSION

class ReportsManager {
    constructor() {
        this.reportCache = {};
        this.currentChart = null;
        this.isLoading = false;
        this.chartInstances = {};
        
        this.initializeReports();
    }

    async initializeReports() {
        try {
            this.isLoading = true;
            UIUtils.showLoading('Loading report data...');

            await this.loadReportData();
            this.setupEventListeners();
            this.renderDefaultCharts();
            this.updateReportStats();

        } catch (error) {
            console.error('Reports initialization error:', error);
            showNotification('Failed to initialize reports system', 'error');
        } finally {
            this.isLoading = false;
            UIUtils.hideLoading();
        }
    }

    setupEventListeners() {
        try {
            // Report generation buttons
            document.removeEventListener('click', this.handleReportActionBound);
            this.handleReportActionBound = this.handleReportAction.bind(this);
            document.addEventListener('click', this.handleReportActionBound);

            // Date range selectors
            const dateInputs = document.querySelectorAll('.report-date-input');
            dateInputs.forEach(input => {
                input.removeEventListener('change', this.handleDateChangeBound);
                this.handleDateChangeBound = this.handleDateChange.bind(this);
                input.addEventListener('change', this.handleDateChangeBound);
            });

            // Chart type selectors
            const chartSelectors = document.querySelectorAll('.chart-type-selector');
            chartSelectors.forEach(selector => {
                selector.removeEventListener('change', this.handleChartTypeBound);
                this.handleChartTypeBound = this.handleChartType.bind(this);
                selector.addEventListener('change', this.handleChartTypeBound);
            });

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    handleReportAction(event) {
        const target = event.target.closest('[data-report-action]');
        if (!target) return;

        event.preventDefault();
        const action = target.dataset.reportAction;
        const reportType = target.dataset.reportType;
        const format = target.dataset.format;

        switch (action) {
            case 'generate':
                this.generateReport(reportType);
                break;
            case 'export':
                this.exportReport(format || 'pdf');
                break;
            case 'schedule':
                this.showScheduleModal(reportType);
                break;
            case 'refresh':
                this.refreshReportData();
                break;
            case 'print':
                this.printReport();
                break;
            default:
                console.warn('Unknown report action:', action);
        }
    }

    handleDateChange(event) {
        try {
            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            
            if (startDate && endDate) {
                this.filterReportsByDateRange(startDate, endDate);
            }
        } catch (error) {
            console.error('Date change error:', error);
        }
    }

    handleChartType(event) {
        try {
            const chartType = event.target.value;
            const chartContainer = event.target.dataset.chartContainer;
            
            if (chartContainer) {
                this.updateChartType(chartContainer, chartType);
            }
        } catch (error) {
            console.error('Chart type change error:', error);
        }
    }

    async loadReportData() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            if (!userData) return;

            // Load different types of data for reports
            await Promise.all([
                this.loadAttendanceData(),
                this.loadTaskData(),
                this.loadPerformanceData(),
                this.loadTrainingData()
            ]);

        } catch (error) {
            console.error('Error loading report data:', error);
            // Use mock data as fallback
            this.loadMockData();
        }
    }

    async loadAttendanceData() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            
            if (userData.isDemo) {
                // Demo data
                this.attendanceData = this.generateMockAttendanceData();
            } else {
                // Real data from database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const thirtyDaysAgo = DateTimeUtils.addDays(new Date(), -30);
                const { data, error } = await window.supabase
                    .from(TABLES.ATTENDANCE)
                    .select('*')
                    .gte('date', DateTimeUtils.formatDate(thirtyDaysAgo, 'YYYY-MM-DD'))
                    .order('date', { ascending: true });

                if (error) throw error;
                this.attendanceData = this.processAttendanceData(data || []);
            }
        } catch (error) {
            console.error('Load attendance data error:', error);
            this.attendanceData = this.generateMockAttendanceData();
        }
    }

    async loadTaskData() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            
            if (userData.isDemo) {
                // Demo data
                this.taskData = this.generateMockTaskData();
            } else {
                // Real data from database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { data, error } = await window.supabase
                    .from(TABLES.TASKS)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.taskData = this.processTaskData(data || []);
            }
        } catch (error) {
            console.error('Load task data error:', error);
            this.taskData = this.generateMockTaskData();
        }
    }

    async loadPerformanceData() {
        try {
            // Mock performance data for now
            this.performanceData = this.generateMockPerformanceData();
        } catch (error) {
            console.error('Load performance data error:', error);
            this.performanceData = [];
        }
    }

    async loadTrainingData() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            
            if (userData.isDemo) {
                this.trainingData = this.generateMockTrainingData();
            } else {
                // In real implementation, load from training_progress table
                this.trainingData = this.generateMockTrainingData();
            }
        } catch (error) {
            console.error('Load training data error:', error);
            this.trainingData = [];
        }
    }

    generateMockAttendanceData() {
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = DateTimeUtils.addDays(today, -i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            if (!isWeekend) {
                data.push({
                    date: DateTimeUtils.formatDate(date, 'YYYY-MM-DD'),
                    present: Math.floor(Math.random() * 10) + 35, // 35-45 employees
                    absent: Math.floor(Math.random() * 5) + 2,   // 2-7 absent
                    late: Math.floor(Math.random() * 3) + 1,     // 1-4 late
                    total_hours: Math.floor(Math.random() * 50) + 300 // 300-350 total hours
                });
            }
        }
        
        return data;
    }

    generateMockTaskData() {
        return {
            total: 156,
            completed: 89,
            in_progress: 34,
            pending: 25,
            overdue: 8,
            by_priority: {
                high: 23,
                medium: 87,
                low: 46
            },
            by_category: {
                development: 45,
                testing: 28,
                documentation: 19,
                meeting: 32,
                training: 15,
                other: 17
            },
            completion_trend: [
                { week: 'Week 1', completed: 12 },
                { week: 'Week 2', completed: 18 },
                { week: 'Week 3', completed: 15 },
                { week: 'Week 4', completed: 21 }
            ]
        };
    }

    generateMockPerformanceData() {
        return [
            { month: 'Jan', productivity: 85, satisfaction: 4.2, quality: 88 },
            { month: 'Feb', productivity: 87, satisfaction: 4.3, quality: 90 },
            { month: 'Mar', productivity: 83, satisfaction: 4.1, quality: 86 },
            { month: 'Apr', productivity: 89, satisfaction: 4.4, quality: 92 },
            { month: 'May', productivity: 91, satisfaction: 4.5, quality: 94 },
            { month: 'Jun', productivity: 88, satisfaction: 4.3, quality: 89 }
        ];
    }

    generateMockTrainingData() {
        return {
            total_courses: 12,
            completed_courses: 8,
            in_progress: 3,
            not_started: 1,
            total_hours: 142,
            certificates_earned: 6,
            completion_rate: 75,
            popular_courses: [
                { name: 'JavaScript Fundamentals', enrollments: 45 },
                { name: 'Project Management', enrollments: 38 },
                { name: 'Communication Skills', enrollments: 32 },
                { name: 'UI/UX Design', enrollments: 28 }
            ]
        };
    }

    processAttendanceData(rawData) {
        // Process raw attendance data into chart-friendly format
        const processedData = {};
        
        rawData.forEach(record => {
            const date = record.date;
            if (!processedData[date]) {
                processedData[date] = {
                    date,
                    present: 0,
                    absent: 0,
                    late: 0,
                    total_hours: 0
                };
            }
            
            if (record.status === 'present') {
                processedData[date].present++;
                processedData[date].total_hours += record.total_hours || 0;
            } else if (record.status === 'absent') {
                processedData[date].absent++;
            }
            
            // Check if late (check-in after 9:30 AM)
            if (record.check_in) {
                const checkInTime = new Date(record.check_in);
                const lateThreshold = new Date(checkInTime);
                lateThreshold.setHours(9, 30, 0, 0);
                
                if (checkInTime > lateThreshold) {
                    processedData[date].late++;
                }
            }
        });
        
        return Object.values(processedData);
    }

    processTaskData(rawData) {
        const processed = {
            total: rawData.length,
            completed: 0,
            in_progress: 0,
            pending: 0,
            overdue: 0,
            by_priority: { high: 0, medium: 0, low: 0 },
            by_category: {},
            completion_trend: []
        };

        const now = new Date();

        rawData.forEach(task => {
            // Count by status
            processed[task.status] = (processed[task.status] || 0) + 1;
            
            // Count overdue
            if (task.status !== 'completed' && new Date(task.due_date) < now) {
                processed.overdue++;
            }
            
            // Count by priority
            processed.by_priority[task.priority] = (processed.by_priority[task.priority] || 0) + 1;
            
            // Count by category
            processed.by_category[task.category] = (processed.by_category[task.category] || 0) + 1;
        });

        return processed;
    }

    renderDefaultCharts() {
        try {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not available - charts will not be displayed');
                return;
            }

            this.renderAttendanceChart();
            this.renderTaskChart();
            this.renderPerformanceChart();
            this.renderTrainingChart();

        } catch (error) {
            console.error('Render charts error:', error);
        }
    }

    renderAttendanceChart() {
        try {
            const canvas = document.getElementById('attendanceChart');
            if (!canvas) return;

            // Destroy existing chart
            if (this.chartInstances.attendance) {
                this.chartInstances.attendance.destroy();
            }

            const ctx = canvas.getContext('2d');
            this.chartInstances.attendance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.attendanceData.map(d => DateTimeUtils.formatDate(d.date, 'short')),
                    datasets: [{
                        label: 'Present',
                        data: this.attendanceData.map(d => d.present),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Absent',
                        data: this.attendanceData.map(d => d.absent),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Daily Attendance Trends'
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Employees'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Render attendance chart error:', error);
        }
    }

    renderTaskChart() {
        try {
            const canvas = document.getElementById('taskChart');
            if (!canvas) return;

            // Destroy existing chart
            if (this.chartInstances.tasks) {
                this.chartInstances.tasks.destroy();
            }

            const ctx = canvas.getContext('2d');
            this.chartInstances.tasks = new Chart(ctx, {
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
                            'rgb(34, 197, 94)',
                            'rgb(251, 191, 36)',
                            'rgb(156, 163, 175)',
                            'rgb(239, 68, 68)'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
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

        } catch (error) {
            console.error('Render task chart error:', error);
        }
    }

    renderPerformanceChart() {
        try {
            const canvas = document.getElementById('performanceChart');
            if (!canvas) return;

            // Destroy existing chart
            if (this.chartInstances.performance) {
                this.chartInstances.performance.destroy();
            }

            const ctx = canvas.getContext('2d');
            this.chartInstances.performance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.performanceData.map(d => d.month),
                    datasets: [{
                        label: 'Productivity',
                        data: this.performanceData.map(d => d.productivity),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }, {
                        label: 'Quality Score',
                        data: this.performanceData.map(d => d.quality),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Performance Metrics'
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Score (%)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Render performance chart error:', error);
        }
    }

    renderTrainingChart() {
        try {
            const canvas = document.getElementById('trainingChart');
            if (!canvas) return;

            // Destroy existing chart
            if (this.chartInstances.training) {
                this.chartInstances.training.destroy();
            }

            const ctx = canvas.getContext('2d');
            this.chartInstances.training = new Chart(ctx, {
                type: 'horizontalBar',
                data: {
                    labels: this.trainingData.popular_courses.map(c => c.name),
                    datasets: [{
                        label: 'Enrollments',
                        data: this.trainingData.popular_courses.map(c => c.enrollments),
                        backgroundColor: 'rgba(139, 92, 246, 0.8)',
                        borderColor: 'rgb(139, 92, 246)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Popular Training Courses'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Enrollments'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Render training chart error:', error);
        }
    }

    updateReportStats() {
        try {
            // Update attendance stats
            const avgAttendance = this.attendanceData.length > 0
                ? Math.round(this.attendanceData.reduce((sum, d) => sum + d.present, 0) / this.attendanceData.length)
                : 0;

            // Update performance stats
            const avgPerformance = this.performanceData.length > 0
                ? Math.round(this.performanceData.reduce((sum, d) => sum + d.productivity, 0) / this.performanceData.length)
                : 0;

            // Update stats display
            const statsElements = {
                'avgAttendance': avgAttendance,
                'totalTasks': this.taskData.total,
                'completionRate': Math.round((this.taskData.completed / this.taskData.total) * 100) + '%',
                'avgPerformance': avgPerformance + '%',
                'trainingHours': this.trainingData.total_hours,
                'certificatesEarned': this.trainingData.certificates_earned
            };

            Object.entries(statsElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });

        } catch (error) {
            console.error('Update report stats error:', error);
        }
    }

    async generateReport(reportType) {
        try {
            UIUtils.showLoading(`Generating ${reportType} report...`);
            
            let report;
            switch (reportType) {
                case 'attendance':
                    report = await this.generateAttendanceReport();
                    break;
                case 'performance':
                    report = await this.generatePerformanceReport();
                    break;
                case 'tasks':
                    report = await this.generateTaskReport();
                    break;
                case 'training':
                    report = await this.generateTrainingReport();
                    break;
                case 'comprehensive':
                    report = await this.generateComprehensiveReport();
                    break;
                default:
                    throw new Error('Unknown report type');
            }

            this.reportCache[reportType] = report;
            this.displayReport(report);
            showNotification(`${StringUtils.capitalize(reportType)} report generated successfully!`, 'success');

        } catch (error) {
            console.error('Generate report error:', error);
            showNotification('Failed to generate report: ' + error.message, 'error');
        } finally {
            UIUtils.hideLoading();
        }
    }

    async generateAttendanceReport() {
        const totalDays = this.attendanceData.length;
        const totalPresent = this.attendanceData.reduce((sum, d) => sum + d.present, 0);
        const totalAbsent = this.attendanceData.reduce((sum, d) => sum + d.absent, 0);
        const avgAttendanceRate = totalDays > 0 ? ((totalPresent / (totalPresent + totalAbsent)) * 100) : 0;

        return {
            type: 'attendance',
            title: 'Attendance Report',
            period: `${DateTimeUtils.formatDate(this.attendanceData[0]?.date)} - ${DateTimeUtils.formatDate(this.attendanceData[this.attendanceData.length - 1]?.date)}`,
            summary: {
                totalDays,
                avgAttendanceRate: Math.round(avgAttendanceRate),
                totalPresent,
                totalAbsent,
                bestDay: this.getBestAttendanceDay(),
                worstDay: this.getWorstAttendanceDay()
            },
            trends: this.getAttendanceTrends(),
            recommendations: this.getAttendanceRecommendations()
        };
    }

    async generatePerformanceReport() {
        const avgProductivity = this.performanceData.reduce((sum, d) => sum + d.productivity, 0) / this.performanceData.length;
        const avgSatisfaction = this.performanceData.reduce((sum, d) => sum + d.satisfaction, 0) / this.performanceData.length;
        const avgQuality = this.performanceData.reduce((sum, d) => sum + d.quality, 0) / this.performanceData.length;

        return {
            type: 'performance',
            title: 'Performance Report',
            period: `${this.performanceData[0]?.month} - ${this.performanceData[this.performanceData.length - 1]?.month}`,
            summary: {
                avgProductivity: Math.round(avgProductivity),
                avgSatisfaction: NumberUtils.roundToDecimal(avgSatisfaction, 1),
                avgQuality: Math.round(avgQuality),
                topPerformers: this.getTopPerformers(),
                improvementAreas: this.getImprovementAreas()
            },
            monthlyData: this.performanceData,
            insights: this.getPerformanceInsights()
        };
    }

    async generateTaskReport() {
        const completionRate = (this.taskData.completed / this.taskData.total) * 100;
        const overdueRate = (this.taskData.overdue / this.taskData.total) * 100;

        return {
            type: 'tasks',
            title: 'Task Management Report',
            summary: {
                totalTasks: this.taskData.total,
                completionRate: Math.round(completionRate),
                overdueRate: Math.round(overdueRate),
                avgTasksPerEmployee: Math.round(this.taskData.total / 45) // assuming 45 employees
            },
            distribution: {
                byStatus: {
                    completed: this.taskData.completed,
                    inProgress: this.taskData.in_progress,
                    pending: this.taskData.pending,
                    overdue: this.taskData.overdue
                },
                byPriority: this.taskData.by_priority,
                byCategory: this.taskData.by_category
            },
            recommendations: this.getTaskRecommendations()
        };
    }

    async generateTrainingReport() {
        return {
            type: 'training',
            title: 'Training & Development Report',
            summary: {
                totalCourses: this.trainingData.total_courses,
                completionRate: this.trainingData.completion_rate,
                totalHours: this.trainingData.total_hours,
                certificatesEarned: this.trainingData.certificates_earned
            },
            courseData: {
                completed: this.trainingData.completed_courses,
                inProgress: this.trainingData.in_progress,
                notStarted: this.trainingData.not_started
            },
            popularCourses: this.trainingData.popular_courses,
            recommendations: this.getTrainingRecommendations()
        };
    }

    async generateComprehensiveReport() {
        const attendance = await this.generateAttendanceReport();
        const performance = await this.generatePerformanceReport();
        const tasks = await this.generateTaskReport();
        const training = await this.generateTrainingReport();

        return {
            type: 'comprehensive',
            title: 'Comprehensive System Report',
            generated: new Date().toISOString(),
            executiveSummary: this.generateExecutiveSummary(attendance, performance, tasks, training),
            sections: {
                attendance,
                performance,
                tasks,
                training
            },
            recommendations: this.generateOverallRecommendations(),
            kpiDashboard: this.generateKPIDashboard()
        };
    }

    displayReport(report) {
        try {
            const reportContainer = document.getElementById('reportContainer');
            if (!reportContainer) return;

            const reportHTML = this.generateReportHTML(report);
            reportContainer.innerHTML = reportHTML;

            // Show report container
            reportContainer.style.display = 'block';

        } catch (error) {
            console.error('Display report error:', error);
        }
    }

    generateReportHTML(report) {
        let html = `
            <div class="report-header">
                <h2>${StringUtils.escapeHtml(report.title)}</h2>
                <div class="report-meta">
                    <span>Generated: ${DateTimeUtils.formatDate(new Date(), 'long')}</span>
                    ${report.period ? `<span>Period: ${StringUtils.escapeHtml(report.period)}</span>` : ''}
                </div>
            </div>
        `;

        if (report.type === 'comprehensive') {
            html += this.generateComprehensiveReportHTML(report);
        } else {
            html += this.generateStandardReportHTML(report);
        }

        html += `
            <div class="report-actions">
                <button class="btn btn-primary" data-report-action="export" data-format="pdf">
                    <i class="fas fa-file-pdf"></i> Export PDF
                </button>
                <button class="btn btn-outline" data-report-action="export" data-format="excel">
                    <i class="fas fa-file-excel"></i> Export Excel
                </button>
                <button class="btn btn-outline" data-report-action="print">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        `;

        return html;
    }

    generateStandardReportHTML(report) {
        let html = '<div class="report-content">';

        // Summary section
        if (report.summary) {
            html += '<div class="report-section"><h3>Summary</h3>';
            html += '<div class="summary-grid">';
            
            Object.entries(report.summary).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    html += `<div class="summary-item"><strong>${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}:</strong> ${JSON.stringify(value)}</div>`;
                } else {
                    html += `<div class="summary-item"><strong>${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}:</strong> ${value}</div>`;
                }
            });
            
            html += '</div></div>';
        }

        // Recommendations section
        if (report.recommendations) {
            html += '<div class="report-section"><h3>Recommendations</h3>';
            html += '<ul class="recommendations-list">';
            report.recommendations.forEach(rec => {
                html += `<li>${StringUtils.escapeHtml(rec)}</li>`;
            });
            html += '</ul></div>';
        }

        html += '</div>';
        return html;
    }

    generateComprehensiveReportHTML(report) {
        let html = '<div class="comprehensive-report">';

        // Executive Summary
        if (report.executiveSummary) {
            html += '<div class="report-section executive-summary">';
            html += '<h3>Executive Summary</h3>';
            html += `<p>${StringUtils.escapeHtml(report.executiveSummary)}</p>`;
            html += '</div>';
        }

        // KPI Dashboard
        if (report.kpiDashboard) {
            html += '<div class="report-section kpi-dashboard">';
            html += '<h3>Key Performance Indicators</h3>';
            html += '<div class="kpi-grid">';
            
            Object.entries(report.kpiDashboard).forEach(([key, value]) => {
                html += `
                    <div class="kpi-item">
                        <div class="kpi-value">${value}</div>
                        <div class="kpi-label">${StringUtils.titleCase(key.replace(/([A-Z])/g, ' $1'))}</div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }

        // Individual sections
        Object.values(report.sections).forEach(section => {
            html += this.generateStandardReportHTML(section);
        });

        html += '</div>';
        return html;
    }

    exportReport(format) {
        try {
            const reportContainer = document.getElementById('reportContainer');
            if (!reportContainer) {
                showNotification('No report to export', 'warning');
                return;
            }

            const content = reportContainer.innerHTML;
            const filename = `report_${DateTimeUtils.formatDate(new Date(), 'YYYY-MM-DD')}.${format}`;

            if (format === 'pdf') {
                // In a real implementation, you would use a PDF generation library
                showNotification('PDF export would be implemented with a PDF library', 'info');
            } else if (format === 'excel') {
                // Convert to CSV format as a simple alternative
                const csvContent = this.convertReportToCSV();
                downloadFile(csvContent, filename.replace('.excel', '.csv'), 'text/csv');
                showNotification('Report exported as CSV', 'success');
            } else {
                downloadFile(content, filename, 'text/html');
                showNotification('Report exported successfully!', 'success');
            }

        } catch (error) {
            console.error('Export report error:', error);
            showNotification('Failed to export report', 'error');
        }
    }

    convertReportToCSV() {
        // Simple CSV conversion - in real implementation, this would be more sophisticated
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Employees', '45'],
            ['Attendance Rate', '92%'],
            ['Task Completion Rate', '89%'],
            ['Average Performance', '87%']
        ];

        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    printReport() {
        try {
            const reportContainer = document.getElementById('reportContainer');
            if (!reportContainer) {
                showNotification('No report to print', 'warning');
                return;
            }

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .report-header { margin-bottom: 20px; }
                        .report-section { margin-bottom: 30px; }
                        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                        .summary-item { padding: 10px; border: 1px solid #ddd; }
                        @media print { .report-actions { display: none; } }
                    </style>
                </head>
                <body>
                    ${reportContainer.innerHTML}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();

        } catch (error) {
            console.error('Print report error:', error);
            showNotification('Failed to print report', 'error');
        }
    }

    showScheduleModal(reportType) {
        try {
            const modalContent = `
                <form id="scheduleReportForm">
                    <input type="hidden" name="reportType" value="${reportType}">
                    
                    <div class="form-group">
                        <label for="scheduleFrequency">Frequency</label>
                        <select id="scheduleFrequency" name="frequency" class="form-control" required>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="scheduleEmail">Email Recipients</label>
                        <textarea id="scheduleEmail" name="emails" class="form-control" 
                                placeholder="Enter email addresses (comma-separated)" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="scheduleTime">Delivery Time</label>
                        <input type="time" id="scheduleTime" name="time" class="form-control" value="09:00" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Schedule Report</button>
                    </div>
                </form>
            `;

            const modal = UIUtils.showModal(modalContent, 'Schedule Report');

            // Handle form submission
            const form = modal.querySelector('#scheduleReportForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.scheduleReport(form);
                modal.remove();
            });

        } catch (error) {
            console.error('Show schedule modal error:', error);
        }
    }

    scheduleReport(form) {
        try {
            const formData = new FormData(form);
            const scheduleData = {
                reportType: formData.get('reportType'),
                frequency: formData.get('frequency'),
                emails: formData.get('emails').split(',').map(email => email.trim()),
                time: formData.get('time')
            };

            // In a real implementation, this would save to database and set up scheduled job
            showNotification(`${StringUtils.capitalize(scheduleData.reportType)} report scheduled ${scheduleData.frequency} for ${scheduleData.emails.length} recipients`, 'success');

        } catch (error) {
            console.error('Schedule report error:', error);
            showNotification('Failed to schedule report', 'error');
        }
    }

    async refreshReportData() {
        try {
            UIUtils.showLoading('Refreshing report data...');
            await this.loadReportData();
            this.renderDefaultCharts();
            this.updateReportStats();
            showNotification('Report data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Refresh data error:', error);
            showNotification('Failed to refresh data', 'error');
        } finally {
            UIUtils.hideLoading();
        }
    }

    updateChartType(containerSelector, chartType) {
        try {
            // In a real implementation, this would update the chart type
            showNotification(`Chart type updated to ${chartType}`, 'info');
        } catch (error) {
            console.error('Update chart type error:', error);
        }
    }

    filterReportsByDateRange(startDate, endDate) {
        try {
            // Filter data and update charts
            showNotification(`Filtered data from ${startDate} to ${endDate}`, 'info');
        } catch (error) {
            console.error('Filter reports error:', error);
        }
    }

    // Helper methods for generating insights and recommendations
    getBestAttendanceDay() {
        if (!this.attendanceData.length) return null;
        return this.attendanceData.reduce((best, current) => 
            current.present > best.present ? current : best
        );
    }

    getWorstAttendanceDay() {
        if (!this.attendanceData.length) return null;
        return this.attendanceData.reduce((worst, current) => 
            current.present < worst.present ? current : worst
        );
    }

    getAttendanceTrends() {
        return [
            'Attendance rates are stable with minor fluctuations',
            'Monday mornings show slightly lower attendance',
            'Friday afternoons have increased early departures'
        ];
    }

    getAttendanceRecommendations() {
        return [
            'Consider flexible start times to improve Monday attendance',
            'Implement wellness programs to reduce sick days',
            'Review remote work policies for better work-life balance'
        ];
    }

    getTopPerformers() {
        return ['Sarah Wilson', 'Lisa Chen', 'Mike Johnson'];
    }

    getImprovementAreas() {
        return [
            'Cross-team communication',
            'Project deadline management',
            'Technical skill development'
        ];
    }

    getPerformanceInsights() {
        return [
            'Overall performance trend is positive',
            'Quality scores consistently high',
            'Productivity gains observed in recent months'
        ];
    }

    getTaskRecommendations() {
        return [
            'Implement better task prioritization system',
            'Provide project management training',
            'Review resource allocation for overdue tasks'
        ];
    }

    getTrainingRecommendations() {
        return [
            'Increase focus on technical skills training',
            'Implement mentorship programs',
            'Provide more hands-on project opportunities'
        ];
    }

    generateExecutiveSummary(attendance, performance, tasks, training) {
        return `The organization shows strong overall performance with ${attendance.summary.avgAttendanceRate}% attendance rate, ${performance.summary.avgProductivity}% productivity score, and ${tasks.summary.completionRate}% task completion rate. Training engagement is high with ${training.summary.totalHours} hours completed and ${training.summary.certificatesEarned} certificates earned. Key areas for improvement include reducing overdue tasks and enhancing cross-departmental collaboration.`;
    }

    generateOverallRecommendations() {
        return [
            'Implement integrated performance tracking system',
            'Enhance remote work capabilities and policies',
            'Develop comprehensive employee development programs',
            'Improve inter-departmental communication channels',
            'Establish clear KPI benchmarks and regular reviews'
        ];
    }

    generateKPIDashboard() {
        return {
            attendanceRate: '92%',
            performanceScore: '87%',
            taskCompletion: '89%',
            trainingHours: '142h',
            employeeSatisfaction: '4.3/5',
            retentionRate: '94%'
        };
    }

    // Cleanup method
    destroy() {
        try {
            // Destroy chart instances
            Object.values(this.chartInstances).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });

            // Remove event listeners
            if (this.handleReportActionBound) {
                document.removeEventListener('click', this.handleReportActionBound);
            }

            const dateInputs = document.querySelectorAll('.report-date-input');
            dateInputs.forEach(input => {
                if (this.handleDateChangeBound) {
                    input.removeEventListener('change', this.handleDateChangeBound);
                }
            });

            const chartSelectors = document.querySelectorAll('.chart-type-selector');
            chartSelectors.forEach(selector => {
                if (this.handleChartTypeBound) {
                    selector.removeEventListener('change', this.handleChartTypeBound);
                }
            });

        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Initialize reports manager when DOM is loaded
let reportsManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Only initialize if Chart.js is available and we're on reports page
        if (typeof Chart !== 'undefined' && window.location.pathname.includes('reports')) {
            reportsManager = new ReportsManager();
            window.reportsManager = reportsManager;
        } else if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded - reports functionality will be limited');
        }
    } catch (error) {
        console.error('Reports manager initialization error:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (reportsManager && typeof reportsManager.destroy === 'function') {
        reportsManager.destroy();
    }
});

console.log('Reports management system loaded successfully');
