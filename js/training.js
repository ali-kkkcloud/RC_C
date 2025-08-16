// File Name: js/training.js
// Training Management System - FIXED VERSION

class TrainingManager {
    constructor() {
        this.currentCourse = null;
        this.currentLesson = null;
        this.userProgress = {};
        this.achievements = [];
        this.certificates = [];
        this.courses = {};
        this.isLoading = false;
        
        this.initializeTraining();
    }

    async initializeTraining() {
        try {
            this.isLoading = true;
            await this.loadCourses();
            await this.loadUserProgress();
            await this.loadAchievements();
            this.updateProgressDisplay();
            this.setupEventListeners();
        } catch (error) {
            console.error('Training initialization error:', error);
            showNotification('Failed to initialize training system', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    setupEventListeners() {
        try {
            // Course filter buttons
            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                btn.removeEventListener('click', this.handleFilterBound);
                this.handleFilterBound = this.handleFilter.bind(this);
                btn.addEventListener('click', this.handleFilterBound);
            });

            // Course action buttons - use event delegation
            document.removeEventListener('click', this.handleCourseActionBound);
            this.handleCourseActionBound = this.handleCourseAction.bind(this);
            document.addEventListener('click', this.handleCourseActionBound);

            // Video player controls
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer) {
                videoPlayer.removeEventListener('ended', this.handleVideoEndedBound);
                this.handleVideoEndedBound = this.handleVideoEnded.bind(this);
                videoPlayer.addEventListener('ended', this.handleVideoEndedBound);
            }

            // Quiz form submissions
            document.removeEventListener('submit', this.handleQuizSubmitBound);
            this.handleQuizSubmitBound = this.handleQuizSubmit.bind(this);
            document.addEventListener('submit', this.handleQuizSubmitBound);

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    handleFilter(event) {
        try {
            const category = event.target.dataset.category || 'all';
            this.filterCourses(category);
            
            // Update active button
            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        } catch (error) {
            console.error('Filter error:', error);
        }
    }

    handleCourseAction(event) {
        const target = event.target.closest('[data-course-action]');
        if (!target) return;

        event.preventDefault();
        const action = target.dataset.courseAction;
        const courseId = target.dataset.courseId;
        const lessonId = target.dataset.lessonId;

        switch (action) {
            case 'start':
                this.startCourse(courseId);
                break;
            case 'continue':
                this.continueCourse(courseId);
                break;
            case 'view-details':
                this.viewCourseDetails(courseId);
                break;
            case 'start-lesson':
                this.startLesson(courseId, lessonId);
                break;
            case 'download-certificate':
                this.downloadCertificate(courseId);
                break;
            default:
                console.warn('Unknown course action:', action);
        }
    }

    handleVideoEnded(event) {
        try {
            if (this.currentCourse && this.currentLesson) {
                this.markLessonCompleted(this.currentCourse, this.currentLesson.id);
            }
        } catch (error) {
            console.error('Video ended handler error:', error);
        }
    }

    handleQuizSubmit(event) {
        if (!event.target.matches('.quiz-form')) return;
        
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const courseId = formData.get('courseId');
            const questionId = formData.get('questionId');
            const answer = formData.get('answer');
            
            if (courseId && questionId && answer) {
                this.submitQuizAnswer(courseId, questionId, answer);
            }
        } catch (error) {
            console.error('Quiz submit error:', error);
        }
    }

    async loadCourses() {
        try {
            // In a real implementation, this would load from database
            // For now, using mock data with proper error handling
            this.courses = await this.getMockCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
            this.courses = {};
        }
    }

    async getMockCourses() {
        return {
            'js-fundamentals': {
                id: 'js-fundamentals',
                title: 'JavaScript Fundamentals',
                description: 'Learn the core concepts of JavaScript programming language',
                category: 'programming',
                level: 'beginner',
                duration: '4h 30m',
                rating: 4.8,
                thumbnail: 'fas fa-laptop-code',
                lessons: [
                    { 
                        id: 'js-1', 
                        title: 'Introduction to JavaScript', 
                        duration: '15 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/video1.mp4'
                    },
                    { 
                        id: 'js-2', 
                        title: 'Variables and Data Types', 
                        duration: '25 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/video2.mp4'
                    },
                    { 
                        id: 'js-3', 
                        title: 'Functions and Scope', 
                        duration: '30 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/video3.mp4'
                    },
                    { 
                        id: 'js-4', 
                        title: 'Objects and Arrays', 
                        duration: '35 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/video4.mp4'
                    },
                    { 
                        id: 'js-5', 
                        title: 'DOM Manipulation', 
                        duration: '40 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/video5.mp4'
                    },
                    { 
                        id: 'js-quiz', 
                        title: 'JavaScript Basics Quiz', 
                        duration: '15 min', 
                        type: 'quiz',
                        questions: [
                            {
                                id: 'q1',
                                question: 'What is a variable in JavaScript?',
                                options: ['A container for data', 'A function', 'An object', 'A method'],
                                correct: 0
                            },
                            {
                                id: 'q2',
                                question: 'Which keyword is used to declare a variable?',
                                options: ['var', 'let', 'const', 'All of the above'],
                                correct: 3
                            }
                        ]
                    }
                ],
                prerequisites: []
            },
            'react-basics': {
                id: 'react-basics',
                title: 'React Basics',
                description: 'Introduction to React library for building user interfaces',
                category: 'programming',
                level: 'intermediate',
                duration: '6h 15m',
                rating: 4.9,
                thumbnail: 'fab fa-react',
                lessons: [
                    { 
                        id: 'react-1', 
                        title: 'What is React?', 
                        duration: '20 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/react1.mp4'
                    },
                    { 
                        id: 'react-2', 
                        title: 'Components and JSX', 
                        duration: '30 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/react2.mp4'
                    },
                    { 
                        id: 'react-3', 
                        title: 'Props and State', 
                        duration: '35 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/react3.mp4'
                    },
                    { 
                        id: 'react-project', 
                        title: 'Build a Todo App', 
                        duration: '90 min', 
                        type: 'project',
                        description: 'Create a fully functional todo application'
                    }
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
                    { 
                        id: 'ux-1', 
                        title: 'Introduction to UX', 
                        duration: '20 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/ux1.mp4'
                    },
                    { 
                        id: 'ux-2', 
                        title: 'User Research', 
                        duration: '25 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/ux2.mp4'
                    },
                    { 
                        id: 'ux-3', 
                        title: 'Wireframing', 
                        duration: '30 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/ux3.mp4'
                    },
                    { 
                        id: 'ux-4', 
                        title: 'Prototyping', 
                        duration: '35 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/ux4.mp4'
                    },
                    { 
                        id: 'ux-5', 
                        title: 'Design Systems', 
                        duration: '40 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/ux5.mp4'
                    },
                    { 
                        id: 'ux-project', 
                        title: 'Design a Mobile App', 
                        duration: '45 min', 
                        type: 'project',
                        description: 'Design a complete mobile app interface'
                    }
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
                    { 
                        id: 'pm-1', 
                        title: 'Introduction to Project Management', 
                        duration: '20 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/pm1.mp4'
                    },
                    { 
                        id: 'pm-2', 
                        title: 'Project Planning', 
                        duration: '30 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/pm2.mp4'
                    },
                    { 
                        id: 'pm-3', 
                        title: 'Risk Management', 
                        duration: '25 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/pm3.mp4'
                    },
                    { 
                        id: 'pm-4', 
                        title: 'Team Leadership', 
                        duration: '35 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/pm4.mp4'
                    },
                    { 
                        id: 'pm-quiz', 
                        title: 'Assessment', 
                        duration: '10 min', 
                        type: 'quiz',
                        questions: [
                            {
                                id: 'pm-q1',
                                question: 'What is the first phase of project management?',
                                options: ['Planning', 'Initiation', 'Execution', 'Closure'],
                                correct: 1
                            }
                        ]
                    }
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
                    { 
                        id: 'comm-1', 
                        title: 'Effective Communication', 
                        duration: '25 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/comm1.mp4'
                    },
                    { 
                        id: 'comm-2', 
                        title: 'Presentation Skills', 
                        duration: '30 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/comm2.mp4'
                    },
                    { 
                        id: 'comm-3', 
                        title: 'Active Listening', 
                        duration: '20 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/comm3.mp4'
                    },
                    { 
                        id: 'comm-4', 
                        title: 'Email Etiquette', 
                        duration: '15 min', 
                        type: 'video',
                        videoUrl: 'https://example.com/comm4.mp4'
                    }
                ],
                prerequisites: []
            }
        };
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
                if (!window.supabase) {
                    console.warn('Database not available');
                    return;
                }

                const { data, error } = await window.supabase
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

    async saveProgress(courseId, progressData) {
        const userData = StorageUtils.getLocal('currentUser');
        if (!userData) return false;

        try {
            // Update local progress
            if (!this.userProgress[courseId]) {
                this.userProgress[courseId] = {
                    course_id: courseId,
                    employee_id: userData.id,
                    status: 'not_started',
                    progress_percentage: 0,
                    completed_lessons: [],
                    quiz_scores: {},
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }

            // Merge new progress data
            Object.assign(this.userProgress[courseId], progressData, {
                updated_at: new Date().toISOString()
            });

            if (userData.isDemo) {
                // Demo account - save to localStorage
                StorageUtils.setLocal(`training_progress_${userData.id}`, this.userProgress);
            } else {
                // Real account - save to database
                if (!window.supabase) {
                    throw new Error('Database not available');
                }

                const { error } = await window.supabase
                    .from(TABLES.TRAINING_PROGRESS)
                    .upsert([this.userProgress[courseId]], {
                        onConflict: 'employee_id,course_id'
                    });

                if (error) throw error;
            }

            this.updateProgressDisplay();
            return true;

        } catch (error) {
            console.error('Error saving progress:', error);
            return false;
        }
    }

    startCourse(courseId) {
        try {
            const course = this.courses[courseId];
            if (!course) {
                showNotification('Course not found', 'error');
                return;
            }

            // Check prerequisites
            if (course.prerequisites && course.prerequisites.length > 0) {
                const unmetPrereqs = course.prerequisites.filter(prereq => {
                    const prereqProgress = this.userProgress[prereq];
                    return !prereqProgress || prereqProgress.status !== 'completed';
                });

                if (unmetPrereqs.length > 0) {
                    showNotification('Please complete prerequisite courses first', 'warning');
                    return;
                }
            }

            this.currentCourse = courseId;
            
            // Mark as started and save progress
            this.saveProgress(courseId, {
                status: 'in_progress',
                started_at: new Date().toISOString()
            });

            // Start first lesson
            if (course.lessons && course.lessons.length > 0) {
                this.startLesson(courseId, course.lessons[0].id);
            }

            showNotification(`Started course: ${course.title}`, 'success');

        } catch (error) {
            console.error('Start course error:', error);
            showNotification('Failed to start course', 'error');
        }
    }

    continueCourse(courseId) {
        try {
            const course = this.courses[courseId];
            const progress = this.userProgress[courseId];
            
            if (!course) {
                showNotification('Course not found', 'error');
                return;
            }

            this.currentCourse = courseId;

            // Find next uncompleted lesson
            let nextLesson = null;
            if (progress && progress.completed_lessons) {
                nextLesson = course.lessons.find(lesson => 
                    !progress.completed_lessons.includes(lesson.id)
                );
            }

            if (!nextLesson && course.lessons.length > 0) {
                nextLesson = course.lessons[0];
            }

            if (nextLesson) {
                this.startLesson(courseId, nextLesson.id);
            } else {
                showNotification('Course is already completed!', 'info');
            }

        } catch (error) {
            console.error('Continue course error:', error);
            showNotification('Failed to continue course', 'error');
        }
    }

    startLesson(courseId, lessonId) {
        try {
            const course = this.courses[courseId];
            const lesson = course?.lessons?.find(l => l.id === lessonId);
            
            if (!lesson) {
                showNotification('Lesson not found', 'error');
                return;
            }

            this.currentCourse = courseId;
            this.currentLesson = lesson;

            if (lesson.type === 'video') {
                this.openVideoPlayer(courseId, lessonId);
            } else if (lesson.type === 'quiz') {
                this.openQuiz(courseId, lessonId);
            } else if (lesson.type === 'project') {
                this.openProject(courseId, lessonId);
            }

        } catch (error) {
            console.error('Start lesson error:', error);
            showNotification('Failed to start lesson', 'error');
        }
    }

    openVideoPlayer(courseId, lessonId) {
        try {
            const course = this.courses[courseId];
            const lesson = course.lessons.find(l => l.id === lessonId);
            
            if (!lesson) {
                showNotification('Lesson not found', 'error');
                return;
            }

            // Update modal content
            const modalTitle = document.getElementById('videoTitle');
            const videoPlayer = document.getElementById('videoPlayer');
            const modal = document.getElementById('videoPlayerModal');

            if (modalTitle) {
                modalTitle.textContent = `${course.title} - ${lesson.title}`;
            }

            if (videoPlayer) {
                // In a real implementation, you would set the video source
                videoPlayer.innerHTML = `
                    <div class="video-placeholder">
                        <i class="fas fa-play-circle"></i>
                        <h4>${StringUtils.escapeHtml(lesson.title)}</h4>
                        <p>Duration: ${lesson.duration}</p>
                        <button class="btn btn-primary" onclick="trainingManager.markLessonCompleted('${courseId}', '${lessonId}')">
                            Mark as Completed
                        </button>
                    </div>
                `;
            }

            if (modal) {
                modal.style.display = 'flex';
            }

        } catch (error) {
            console.error('Video player error:', error);
            showNotification('Failed to open video player', 'error');
        }
    }

    openQuiz(courseId, lessonId) {
        try {
            const course = this.courses[courseId];
            const lesson = course.lessons.find(l => l.id === lessonId);
            
            if (!lesson || !lesson.questions) {
                showNotification('Quiz not found', 'error');
                return;
            }

            const quizContent = `
                <div class="quiz-container">
                    <h4>${StringUtils.escapeHtml(lesson.title)}</h4>
                    <form class="quiz-form">
                        <input type="hidden" name="courseId" value="${courseId}">
                        <input type="hidden" name="lessonId" value="${lessonId}">
                        
                        ${lesson.questions.map((question, index) => `
                            <div class="quiz-question">
                                <h5>Question ${index + 1}: ${StringUtils.escapeHtml(question.question)}</h5>
                                <div class="quiz-options">
                                    ${question.options.map((option, optIndex) => `
                                        <label class="quiz-option">
                                            <input type="radio" name="q${question.id}" value="${optIndex}" required>
                                            <span>${StringUtils.escapeHtml(option)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                        
                        <div class="quiz-actions">
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Submit Quiz</button>
                        </div>
                    </form>
                </div>
            `;

            const modal = UIUtils.showModal(quizContent, 'Quiz');
            
            // Handle quiz submission
            const form = modal.querySelector('.quiz-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitQuiz(courseId, lessonId, lesson.questions, form);
            });

        } catch (error) {
            console.error('Quiz error:', error);
            showNotification('Failed to open quiz', 'error');
        }
    }

    submitQuiz(courseId, lessonId, questions, form) {
        try {
            const formData = new FormData(form);
            let correctAnswers = 0;
            let totalQuestions = questions.length;

            questions.forEach(question => {
                const userAnswer = parseInt(formData.get(`q${question.id}`));
                if (userAnswer === question.correct) {
                    correctAnswers++;
                }
            });

            const score = Math.round((correctAnswers / totalQuestions) * 100);
            
            // Save quiz score
            const progress = this.userProgress[courseId] || {};
            if (!progress.quiz_scores) progress.quiz_scores = {};
            progress.quiz_scores[lessonId] = score;

            // Mark lesson as completed if score >= 70%
            if (score >= 70) {
                this.markLessonCompleted(courseId, lessonId);
                showNotification(`Quiz completed! Score: ${score}%`, 'success');
            } else {
                showNotification(`Quiz score: ${score}%. You need 70% to pass. Please try again.`, 'warning');
            }

            // Close modal
            form.closest('.modal-overlay').remove();

        } catch (error) {
            console.error('Quiz submission error:', error);
            showNotification('Quiz submission failed', 'error');
        }
    }

    async markLessonCompleted(courseId, lessonId) {
        try {
            const course = this.courses[courseId];
            if (!course) return;

            const progress = this.userProgress[courseId] || {};
            if (!progress.completed_lessons) progress.completed_lessons = [];

            // Add lesson to completed list if not already there
            if (!progress.completed_lessons.includes(lessonId)) {
                progress.completed_lessons.push(lessonId);
            }

            // Calculate progress percentage
            const totalLessons = course.lessons.length;
            const completedLessons = progress.completed_lessons.length;
            progress.progress_percentage = Math.round((completedLessons / totalLessons) * 100);

            // Check if course is completed
            if (completedLessons === totalLessons) {
                progress.status = 'completed';
                progress.completed_at = new Date().toISOString();
                
                // Generate certificate
                await this.generateCertificate(courseId);
                
                // Check for achievements
                this.checkAchievements();
                
                showNotification(`Congratulations! You've completed ${course.title}!`, 'success');
            } else {
                progress.status = 'in_progress';
            }

            // Save progress
            await this.saveProgress(courseId, progress);

            // Close video modal if open
            const modal = document.getElementById('videoPlayerModal');
            if (modal) {
                modal.style.display = 'none';
            }

            showNotification('Lesson completed successfully!', 'success');

        } catch (error) {
            console.error('Mark lesson completed error:', error);
            showNotification('Failed to mark lesson as completed', 'error');
        }
    }

    async generateCertificate(courseId) {
        try {
            const course = this.courses[courseId];
            const userData = StorageUtils.getLocal('currentUser');
            
            if (!course || !userData) return;

            const certificate = {
                id: StringUtils.generateId('cert'),
                course_id: courseId,
                course_title: course.title,
                employee_id: userData.id,
                employee_name: userData.name,
                issued_date: new Date().toISOString(),
                certificate_url: `certificates/${userData.id}_${courseId}.pdf`
            };

            this.certificates.push(certificate);

            if (userData.isDemo) {
                StorageUtils.setLocal(`certificates_${userData.id}`, this.certificates);
            } else {
                // In real implementation, save to database
                console.log('Certificate generated:', certificate);
            }

        } catch (error) {
            console.error('Certificate generation error:', error);
        }
    }

    downloadCertificate(courseId) {
        try {
            const certificate = this.certificates.find(cert => cert.course_id === courseId);
            const userData = StorageUtils.getLocal('currentUser');
            
            if (!certificate) {
                showNotification('Certificate not found. Complete the course first.', 'warning');
                return;
            }

            // In a real implementation, this would download the actual certificate
            const certificateContent = `
                CERTIFICATE OF COMPLETION
                
                This is to certify that
                ${userData.name}
                
                has successfully completed the course
                ${certificate.course_title}
                
                Issued on: ${DateTimeUtils.formatDate(certificate.issued_date, 'long')}
                
                Certificate ID: ${certificate.id}
            `;

            downloadFile(certificateContent, `certificate_${courseId}.txt`, 'text/plain');
            showNotification('Certificate downloaded!', 'success');

        } catch (error) {
            console.error('Certificate download error:', error);
            showNotification('Failed to download certificate', 'error');
        }
    }

    checkAchievements() {
        try {
            const completedCourses = Object.values(this.userProgress)
                .filter(progress => progress.status === 'completed').length;

            const newAchievements = [];

            // First course completion
            if (completedCourses === 1 && !this.hasAchievement('first-course')) {
                newAchievements.push({
                    id: 'first-course',
                    title: 'First Steps',
                    description: 'Completed your first course',
                    icon: 'fas fa-graduation-cap',
                    earned_date: new Date().toISOString()
                });
            }

            // Multiple courses
            if (completedCourses >= 3 && !this.hasAchievement('learner')) {
                newAchievements.push({
                    id: 'learner',
                    title: 'Dedicated Learner',
                    description: 'Completed 3 or more courses',
                    icon: 'fas fa-medal',
                    earned_date: new Date().toISOString()
                });
            }

            // Add new achievements
            this.achievements.push(...newAchievements);

            // Save achievements
            this.saveAchievements();

            // Show notifications
            newAchievements.forEach(achievement => {
                showNotification(`Achievement unlocked: ${achievement.title}!`, 'success');
            });

        } catch (error) {
            console.error('Achievement check error:', error);
        }
    }

    hasAchievement(achievementId) {
        return this.achievements.some(achievement => achievement.id === achievementId);
    }

    async saveAchievements() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            
            if (userData.isDemo) {
                StorageUtils.setLocal(`achievements_${userData.id}`, this.achievements);
            } else {
                // In real implementation, save to database
                console.log('Achievements saved:', this.achievements);
            }
        } catch (error) {
            console.error('Save achievements error:', error);
        }
    }

    async loadAchievements() {
        try {
            const userData = StorageUtils.getLocal('currentUser');
            
            if (userData.isDemo) {
                this.achievements = StorageUtils.getLocal(`achievements_${userData.id}`, []);
            } else {
                // In real implementation, load from database
                this.achievements = [];
            }
        } catch (error) {
            console.error('Load achievements error:', error);
            this.achievements = [];
        }
    }

    filterCourses(category) {
        try {
            const courseCards = document.querySelectorAll('.course-card');
            
            courseCards.forEach(card => {
                const cardCategory = card.dataset.category;
                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Filter courses error:', error);
        }
    }

    viewCourseDetails(courseId) {
        try {
            const course = this.courses[courseId];
            if (!course) {
                showNotification('Course not found', 'error');
                return;
            }

            const progress = this.userProgress[courseId];
            const completedLessons = progress?.completed_lessons || [];

            const detailsContent = `
                <div class="course-details">
                    <div class="course-header">
                        <h4>${StringUtils.escapeHtml(course.title)}</h4>
                        <span class="course-rating">
                            <i class="fas fa-star"></i> ${course.rating}
                        </span>
                    </div>
                    
                    <p class="course-description">${StringUtils.escapeHtml(course.description)}</p>
                    
                    <div class="course-meta">
                        <div class="meta-item">
                            <strong>Level:</strong> ${StringUtils.capitalize(course.level)}
                        </div>
                        <div class="meta-item">
                            <strong>Duration:</strong> ${course.duration}
                        </div>
                        <div class="meta-item">
                            <strong>Category:</strong> ${StringUtils.capitalize(course.category)}
                        </div>
                    </div>

                    ${progress ? `
                        <div class="progress-section">
                            <h5>Your Progress</h5>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress.progress_percentage || 0}%"></div>
                            </div>
                            <span>${progress.progress_percentage || 0}% Complete</span>
                        </div>
                    ` : ''}
                    
                    <div class="curriculum-section">
                        <h5>Curriculum</h5>
                        <div class="lesson-list">
                            ${course.lessons.map((lesson, index) => `
                                <div class="lesson-item ${completedLessons.includes(lesson.id) ? 'completed' : ''}">
                                    <div class="lesson-icon">
                                        ${completedLessons.includes(lesson.id) ? 
                                          '<i class="fas fa-check-circle"></i>' : 
                                          '<i class="fas fa-circle"></i>'}
                                    </div>
                                    <div class="lesson-content">
                                        <h6>${StringUtils.escapeHtml(lesson.title)}</h6>
                                        <div class="lesson-meta">
                                            <span class="lesson-type">${StringUtils.capitalize(lesson.type)}</span>
                                            <span class="lesson-duration">${lesson.duration}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="course-actions">
                        ${!progress ? `
                            <button class="btn btn-primary" data-course-action="start" data-course-id="${courseId}">
                                Start Course
                            </button>
                        ` : progress.status === 'completed' ? `
                            <button class="btn btn-success" disabled>
                                <i class="fas fa-check"></i> Completed
                            </button>
                            <button class="btn btn-outline" data-course-action="download-certificate" data-course-id="${courseId}">
                                <i class="fas fa-certificate"></i> Download Certificate
                            </button>
                        ` : `
                            <button class="btn btn-primary" data-course-action="continue" data-course-id="${courseId}">
                                Continue Course
                            </button>
                        `}
                    </div>
                </div>
            `;

            UIUtils.showModal(detailsContent, 'Course Details');

        } catch (error) {
            console.error('View course details error:', error);
            showNotification('Failed to load course details', 'error');
        }
    }

    updateProgressDisplay() {
        try {
            if (this.isLoading) return;

            // Update overall progress stats
            const totalCourses = Object.keys(this.courses).length;
            const completedCourses = Object.values(this.userProgress)
                .filter(progress => progress.status === 'completed').length;
            const inProgressCourses = Object.values(this.userProgress)
                .filter(progress => progress.status === 'in_progress').length;

            // Update dashboard elements if they exist
            const elements = {
                'totalCourses': totalCourses,
                'completedCourses': completedCourses,
                'inProgressCourses': inProgressCourses,
                'certificatesEarned': this.certificates.length
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });

            // Update course cards progress
            this.updateCourseCards();

        } catch (error) {
            console.error('Progress display update error:', error);
        }
    }

    updateCourseCards() {
        try {
            const courseCards = document.querySelectorAll('.course-card');
            
            courseCards.forEach(card => {
                const courseId = card.dataset.courseId;
                if (!courseId) return;

                const progress = this.userProgress[courseId];
                const progressBar = card.querySelector('.progress-fill');
                const progressText = card.querySelector('.progress-text');
                const actionButton = card.querySelector('.course-action-btn');

                if (progressBar && progress) {
                    progressBar.style.width = `${progress.progress_percentage || 0}%`;
                }

                if (progressText && progress) {
                    progressText.textContent = `${progress.progress_percentage || 0}% Complete`;
                }

                if (actionButton) {
                    if (!progress) {
                        actionButton.textContent = 'Start Course';
                        actionButton.className = 'btn btn-primary course-action-btn';
                        actionButton.dataset.courseAction = 'start';
                    } else if (progress.status === 'completed') {
                        actionButton.textContent = 'Completed';
                        actionButton.className = 'btn btn-success course-action-btn';
                        actionButton.disabled = true;
                    } else {
                        actionButton.textContent = 'Continue';
                        actionButton.className = 'btn btn-primary course-action-btn';
                        actionButton.dataset.courseAction = 'continue';
                    }
                }
            });
        } catch (error) {
            console.error('Course cards update error:', error);
        }
    }

    // Cleanup method
    destroy() {
        try {
            // Remove event listeners
            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                if (this.handleFilterBound) {
                    btn.removeEventListener('click', this.handleFilterBound);
                }
            });

            if (this.handleCourseActionBound) {
                document.removeEventListener('click', this.handleCourseActionBound);
            }

            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer && this.handleVideoEndedBound) {
                videoPlayer.removeEventListener('ended', this.handleVideoEndedBound);
            }

            if (this.handleQuizSubmitBound) {
                document.removeEventListener('submit', this.handleQuizSubmitBound);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Initialize training manager when DOM is loaded
let trainingManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        trainingManager = new TrainingManager();
        window.trainingManager = trainingManager;
    } catch (error) {
        console.error('Training manager initialization error:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (trainingManager && typeof trainingManager.destroy === 'function') {
        trainingManager.destroy();
    }
});

console.log('Training management system loaded successfully');
