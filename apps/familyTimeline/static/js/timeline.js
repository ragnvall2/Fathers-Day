/**
 * Family Timeline JavaScript - Enhanced with Multiple Questions
 */

class FamilyTimeline {
    constructor(familyCode) {
        this.familyCode = familyCode;
        this.memories = {};
        this.themes = {};
        this.currentYear = null;
        
        this.init();
    }
    
    async init() {
        await this.loadThemes();
        await this.loadMemories();
        this.createTimeline();
        this.setupEventListeners();
    }
    
    async loadThemes() {
        try {
            const response = await fetch('/api/themes');
            const data = await response.json();
            this.themes = {};
            
            for (const theme of data.themes) {
                this.themes[theme.key] = {
                    name: theme.name,
                    questions: await this.loadThemeQuestions(theme.key)
                };
            }
        } catch (error) {
            console.error('Error loading themes:', error);
        }
    }
    
    async loadThemeQuestions(themeKey) {
        try {
            const response = await fetch(`/api/themes/${themeKey}/questions`);
            const data = await response.json();
            return data.questions;
        } catch (error) {
            console.error(`Error loading questions for theme ${themeKey}:`, error);
            return [];
        }
    }
    
    async loadMemories() {
        if (!this.familyCode) return;
        
        try {
            const response = await fetch(`/api/memories/${this.familyCode}`);
            const data = await response.json();
            
            // Organize memories by year
            this.memories = {};
            for (const memory of data.memories) {
                if (!this.memories[memory.year]) {
                    this.memories[memory.year] = [];
                }
                this.memories[memory.year].push(memory);
            }
            
            this.updateTimelineDisplay();
        } catch (error) {
            console.error('Error loading memories:', error);
        }
    }
    
    createTimeline() {
        const timelineLine = document.getElementById('timelineLine');
        if (!timelineLine) return;
        
        timelineLine.innerHTML = '';
        
        const startYear = 1930;
        const endYear = 2025;

        for (let year = startYear; year <= endYear; year++) {
            const yearNode = document.createElement('div');
            yearNode.className = 'year-node';
            yearNode.setAttribute('data-year', year);
            
            if (year % 10 === 0) {
                const label = document.createElement('div');
                label.className = 'year-label';
                label.textContent = year;
                yearNode.appendChild(label);
            }

            const memoryCount = document.createElement('div');
            memoryCount.className = 'memory-count';
            memoryCount.textContent = '0';
            yearNode.appendChild(memoryCount);

            const tooltip = document.createElement('div');
            tooltip.className = 'year-tooltip';
            tooltip.textContent = year + ' - Click to add memories';
            yearNode.appendChild(tooltip);

            timelineLine.appendChild(yearNode);
        }

        this.updateTimelineDisplay();
    }
    
    updateTimelineDisplay() {
        const yearNodes = document.querySelectorAll('.year-node');
        
        for (let i = 0; i < yearNodes.length; i++) {
            const node = yearNodes[i];
            const year = parseInt(node.getAttribute('data-year'));
            const memoryCount = this.memories[year] ? this.memories[year].length : 0;
            
            if (memoryCount > 0) {
                node.classList.add('has-memories');
            } else {
                node.classList.remove('has-memories');
            }

            const countElement = node.querySelector('.memory-count');
            if (countElement) {
                countElement.textContent = memoryCount > 0 ? memoryCount.toString() : '0';
            }

            const tooltip = node.querySelector('.year-tooltip');
            if (tooltip) {
                tooltip.textContent = year + ' - ' + memoryCount + ' memories';
            }
        }
    }
    
