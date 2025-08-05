// LMS Dashboard Main Script
class LMSDashboard {
    constructor() {
        this.questions = [];
        this.subscription = null;
        this.lastUpdateTime = null;
        this.isConnected = false;
        this.copyTimeout = null;

        this.init();
    }

    async init() {
        console.log('🚀 Initializing LMS Dashboard...');

        // Initialize Supabase
        const supabaseInitialized = await window.SupabaseConfig.initSupabase();
        if (!supabaseInitialized) {
            this.showError('Failed to initialize Supabase');
            return;
        }

        // Test connection
        this.isConnected = await window.SupabaseConfig.testConnection();
        this.updateConnectionStatus();

        if (this.isConnected) {
            // Load initial data
            await this.loadQuestions();

            // Setup real-time subscription
            this.setupRealtimeSubscription();

            // Setup auto-refresh
            this.setupAutoRefresh();

            // Setup clear all functionality
            this.setupClearAllFunctionality();
        } else {
            this.showError('Cannot connect to Supabase');
        }
    }

    async loadQuestions() {
        try {
            this.showLoading(true);

            const questions = await window.SupabaseConfig.getQuestions();
            this.questions = questions;

            this.updateQuestionCount();
            this.renderQuestions();
            this.updateLastUpdated();

            this.showLoading(false);

            console.log('📦 Loaded questions:', questions.length);
        } catch (error) {
            console.error('❌ Error loading questions:', error);
            this.showError('Failed to load questions');
        }
    }

    setupRealtimeSubscription() {
        try {
            this.subscription = window.SupabaseConfig.subscribeToQuestions((newQuestion) => {
                this.handleNewQuestion(newQuestion);
            });

            console.log('📡 Real-time subscription setup complete');
        } catch (error) {
            console.error('❌ Error setting up real-time subscription:', error);
        }
    }

    handleNewQuestion(newQuestion) {
        console.log('🆕 New question received:', newQuestion);

        // Add to beginning of array
        this.questions.unshift(newQuestion);

        // Update UI
        this.updateQuestionCount();
        this.renderQuestions();
        this.updateLastUpdated();

        // Show notification
        this.showNotification('New question received!');

        // Play sound
        this.playNotificationSound();

        // Add new indicator to the first card
        this.highlightNewQuestion(newQuestion.id);
    }

