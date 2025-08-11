// File Name: js/training.js

// Training Management System

class TrainingManager {
    constructor() {
        this.currentCourse = null;
        this.userProgress = {};
        this.achievements = [];
        this.certificates = [];
        
        this.initializeTraining();
    }

    async initializeTraining() {
        await this.loadUserProgress();
        await this.loadCourses();
        await this.loadAchievements();
        this.updateProgressDisplay();
    }

    async loadUserProgress() {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return;

        try {
            if (userData.isDemo) {
                // Demo account - load from localStorage
                this.userProgress = StorageUtils.getLocal(`training_progress_${userData.id}`, {});
                this.certificates = StorageUtils.getLocal(`certificates_${userData.id}`, []);
            } else {
                // Real account - load from database
                const { data, error } = await supabase
                    .from(TABLES.TRAINING_PROGRESS)
                    .select('*')
                    .eq('employee_id', userData.id);

                if (error) {
                    console.error('Error loading training progress:', error);
                    return;
                }

                // Convert array to object for easier access
                this.userProgress = {};
                data?.forEach(record => {
                    this.userProgress[record.course_id] = record;
                });
            }
        } catch (error) {
            console.error('Error loading user progress:', error);
        }
    }

    async loadCourses() {
        try {
            // In real implementation, this would load from database
            this.courses = this.getMockCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    getMockCourses() {
        return {
            'js-fundamentals': {
                id: 'js-fundamentals',
                title: 'JavaScript Fundamentals',
                description: 'Learn the core concepts of JavaScript programming language',
                category: 'programming',
                level: 'beginner',
                duration: '4h 30m',
                rating: 4.8,
                thumbnail: 'fab fa-js-square',
                lessons: [
                    { id: 'js-1', title: 'Introduction to JavaScript', duration: '15 min', type: 'video' },
                    { id: 'js-2', title: 'Variables and Data Types', duration: '25 min', type: 'video' },
                    { id: 'js-3', title: 'Functions and Scope', duration: '30 min', type: 'video' },
                    { id: 'js-4', title: 'Objects and Arrays', duration: '35 min', type: 'video' },
                    { id: 'js-5', title: 'DOM Manipulation', duration: '40 min', type: 'video' },
                    { id: 'js-quiz', title: 'Final Quiz', duration: '15 min', type: 'quiz' }
                ],
                prerequisites: ['html-basics', 'css-fundamentals']
            },
            'react-development': {
                id: 'react-development',
                title: 'React Development',
                description: 'Build modern web applications with React framework',
                category: 'programming',
                level: 'intermediate',
                duration: '6h 15m',
                rating: 4.9,
                thumbnail: 'fab fa-react',
                lessons: [
                    { id: 'react-1', title: 'Introduction to React', duration: '20 min', type: 'video' },
                    { id: 'react-2', title: 'Components and JSX', duration: '30 min', type: 'video' },
                    { id: 'react-3', title: 'State and Props', duration: '35 min', type: 'video' },
                    { id: 'react-4', title: 'Event Handling', duration: '25 min', type: 'video' },
                    { id: 'react-5', title: 'Hooks', duration: '45 min', type: 'video' },
                    { id: 'react-project', title: 'Build a Todo App', duration: '60 min', type: 'project' },
                    { id: 'react-quiz', title: 'Final Assessment', duration: '20 min', type: 'quiz' }
                ],
                prerequisites: ['js-fundamentals']
            },
            'ui-ux-basics': {
                id: 'ui-ux-basics',
                title: 'UI/UX Design Basics',
                description: 'Learn the fundamentals of user interface and experience design',
                category: 'design',
                level: 'beginner',
                duration: '3h 45m',
                rating: 4.7,
                thumbnail: 'fas fa-palette',
                lessons: [
                    { id: 'ux-1', title: 'Introduction to UX', duration: '20 min', type: 'video' },
                    { id: 'ux-2', title: 'User Research', duration: '25 min', type: 'video' },
                    { id: 'ux-3', title: 'Wireframing', duration: '30 min', type: 'video' },
                    { id: 'ux-4', title: 'Prototyping', duration: '35 min', type: 'video' },
                    { id: 'ux-5', title: 'Design Systems', duration: '40 min', type: 'video' },
                    { id: 'ux-project', title: 'Design a Mobile App', duration: '45 min', type: 'project' }
                ],
                prerequisites: []
            },
            'project-management': {
                id: 'project-management',
                title: 'Project Management',
                description: 'Essential project management skills for modern workplace',
                category: 'business',
                level: 'beginner',
                duration: '2h 20m',
                rating: 4.6,
                thumbnail: 'fas fa-chart-line',
                lessons: [
                    { id: 'pm-1', title: 'Introduction to Project Management', duration: '20 min', type: 'video' },
                    { id: 'pm-2', title: 'Project Planning', duration: '30 min', type: 'video' },
                    { id: 'pm-3', title: 'Risk Management', duration: '25 min', type: 'video' },
                    { id: 'pm-4', title: 'Team Leadership', duration: '35 min', type: 'video' },
                    { id: 'pm-quiz', title: 'Assessment', duration: '10 min', type: 'quiz' }
                ],
                prerequisites: []
            },
            'communication-skills': {
                id: 'communication-skills',
                title: 'Communication Skills',
                description: 'Improve your workplace communication and presentation skills',
                category: 'soft-skills',
                level: 'beginner',
                duration: '1h 50m',
                rating: 4.8,
                thumbnail: 'fas fa-comments',
                lessons: [
                    { id: 'comm-1', title: 'Effective Communication', duration: '25 min', type: 'video' },
                    { id: 'comm-2', title: 'Presentation Skills', duration: '30 min', type: 'video' },
                    { id: 'comm-3', title: 'Active Listening', duration: '20 min', type: 'video' },
                    { id: 'comm-4', title: 'Written Communication', duration: '25 min', type: 'video' }
                ],
                prerequisites: []
            }
        };
    }

    async startCourse(courseId) {
        const course = this.courses[courseId];
        if (!course) {
            showNotification('Course not found', 'error');
            return false;
        }

        // Check prerequisites
        if (!this.checkPrerequisites(course.prerequisites)) {
            showNotification('Please complete prerequisite courses first', 'warning');
            return false;
        }

        try {
            // Initialize course progress if not exists
            if (!this.userProgress[courseId]) {
                await this.initializeCourseProgress(courseId);
            }

            this.currentCourse = courseId;
            this.openLessonPlayer(courseId, this.getNextLesson(courseId));
            
            showNotification(`Started course: ${course.title}`, 'success');
            return true;

        } catch (error) {
            console.error('Error starting course:', error);
            showNotification('Failed to start course', 'error');
            return false;
        }
    }

    checkPrerequisites(prerequisites) {
        if (!prerequisites || prerequisites.length === 0) return true;

        return prerequisites.every(prereq => {
            const progress = this.userProgress[prereq];
            return progress && progress.completion_percentage >= 100;
        });
    }

    async initializeCourseProgress(courseId) {
        const userData = StorageUtils.getLocal('currentUser');
        const course = this.courses[courseId];
        
        const progressData = {
            employee_id: userData.id,
            course_id: courseId,
            course_title: course.title,
            enrollment_date: new Date().toISOString(),
            completion_percentage: 0,
            current_lesson: course.lessons[0]?.id || null,
            completed_lessons: [],
            quiz_scores: {},
            status: 'in_progress',
            last_accessed: new Date().toISOString()
        };

        if (userData.isDemo) {
            // Demo account - save to localStorage
            this.userProgress[courseId] = progressData;
            StorageUtils.setLocal(`training_progress_${userData.id}`, this.userProgress);
        } else {
            // Real account - save to database
            const { data, error } = await supabase
                .from(TABLES.TRAINING_PROGRESS)
                .insert([progressData])
                .select()
                .single();

            if (error) throw error;
            this.userProgress[courseId] = data;
        }
    }

    getNextLesson(courseId) {
        const course = this.courses[courseId];
        const progress = this.userProgress[courseId];
        
        if (!progress || !progress.completed_lessons) {
            return course.lessons[0]?.id;
        }

        const completedLessons = progress.completed_lessons || [];
        const nextLesson = course.lessons.find(lesson => 
            !completedLessons.includes(lesson.id)
        );

        return nextLesson?.id || course.lessons[course.lessons.length - 1]?.id;
    }

    async markLessonComplete(courseId, lessonId) {
        try {
            const progress = this.userProgress[courseId];
            if (!progress) return false;

            const course = this.courses[courseId];
            const completedLessons = progress.completed_lessons || [];
            
            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);
            }

            const completionPercentage = (completedLessons.length / course.lessons.length) * 100;
            const status = completionPercentage >= 100 ? 'completed' : 'in_progress';

            const updatedProgress = {
                ...progress,
                completed_lessons: completedLessons,
                completion_percentage: completionPercentage,
                status: status,
                last_accessed: new Date().toISOString(),
                completion_date: status === 'completed' ? new Date().toISOString() : null
            };

            const userData = StorageUtils.getLocal('currentUser');

            if (userData.isDemo) {
                // Demo account
                this.userProgress[courseId] = updatedProgress;
                StorageUtils.setLocal(`training_progress_${userData.id}`, this.userProgress);
            } else {
                // Real account
                const { error } = await supabase
                    .from(TABLES.TRAINING_PROGRESS)
                    .update(updatedProgress)
                    .eq('employee_id', userData.id)
                    .eq('course_id', courseId);

                if (error) throw error;
                this.userProgress[courseId] = updatedProgress;
            }

            // Check for course completion
            if (status === 'completed') {
                await this.handleCourseCompletion(courseId);
            }

            this.updateProgressDisplay();
            showNotification('Lesson marked as complete!', 'success');
            return true;

        } catch (error) {
            console.error('Error marking lesson complete:', error);
            showNotification('Failed to update progress', 'error');
            return false;
        }
    }