    setupEventListeners() {
        // Add Memory button
        const addMemoryBtn = document.getElementById('addMemoryBtn');
        if (addMemoryBtn) {
            addMemoryBtn.addEventListener('click', () => {
                this.openAddMemoryModal();
            });
        }

        // Year node clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('year-node') || e.target.closest('.year-node')) {
                const yearNode = e.target.classList.contains('year-node') ? e.target : e.target.closest('.year-node');
                const year = parseInt(yearNode.getAttribute('data-year'));
                this.openYearModal(year);
            }
        });

        // Year node hover effects
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('year-node') || e.target.closest('.year-node')) {
                const yearNode = e.target.classList.contains('year-node') ? e.target : e.target.closest('.year-node');
                const tooltip = yearNode.querySelector('.year-tooltip');
                if (tooltip) {
                    tooltip.classList.add('show');
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('year-node') || e.target.closest('.year-node')) {
                const yearNode = e.target.classList.contains('year-node') ? e.target : e.target.closest('.year-node');
                const tooltip = yearNode.querySelector('.year-tooltip');
                if (tooltip) {
                    tooltip.classList.remove('show');
                }
            }
        });

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.close');
        for (let i = 0; i < closeButtons.length; i++) {
            closeButtons[i].addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        }

        // Click outside modal to close
        const modals = document.querySelectorAll('.modal');
        for (let i = 0; i < modals.length; i++) {
            modals[i].addEventListener('click', (e) => {
                if (e.target === modals[i]) {
                    modals[i].style.display = 'none';
                }
            });
        }

        // Form submissions
        const addMemoryForm = document.getElementById('addMemoryForm');
        if (addMemoryForm) {
            addMemoryForm.addEventListener('submit', (e) => this.handleAddMemory(e));
        }
        
        const yearMemoryForm = document.getElementById('yearMemoryForm');
        if (yearMemoryForm) {
            yearMemoryForm.addEventListener('submit', (e) => this.handleYearMemory(e));
        }

        // Theme selection handlers
        const storyTheme = document.getElementById('storyTheme');
        if (storyTheme) {
            storyTheme.addEventListener('change', (e) => this.handleThemeChange(e, 'main'));
        }
        
        const yearStoryTheme = document.getElementById('yearStoryTheme');
        if (yearStoryTheme) {
            yearStoryTheme.addEventListener('change', (e) => this.handleThemeChange(e, 'year'));
        }

        // Zoom controls
        const zoomIn = document.getElementById('zoomIn');
        if (zoomIn) {
            zoomIn.addEventListener('click', () => {
                const slider = document.getElementById('zoomSlider');
                slider.value = Math.min(parseFloat(slider.value) + 0.1, 2);
                this.applyZoom(slider.value);
            });
        }

        const zoomOut = document.getElementById('zoomOut');
        if (zoomOut) {
            zoomOut.addEventListener('click', () => {
                const slider = document.getElementById('zoomSlider');
                slider.value = Math.max(parseFloat(slider.value) - 0.1, 0.5);
                this.applyZoom(slider.value);
            });
        }

        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                this.applyZoom(e.target.value);
            });
        }
    }
    
    openAddMemoryModal() {
        this.populateThemeSelect('storyTheme');
        document.getElementById('addMemoryModal').style.display = 'block';
    }
    
    openYearModal(year) {
        this.currentYear = year;
        document.getElementById('modalYearTitle').textContent = 'Memories from ' + year;
        
        this.displayYearMemories(year);
        this.populateThemeSelect('yearStoryTheme');
        
        document.getElementById('viewYearModal').style.display = 'block';
    }
    
    populateThemeSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add theme options
        for (const [key, theme] of Object.entries(this.themes)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = theme.name;
            select.appendChild(option);
        }
    }
    
    displayYearMemories(year) {
        const storiesContainer = document.getElementById('yearStories');
        if (!storiesContainer) return;
        
        storiesContainer.innerHTML = '';

        if (this.memories[year] && this.memories[year].length > 0) {
            for (let i = 0; i < this.memories[year].length; i++) {
                const memory = this.memories[year][i];
                const storyDiv = document.createElement('div');
                storyDiv.className = 'story-item';
                
                let questionsHtml = '';
                if (memory.questions_and_answers && memory.questions_and_answers.length > 0) {
                    questionsHtml = '<div class="story-questions">';
                    for (const qa of memory.questions_and_answers) {
                        questionsHtml += `
                            <div class="question-answer">
                                <div class="question">${qa.question}</div>
                                <div class="answer">${qa.answer}</div>
                            </div>
                        `;
                    }
                    questionsHtml += '</div>';
                }
                
                storyDiv.innerHTML = 
                    '<div class="story-title">' + memory.title + '</div>' +
                    '<div class="story-theme">' + memory.theme + '</div>' +
                    '<div class="story-author">' + memory.author + '</div>' +
                    '<div class="story-date">Added on ' + new Date(memory.created_at).toLocaleDateString() + '</div>' +
                    questionsHtml +
                    '<div class="story-text">' + memory.story_text + '</div>' +
                    (memory.has_photo ? '<img src="/api/photos/' + memory.id + '" class="story-photo" alt="Memory photo">' : '');
                storiesContainer.appendChild(storyDiv);
            }
        } else {
            storiesContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center; padding: 20px;">No memories yet for this year. Be the first to add one!</p>';
        }
    }
    
    handleThemeChange(e, context) {
        const theme = e.target.value;
        const questionsGroupId = context === 'main' ? 'themeQuestionsGroup' : 'yearThemeQuestionsGroup';
        const questionsContainerId = context === 'main' ? 'themeQuestions' : 'yearThemeQuestions';
        
        const questionsGroup = document.getElementById(questionsGroupId);
        const questionsContainer = document.getElementById(questionsContainerId);
        
        if (!questionsGroup || !questionsContainer) return;
        
        if (theme && this.themes[theme]) {
            questionsContainer.innerHTML = '';
            
            const questions = this.themes[theme].questions;
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-option';
                
                const fieldName = context === 'main' ? 'themeQuestions' : 'yearThemeQuestions';
                questionDiv.innerHTML = 
                    '<label>' +
                    '<input type="checkbox" name="' + fieldName + '" value="' + question.id + '" data-question="' + question.text + '">' +
                    '<span class="question-text">' + question.text + '</span>' +
                    '</label>' +
                    '<div class="answer-input" style="display: none;">' +
                    '<textarea placeholder="Your answer..." rows="3"></textarea>' +
                    '</div>';
                questionsContainer.appendChild(questionDiv);
                
                // Add event listener for checkbox
                const checkbox = questionDiv.querySelector('input[type="checkbox"]');
                const answerDiv = questionDiv.querySelector('.answer-input');
                
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        answerDiv.style.display = 'block';
                        answerDiv.querySelector('textarea').focus();
                    } else {
                        answerDiv.style.display = 'none';
                        answerDiv.querySelector('textarea').value = '';
                    }
                });
            }
            questionsGroup.style.display = 'block';
        } else {
            questionsGroup.style.display = 'none';
        }
    }
    
    async handleAddMemory(e) {
        e.preventDefault();
        
        const formData = this.collectMemoryFormData('main');
        if (!formData) return;
        
        await this.saveMemory(formData);
        
        // Clear and close form
        document.getElementById('addMemoryForm').reset();
        document.getElementById('addMemoryModal').style.display = 'none';
        document.getElementById('themeQuestionsGroup').style.display = 'none';
    }
    
    async handleYearMemory(e) {
        e.preventDefault();
        
        const formData = this.collectMemoryFormData('year');
        if (!formData) return;
        
        formData.year = this.currentYear;
        
        await this.saveMemory(formData);
        
        // Refresh the modal and clear form
        this.displayYearMemories(this.currentYear);
        document.getElementById('yearMemoryForm').reset();
        document.getElementById('yearThemeQuestionsGroup').style.display = 'none';
    }
    
    collectMemoryFormData(context) {
        const prefix = context === 'main' ? '' : 'year';
        
        const year = context === 'main' ? 
            parseInt(document.getElementById('memoryYear').value) : 
            this.currentYear;
        const title = document.getElementById(prefix + 'MemoryTitle').value;
        const author = document.getElementById(prefix + 'AuthorName').value;
        const theme = document.getElementById(prefix + 'StoryTheme').value;
        const storyText = document.getElementById(prefix + 'StoryText').value;
        const photoFile = document.getElementById(prefix + 'PhotoUpload').files[0];
        
        if (!title || !author || !theme || !storyText) {
            alert('Please fill in all required fields');
            return null;
        }
        
        // Collect selected questions and answers
        const fieldName = context === 'main' ? 'themeQuestions' : 'yearThemeQuestions';
        const selectedQuestions = document.querySelectorAll('input[name="' + fieldName + '"]:checked');
        
        const questionsAndAnswers = [];
        for (let i = 0; i < selectedQuestions.length; i++) {
            const checkbox = selectedQuestions[i];
            const questionText = checkbox.getAttribute('data-question');
            const answerTextarea = checkbox.closest('.question-option').querySelector('textarea');
            const answer = answerTextarea.value.trim();
            
            if (answer) {
                questionsAndAnswers.push({
                    question: questionText,
                    answer: answer
                });
            }
        }
        
        const formData = {
            family_code: this.familyCode,
            year: year,
            title: title,
            author: author,
            theme: this.themes[theme].name,
            story_text: storyText,
            questions_and_answers: questionsAndAnswers
        };
        
        // Handle photo if present
        if (photoFile) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    formData.photo_data = e.target.result;
                    formData.photo_filename = photoFile.name;
                    resolve(formData);
                };
                reader.readAsDataURL(photoFile);
            });
        }
        
        return Promise.resolve(formData);
    }
    
    async saveMemory(formDataPromise) {
        try {
            const formData = await formDataPromise;
            
            const response = await fetch('/api/memories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save memory');
            }
            
            const result = await response.json();
            console.log('Memory saved:', result);
            
            // Reload memories and update display
            await this.loadMemories();
            
        } catch (error) {
            console.error('Error saving memory:', error);
            alert('Error saving memory. Please try again.');
        }
    }
    
    applyZoom(zoomLevel) {
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.style.transform = 'scaleX(' + zoomLevel + ')';
        }
    }
}

// Family management functions
async function createFamily() {
    const familyName = document.getElementById('familyName').value;
    const createdBy = document.getElementById('createdBy').value;
    
    if (!familyName || !createdBy) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/create_family', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                family_name: familyName,
                created_by: createdBy
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Family timeline created! Your access code is: ' + result.access_code);
            window.location.href = result.redirect_url;
        } else {
            alert('Error creating family timeline');
        }
        
    } catch (error) {
        console.error('Error creating family:', error);
        alert('Error creating family timeline');
    }
}

// Initialize timeline when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get family code from URL or page data
    const urlParams = new URLSearchParams(window.location.search);
    const familyCode = urlParams.get('family') || window.familyCode;
    
    if (familyCode) {
        window.timeline = new FamilyTimeline(familyCode);
    }
});