    highlightNewQuestion(questionId) {
        const questionCard = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionCard) {
            questionCard.classList.add('new');

            // Remove highlight after 5 seconds
            setTimeout(() => {
                questionCard.classList.remove('new');
            }, 5000);
        }
    }

    renderQuestions() {
        const questionsList = document.getElementById('questionsList');
        const emptyState = document.getElementById('emptyState');

        if (this.questions.length === 0) {
            questionsList.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        questionsList.style.display = 'flex';
        emptyState.style.display = 'none';

        questionsList.innerHTML = this.questions.map(question =>
            this.createQuestionCard(question)
        ).join('');

        // Setup copy functionality for all question cards
        this.setupCopyFunctionality();
    }

    createQuestionCard(question) {
        const timeAgo = this.getTimeAgo(question.created_at);
        const questionType = this.getQuestionTypeLabel(question.type);
        const answersHtml = this.renderAnswers(question);

        return `
            <div class="question-card" data-question-id="${question.id}" data-question-data='${JSON.stringify(question)}'>
                <div class="question-header">
                    <div class="question-id">📝 Question #${question.id}</div>
                    <div class="question-type">${questionType}</div>
                    <div class="question-time">${timeAgo}</div>
                </div>
                
                <div class="question-content">
                    <div class="question-text">${this.escapeHtml(question.main_question)}</div>
                    ${answersHtml}
                </div>
                
                <div class="question-meta">
                    <a href="${question.page_url || '#'}" class="question-url" target="_blank">
                        ${this.escapeHtml(question.page_url || 'No URL')}
                    </a>
                    <span>User Agent: ${this.escapeHtml(question.user_agent || 'Unknown')}</span>
                </div>
                
                <div class="copy-indicator" style="display: none;">
                    📋 Copied to clipboard!
                </div>
            </div>
        `;
    }

    setupCopyFunctionality() {
        const questionCards = document.querySelectorAll('.question-card');

        questionCards.forEach(card => {
            let touchStartTime = 0;
            let touchStartY = 0;

            // Handle both click and touch events for better mobile support
            const handleCopy = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyQuestionContent(card);
            };

            // Click event for desktop
            card.addEventListener('click', handleCopy);

            // Touch events for mobile
            card.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
                touchStartY = e.touches[0].clientY;
                card.style.transform = 'scale(0.98)';
            });

            card.addEventListener('touchend', (e) => {
                const touchEndTime = Date.now();
                const touchEndY = e.changedTouches[0].clientY;
                const touchDuration = touchEndTime - touchStartTime;
                const touchDistance = Math.abs(touchEndY - touchStartY);

                // Only trigger copy if it's a quick tap (not a scroll)
                if (touchDuration < 300 && touchDistance < 10) {
                    handleCopy(e);
                }

                card.style.transform = '';
            });

            // Mouse events for desktop feedback
            card.addEventListener('mousedown', () => {
                card.style.transform = 'scale(0.98)';
            });

            card.addEventListener('mouseup', () => {
                card.style.transform = 'translateY(-2px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });

            // Prevent default behavior for links inside cards
            const links = card.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
        });
    }

    copyQuestionContent(card) {
        try {
            const questionData = JSON.parse(card.dataset.questionData);
            const copyText = this.formatQuestionForCopy(questionData);

            // Show copy indicator immediately for better UX
            const indicator = card.querySelector('.copy-indicator');
            if (indicator) {
                indicator.style.display = 'block';
            }

            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(copyText).then(() => {
                    console.log('📋 Copied question content to clipboard');
                    this.showNotification('📋 Copied to clipboard!');
                }).catch(err => {
                    console.error('❌ Failed to copy with clipboard API:', err);
                    // Fallback to old method
                    this.fallbackCopyTextToClipboard(copyText);
                });
            } else {
                // Fallback for older browsers
                this.fallbackCopyTextToClipboard(copyText);
            }

            // Hide indicator after 2 seconds
            setTimeout(() => {
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error copying question:', error);
            this.showNotification('❌ Failed to copy question');
        }
    }

    fallbackCopyTextToClipboard(text) {
        try {
            // Create temporary textarea element
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                console.log('📋 Copied question content to clipboard (fallback)');
                this.showNotification('📋 Copied to clipboard!');
            } else {
                console.error('❌ Failed to copy with fallback method');
                this.showNotification('❌ Failed to copy to clipboard');
            }
        } catch (err) {
            console.error('❌ Error in fallback copy:', err);
            this.showNotification('❌ Failed to copy to clipboard');
        }
    }

    formatQuestionForCopy(question) {
        let text = `Question #${question.id}\n\n`;
        text += `Question: ${question.main_question}\n\n`;

        if (question.answers && Array.isArray(question.answers)) {
            text += `Answers:\n`;
            question.answers.forEach((answer, index) => {
                const isSelected = answer.startsWith('*');
                const cleanAnswer = answer.replace('*', '');
                text += `${index + 1}. ${cleanAnswer}${isSelected ? ' (Selected)' : ''}\n`;
            });
        } else if (question.groupradio && Array.isArray(question.groupradio)) {
            text += `Group Radio Questions:\n`;
            question.groupradio.forEach((group, groupIndex) => {
                text += `\n${groupIndex + 1}. ${group.question}\n`;
                group.answers.forEach((answer, answerIndex) => {
                    const isSelected = answer.startsWith('*');
                    const cleanAnswer = answer.replace('*', '');
                    text += `   ${answerIndex + 1}. ${cleanAnswer}${isSelected ? ' (Selected)' : ''}\n`;
                });
            });
        } else if ((question.dragdropV2 && Array.isArray(question.dragdropV2)) || (question.dragdropv2 && Array.isArray(question.dragdropv2))) {
            const dragdropV2Data = question.dragdropV2 || question.dragdropv2;
            const dragdropV2Dict = question.dragdropV2_dictionary || question.dragdropv2_dictionary;

            text += `Drag & Drop V2:\n`;
            dragdropV2Data.forEach((drop, index) => {
                text += `\n${index + 1}. ${drop.question}\n`;
                text += `   Answers: ${drop.answers.join(', ')}\n`;
            });
            if (dragdropV2Dict) {
                text += `\nDictionary: ${dragdropV2Dict.join(', ')}\n`;
            }
        } else if (question.dragdrop && Array.isArray(question.dragdrop)) {
            text += `Drag & Drop:\n`;
            question.dragdrop.forEach((drop, index) => {
                text += `\n${index + 1}. ${drop.question}\n`;
                text += `   Answers: ${drop.answers.join(', ')}\n`;
            });
            if (question.dragdrop_dictionary) {
                text += `\nDictionary: ${question.dragdrop_dictionary.join(', ')}\n`;
            }
        }

        return text;
    }

    renderAnswers(question) {
        let answersHtml = '';

        if (question.answers && Array.isArray(question.answers)) {
            answersHtml = `
                <div class="question-answers">
                    <div class="answers-title">Answers:</div>
                    ${question.answers.map(answer => `
                        <div class="answer-item ${answer.startsWith('*') ? 'selected' : ''}">
                            ${this.escapeHtml(answer.replace('*', ''))}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (question.groupradio && Array.isArray(question.groupradio)) {
            answersHtml = `
                <div class="question-answers">
                    <div class="answers-title">Group Radio Questions:</div>
                    ${question.groupradio.map(group => `
                        <div class="answer-item">
                            <strong>${this.escapeHtml(group.question)}</strong><br>
                            ${group.answers.map(answer => `
                                <span class="${answer.startsWith('*') ? 'selected' : ''}">
                                    ${this.escapeHtml(answer.replace('*', ''))}
                                </span>
                            `).join(', ')}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if ((question.dragdropV2 && Array.isArray(question.dragdropV2)) || (question.dragdropv2 && Array.isArray(question.dragdropv2))) {
            const dragdropV2Data = question.dragdropV2 || question.dragdropv2;
            const dragdropV2Dict = question.dragdropV2_dictionary || question.dragdropv2_dictionary;

            answersHtml = `
                <div class="question-answers">
                    <div class="answers-title">Drag & Drop V2:</div>
                    ${dragdropV2Data.map(drop => `
                        <div class="answer-item">
                            <strong>${this.escapeHtml(drop.question)}</strong><br>
                            Answers: ${drop.answers.map(answer => this.escapeHtml(answer)).join(', ')}
                        </div>
                    `).join('')}
                    <div class="answer-item">
                        <strong>Dictionary:</strong> ${dragdropV2Dict ?
                    dragdropV2Dict.map(item => this.escapeHtml(item)).join(', ') :
                    'No dictionary'
                }
                    </div>
                </div>
            `;
        } else if (question.dragdrop && Array.isArray(question.dragdrop)) {
            answersHtml = `
                <div class="question-answers">
                    <div class="answers-title">Drag & Drop:</div>
                    ${question.dragdrop.map(drop => `
                        <div class="answer-item">
                            <strong>${this.escapeHtml(drop.question)}</strong><br>
                            Answers: ${drop.answers.map(answer => this.escapeHtml(answer)).join(', ')}
                        </div>
                    `).join('')}
                    <div class="answer-item">
                        <strong>Dictionary:</strong> ${question.dragdrop_dictionary ?
                    question.dragdrop_dictionary.map(item => this.escapeHtml(item)).join(', ') :
                    'No dictionary'
                }
                    </div>
                </div>
            `;
        }

        return answersHtml;
    }

    getQuestionTypeLabel(type) {
        const labels = {
            'radio': 'RADIO',
            'checkbox': 'CHECKBOX',
            'dragdrop': 'DRAGDROP',
            'dragdropV2': 'DRAGDROP V2',
            'groupradio': 'GROUP RADIO',
            'group_input': 'GROUP INPUT',
            'test': 'TEST'
        };

        return labels[type] || type.toUpperCase();
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    updateQuestionCount() {
        const totalQuestions = document.getElementById('totalQuestions');
        totalQuestions.textContent = this.questions.length;
    }

    updateConnectionStatus() {
        const realtimeStatus = document.getElementById('realtimeStatus');

        if (this.isConnected) {
            realtimeStatus.textContent = '✅ CONNECTED';
            realtimeStatus.className = 'stat-value status-connected';
        } else {
            realtimeStatus.textContent = '❌ DISCONNECTED';
            realtimeStatus.className = 'stat-value status-error';
        }
    }

    updateLastUpdated() {
        const lastUpdated = document.getElementById('lastUpdated');
        this.lastUpdateTime = new Date();
        lastUpdated.textContent = this.lastUpdateTime.toLocaleTimeString();
    }

    setupAutoRefresh() {
        // Refresh every 30 seconds as backup
        setInterval(async () => {
            if (this.isConnected) {
                await this.loadQuestions();
            }
        }, 30000);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const questionsList = document.getElementById('questionsList');
        const emptyState = document.getElementById('emptyState');

        if (show) {
            loading.style.display = 'flex';
            questionsList.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        console.error('❌ Error:', message);
        const realtimeStatus = document.getElementById('realtimeStatus');
        realtimeStatus.textContent = '❌ ERROR';
        realtimeStatus.className = 'stat-value status-error';
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    playNotificationSound() {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.play().catch(error => {
                console.log('🔇 Could not play notification sound:', error);
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupClearAllFunctionality() {
        const clearAllBtn = document.getElementById('clearAllBtn');
        const confirmModal = document.getElementById('confirmModal');
        const confirmClearBtn = document.getElementById('confirmClearBtn');
        const cancelClearBtn = document.getElementById('cancelClearBtn');

        // Show modal when clear all button is clicked
        clearAllBtn.addEventListener('click', () => {
            confirmModal.style.display = 'flex';
        });

        // Confirm clear all
        confirmClearBtn.addEventListener('click', async () => {
            await this.clearAllQuestions();
            confirmModal.style.display = 'none';
        });

        // Cancel clear all
        cancelClearBtn.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });

        // Close modal when clicking outside
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.style.display = 'none';
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && confirmModal.style.display === 'flex') {
                confirmModal.style.display = 'none';
            }
        });
    }

    async clearAllQuestions() {
        try {
            console.log('🗑️ Clearing all questions...');

            // Show loading state
            this.showNotification('🗑️ Clearing all questions...');

            // Delete all questions from Supabase
            const { error } = await supabase
                .from(SUPABASE_CONFIG.TABLE_NAME)
                .delete()
                .neq('id', 0); // Delete all records

            if (error) {
                console.error('❌ Error clearing questions:', error);
                this.showNotification('❌ Failed to clear questions: ' + error.message);
                return;
            }

            // Clear local questions array
            this.questions = [];

            // Update UI
            this.updateQuestionCount();
            this.renderQuestions();
            this.updateLastUpdated();

            // Show success notification
            this.showNotification('✅ All questions cleared successfully!');

            console.log('✅ All questions cleared successfully');

        } catch (error) {
            console.error('❌ Error in clearAllQuestions:', error);
            this.showNotification('❌ Failed to clear questions: ' + error.message);
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 LMS Dashboard starting...');
    window.lmsDashboard = new LMSDashboard();
});

// Add CSS animation for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style); 