    async handleCourseCompletion(courseId) {
        const course = this.courses[courseId];
        
        // Generate certificate
        await this.generateCertificate(courseId);
        
        // Check for achievements
        await this.checkAchievements();
        
        showNotification(`Congratulations! You completed ${course.title}!`, 'success');
    }

    async generateCertificate(courseId) {
        const userData = StorageUtils.getLocal('currentUser');
        const course = this.courses[courseId];
        
        const certificate = {
            id: StringUtils.generateId('cert'),
            employee_id: userData.id,
            course_id: courseId,
            course_title: course.title,
            employee_name: userData.name,
            completion_date: new Date().toISOString(),
            certificate_url: null // Would be generated by certificate service
        };

        if (userData.isDemo) {
            this.certificates.push(certificate);
            StorageUtils.setLocal(`certificates_${userData.id}`, this.certificates);
        } else {
            // In real implementation, save to database
            console.log('Certificate generated:', certificate);
        }
    }

    async checkAchievements() {
        const completedCourses = Object.values(this.userProgress)
            .filter(progress => progress.status === 'completed');

        const newAchievements = [];

        // First Course Achievement
        if (completedCourses.length === 1 && !this.hasAchievement('first-course')) {
            newAchievements.push({
                id: 'first-course',
                title: 'Getting Started',
                description: 'Completed your first course',
                icon: 'fas fa-star',
                date: new Date().toISOString()
            });
        }

        // Quick Learner Achievement
        const thisMonth = new Date();
        const monthlyCompletions = completedCourses.filter(course => {
            const completionDate = new Date(course.completion_date);
            return completionDate.getMonth() === thisMonth.getMonth() &&
                   completionDate.getFullYear() === thisMonth.getFullYear();
        });

        if (monthlyCompletions.length >= 3 && !this.hasAchievement('quick-learner')) {
            newAchievements.push({
                id: 'quick-learner',
                title: 'Quick Learner',
                description: 'Completed 3 courses in one month',
                icon: 'fas fa-medal',
                date: new Date().toISOString()
            });
        }

        // Perfect Score Achievement
        const perfectScores = Object.values(this.userProgress)
            .filter(progress => {
                const quizScores = Object.values(progress.quiz_scores || {});
                return quizScores.some(score => score >= 100);
            });

        if (perfectScores.length > 0 && !this.hasAchievement('perfect-score')) {
            newAchievements.push({
                id: 'perfect-score',
                title: 'Perfect Score',
                description: 'Scored 100% in a quiz',
                icon: 'fas fa-trophy',
                date: new Date().toISOString()
            });
        }

        // Save new achievements
        if (newAchievements.length > 0) {
            this.achievements.push(...newAchievements);
            this.saveAchievements();
            
            newAchievements.forEach(achievement => {
                showNotification(`Achievement unlocked: ${achievement.title}!`, 'success');
            });
        }
    }

    hasAchievement(achievementId) {
        return this.achievements.some(achievement => achievement.id === achievementId);
    }

    async saveAchievements() {
        const userData = StorageUtils.getLocal('currentUser');
        
        if (userData.isDemo) {
            StorageUtils.setLocal(`achievements_${userData.id}`, this.achievements);
        } else {
            // In real implementation, save to database
            console.log('Achievements saved:', this.achievements);
        }
    }

    async loadAchievements() {
        const userData = StorageUtils.getLocal('currentUser');
        
        if (userData.isDemo) {
            this.achievements = StorageUtils.getLocal(`achievements_${userData.id}`, []);
        } else {
            // In real implementation, load from database
            this.achievements = [];
        }
    }

    async submitQuizAnswer(courseId, questionId, answer) {
        // Mock quiz functionality
        const score = Math.floor(Math.random() * 100) + 1; // Random score for demo
        
        const progress = this.userProgress[courseId];
        if (progress) {
            progress.quiz_scores = progress.quiz_scores || {};
            progress.quiz_scores[questionId] = score;
            
            const userData = StorageUtils.getLocal('currentUser');
            if (userData.isDemo) {
                StorageUtils.setLocal(`training_progress_${userData.id}`, this.userProgress);
            }
        }
        
        showNotification(`Quiz submitted! Score: ${score}%`, score >= 80 ? 'success' : 'warning');
        return score;
    }

    openLessonPlayer(courseId, lessonId) {
        const course = this.courses[courseId];
        const lesson = course.lessons.find(l => l.id === lessonId);
        
        if (!lesson) {
            showNotification('Lesson not found', 'error');
            return;
        }

        // Update modal title
        document.getElementById('videoTitle').textContent = `${course.title} - ${lesson.title}`;
        
        // Show video player modal
        document.getElementById('videoPlayerModal').style.display = 'flex';
        
        // In real implementation, load actual video content
        this.currentLesson = { courseId, lessonId };
    }

    async getNextLessonInCourse(courseId, currentLessonId) {
        const course = this.courses[courseId];
        const currentIndex = course.lessons.findIndex(l => l.id === currentLessonId);
        
        if (currentIndex < course.lessons.length - 1) {
            return course.lessons[currentIndex + 1];
        }
        
        return null; // No more lessons
    }

    async getPreviousLessonInCourse(courseId, currentLessonId) {
        const course = this.courses[courseId];
        const currentIndex = course.lessons.findIndex(l => l.id === currentLessonId);
        
        if (currentIndex > 0) {
            return course.lessons[currentIndex - 1];
        }
        
        return null; // No previous lesson
    }

    updateProgressDisplay() {
        // Update overall progress
        const totalCourses = Object.keys(this.courses).length;
        const completedCourses = Object.values(this.userProgress)
            .filter(progress => progress.status === 'completed').length;
        const inProgressCourses = Object.values(this.userProgress)
            .filter(progress => progress.status === 'in_progress').length;
        const pendingCourses = totalCourses - completedCourses - inProgressCourses;

        const overallProgress = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

        // Update UI elements
        this.updateProgressCircle(overallProgress);
        this.updateProgressStats(completedCourses, inProgressCourses, pendingCourses);
        this.updateCurrentCourse();
    }

    updateProgressCircle(percentage) {
        const circle = document.querySelector('.progress-circle-large circle:last-child');
        if (circle) {
            const circumference = 2 * Math.PI * 40; // radius = 40
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }

        const valueElement = document.querySelector('.progress-value');
        if (valueElement) {
            valueElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    updateProgressStats(completed, inProgress, pending) {
        const statsElements = document.querySelectorAll('.progress-stats .stat-number');
        if (statsElements.length >= 3) {
            statsElements[0].textContent = completed;
            statsElements[1].textContent = inProgress;
            statsElements[2].textContent = pending;
        }
    }

    updateCurrentCourse() {
        // Find a course in progress
        const inProgressCourse = Object.entries(this.userProgress)
            .find(([courseId, progress]) => progress.status === 'in_progress');

        if (inProgressCourse) {
            const [courseId, progress] = inProgressCourse;
            const course = this.courses[courseId];
            
            // Update current course display
            const currentCourseSection = document.querySelector('.current-course');
            if (currentCourseSection) {
                const title = currentCourseSection.querySelector('h4');
                const description = currentCourseSection.querySelector('p');
                const progressBar = currentCourseSection.querySelector('.progress-fill');
                const progressText = currentCourseSection.querySelector('.progress-text');
                
                if (title) title.textContent = course.title;
                if (description) description.textContent = course.description;
                if (progressBar) progressBar.style.width = `${progress.completion_percentage}%`;
                if (progressText) progressText.textContent = `${Math.round(progress.completion_percentage)}% Complete`;
            }
        }
    }

    // Course recommendation system
    getRecommendedCourses(limit = 3) {
        const completedCourseIds = Object.entries(this.userProgress)
            .filter(([_, progress]) => progress.status === 'completed')
            .map(([courseId, _]) => courseId);

        const availableCourses = Object.values(this.courses)
            .filter(course => !completedCourseIds.includes(course.id))
            .filter(course => this.checkPrerequisites(course.prerequisites));

        return availableCourses
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
    }

    // Export progress report
    async exportProgressReport() {
        const userData = StorageUtils.getLocal('currentUser');
        const progressData = Object.values(this.userProgress);
        
        const report = {
            employee: userData.name,
            date: new Date().toISOString(),
            summary: {
                totalCourses: progressData.length,
                completedCourses: progressData.filter(p => p.status === 'completed').length,
                inProgressCourses: progressData.filter(p => p.status === 'in_progress').length,
                totalHours: progressData.reduce((sum, p) => {
                    const course = this.courses[p.course_id];
                    return course ? sum + this.parseDuration(course.duration) : sum;
                }, 0)
            },
            courses: progressData.map(progress => ({
                title: progress.course_title,
                status: progress.status,
                completion: `${progress.completion_percentage}%`,
                enrollmentDate: DateTimeUtils.formatDate(progress.enrollment_date),
                completionDate: progress.completion_date ? DateTimeUtils.formatDate(progress.completion_date) : 'N/A'
            })),
            achievements: this.achievements,
            certificates: this.certificates
        };

        const csvContent = this.generateProgressCSV(report);
        downloadFile(csvContent, `training_progress_${userData.name.replace(' ', '_')}.csv`, 'text/csv');
        
        showNotification('Progress report exported successfully!', 'success');
    }

    generateProgressCSV(report) {
        let csv = 'Course Title,Status,Completion %,Enrollment Date,Completion Date\n';
        
        report.courses.forEach(course => {
            csv += `"${course.title}","${course.status}","${course.completion}","${course.enrollmentDate}","${course.completionDate}"\n`;
        });
        
        return csv;
    }

    parseDuration(durationStr) {
        // Parse duration string like "4h 30m" to minutes
        const hours = (durationStr.match(/(\d+)h/) || [0, 0])[1];
        const minutes = (durationStr.match(/(\d+)m/) || [0, 0])[1];
        return parseInt(hours) * 60 + parseInt(minutes);
    }
}

// Global training manager instance
let trainingManager;

// Initialize training manager
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('training.html') || 
        document.querySelector('.training-progress, .course-card')) {
        trainingManager = new TrainingManager();
    }
});

// Global functions for training
window.startCourse = function(courseId) {
    if (trainingManager) {
        trainingManager.startCourse(courseId);
    }
};

window.continueCourse = function(courseId) {
    if (trainingManager) {
        trainingManager.startCourse(courseId);
    }
};

window.markVideoComplete = function() {
    if (trainingManager && trainingManager.currentLesson) {
        const { courseId, lessonId } = trainingManager.currentLesson;
        trainingManager.markLessonComplete(courseId, lessonId);
    }
};

window.nextVideo = function() {
    if (trainingManager && trainingManager.currentLesson) {
        const { courseId, lessonId } = trainingManager.currentLesson;
        trainingManager.getNextLessonInCourse(courseId, lessonId).then(nextLesson => {
            if (nextLesson) {
                trainingManager.openLessonPlayer(courseId, nextLesson.id);
            } else {
                showNotification('Course completed!', 'success');
            }
        });
    }
};

window.previousVideo = function() {
    if (trainingManager && trainingManager.currentLesson) {
        const { courseId, lessonId } = trainingManager.currentLesson;
        trainingManager.getPreviousLessonInCourse(courseId, lessonId).then(prevLesson => {
            if (prevLesson) {
                trainingManager.openLessonPlayer(courseId, prevLesson.id);
            } else {
                showNotification('This is the first lesson', 'info');
            }
        });
    }
};

console.log('Training module loaded successfully');
