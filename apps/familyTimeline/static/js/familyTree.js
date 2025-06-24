/**
 * Family Tree Visualization - SVG-based Interactive Tree
 */

class FamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        this.familyCode = familyCode;
        this.containerId = containerId;
        this.people = [];
        this.relationships = [];
        this.treeSettings = {};
        this.selectedPerson = null;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadTreeData();
        this.createTreeContainer();
        this.setupEventListeners();
        this.renderTree();
    }
    
    async loadTreeData() {
        if (!this.familyCode) return;
        
        try {
            const response = await fetch(`/api/tree/${this.familyCode}`);
            const data = await response.json();
            
            this.people = data.people || [];
            this.relationships = data.relationships || [];
            this.treeSettings = data.settings || {};
            
            console.log('Loaded tree data:', data);
        } catch (error) {
            console.error('Error loading tree data:', error);
        }
    }
    
    createTreeContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="tree-canvas">
                <svg id="familyTreeSVG" width="100%" height="100%" viewBox="0 0 1200 800">
                    <defs>
                        <!-- Tree gradients and patterns -->
                        <radialGradient id="trunkGradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#654321;stop-opacity:1" />
                        </radialGradient>
                        
                        <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#A0522D;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8B4513;stop-opacity:1" />
                        </linearGradient>
                        
                        <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
                        </filter>
                        
                        <pattern id="leafPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                            <circle cx="10" cy="10" r="8" fill="#228B22" opacity="0.6"/>
                        </pattern>
                    </defs>
                    
                    <!-- Tree trunk and main branches -->
                    <g id="treeStructure">
                        <!-- Main trunk -->
                        <path id="mainTrunk" d="M 600 750 Q 600 650 600 550" 
                              stroke="url(#trunkGradient)" stroke-width="20" fill="none" />
                    </g>
                    
                    <!-- People nodes -->
                    <g id="peopleNodes"></g>
                    
                    <!-- Relationship lines -->
                    <g id="relationshipLines"></g>
                </svg>
            </div>
            
            <!-- Tree controls -->
            <div class="tree-controls">
                <div class="zoom-controls">
                    <button id="zoomIn" class="control-btn">+</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomOut" class="control-btn">-</button>
                </div>
                <div class="tree-actions">
                    <button id="addPersonBtn" class="action-btn">+ Add Person</button>
                    <button id="centerTreeBtn" class="action-btn">Center Tree</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const svg = document.getElementById('familyTreeSVG');
        if (!svg) return;
        
        // Pan and zoom
        let isPanning = false;
        let startX, startY;
        
        svg.addEventListener('mousedown', (e) => {
            if (e.target === svg || e.target.closest('#treeStructure')) {
                isPanning = true;
                startX = e.clientX - this.panX;
                startY = e.clientY - this.panY;
                svg.style.cursor = 'grabbing';
            }
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (isPanning) {
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this.updateTreeTransform();
            }
        });
        
        svg.addEventListener('mouseup', () => {
            isPanning = false;
            svg.style.cursor = 'grab';
        });
        
        svg.addEventListener('mouseleave', () => {
            isPanning = false;
            svg.style.cursor = 'default';
        });
        
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => {
            this.scale = Math.min(this.scale * 1.2, 3);
            this.updateTreeTransform();
            this.updateZoomDisplay();
        });
        
        document.getElementById('zoomOut')?.addEventListener('click', () => {
            this.scale = Math.max(this.scale / 1.2, 0.3);
            this.updateTreeTransform();
            this.updateZoomDisplay();
        });
        
        document.getElementById('centerTreeBtn')?.addEventListener('click', () => {
            this.centerTree();
        });
        
        document.getElementById('addPersonBtn')?.addEventListener('click', () => {
            this.openAddPersonModal();
        });
        
        // Mouse wheel zoom
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.max(0.3, Math.min(3, this.scale * zoomFactor));
            this.updateTreeTransform();
            this.updateZoomDisplay();
        });
    }
    
    renderTree() {
        this.renderTreeStructure();
        this.renderPeople();
        this.renderRelationships();
        this.centerTree();
    }
    
    renderTreeStructure() {
        const treeStructure = document.getElementById('treeStructure');
        if (!treeStructure) return;
        
        // Clear existing branches
        const existingBranches = treeStructure.querySelectorAll('.branch');
        existingBranches.forEach(branch => branch.remove());
        
        // Calculate tree layout and render branches
        const layout = this.calculateTreeLayout();
        
        // Draw main branches for each generation
        layout.generations.forEach((generation, level) => {
            if (level === 0) return; // Skip root level
            
            const yPos = 600 - (level * 120);
            const parentY = 600 - ((level - 1) * 120);
            
            generation.forEach((person, index) => {
                const xPos = person.x;
                const parentX = person.parentX || 600;
                
                // Create branch from parent to person
                const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const branchPath = `M ${parentX} ${parentY} Q ${(parentX + xPos) / 2} ${(parentY + yPos) / 2} ${xPos} ${yPos}`;
                
                branch.setAttribute('d', branchPath);
                branch.setAttribute('stroke', 'url(#branchGradient)');
                branch.setAttribute('stroke-width', Math.max(8 - level * 2, 3));
                branch.setAttribute('fill', 'none');
                branch.setAttribute('class', 'branch');
                branch.setAttribute('filter', 'url(#dropShadow)');
                
                treeStructure.appendChild(branch);
            });
        });
    }
    
    renderPeople() {
        const peopleContainer = document.getElementById('peopleNodes');
        if (!peopleContainer) return;
        
        peopleContainer.innerHTML = '';
        
        const layout = this.calculateTreeLayout();
        
        layout.generations.forEach((generation, level) => {
            generation.forEach((person) => {
                const personGroup = this.createPersonNode(person, person.x, person.y);
                peopleContainer.appendChild(personGroup);
            });
        });
    }
    
    createPersonNode(person, x, y) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.setAttribute('transform', `translate(${x}, ${y})`);
        group.style.cursor = 'pointer';
        
        // Background circle (like tree fruit or ornament)
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '0');
        bgCircle.setAttribute('cy', '0');
        bgCircle.setAttribute('r', '35');
        bgCircle.setAttribute('fill', this.getPersonColor(person));
        bgCircle.setAttribute('stroke', '#8B4513');
        bgCircle.setAttribute('stroke-width', '3');
        bgCircle.setAttribute('filter', 'url(#dropShadow)');
        group.appendChild(bgCircle);
        
        // Photo or initials
        if (person.has_photo) {
            const photoCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            photoCircle.setAttribute('cx', '0');
            photoCircle.setAttribute('cy', '0');
            photoCircle.setAttribute('r', '30');
            photoCircle.setAttribute('fill', `url(#photo-${person.id})`);
            
            // Create photo pattern
            const defs = document.querySelector('defs');
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', `photo-${person.id}`);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', '60');
            pattern.setAttribute('height', '60');
            
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('href', `/api/person-photo/${person.id}`);
            image.setAttribute('width', '60');
            image.setAttribute('height', '60');
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            
            pattern.appendChild(image);
            defs.appendChild(pattern);
            group.appendChild(photoCircle);
        } else {
            // Show initials
            const initials = this.getInitials(person.first_name, person.last_name);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', '5');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'Georgia, serif');
            text.setAttribute('font-size', '16');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', 'white');
            text.textContent = initials;
            group.appendChild(text);
        }
        
        // Name label
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', '0');
        nameText.setAttribute('y', '55');
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-family', 'Georgia, serif');
        nameText.setAttribute('font-size', '12');
        nameText.setAttribute('font-weight', 'bold');
        nameText.setAttribute('fill', '#8B4513');
        nameText.textContent = person.full_name;
        group.appendChild(nameText);
        
        // Birth/death dates
        if (person.birth_date || person.death_date) {
            const dates = this.formatDateRange(person.birth_date, person.death_date, person.is_living);
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', '0');
            dateText.setAttribute('y', '70');
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-family', 'Georgia, serif');
            dateText.setAttribute('font-size', '10');
            dateText.setAttribute('fill', '#666');
            dateText.textContent = dates;
            group.appendChild(dateText);
        }
        
        // Click handler
        group.addEventListener('click', () => {
            this.selectPerson(person);
        });
        
        // Hover effects
        group.addEventListener('mouseenter', () => {
            bgCircle.setAttribute('r', '40');
            group.style.filter = 'brightness(1.1)';
        });
        
        group.addEventListener('mouseleave', () => {
            bgCircle.setAttribute('r', '35');
            group.style.filter = 'brightness(1)';
        });
        
        return group;
    }
    
    renderRelationships() {
        const relationshipContainer = document.getElementById('relationshipLines');
        if (!relationshipContainer) return;
        
        relationshipContainer.innerHTML = '';
        
        // Draw marriage connections (horizontal lines between spouses)
        const spouseRelationships = this.relationships.filter(rel => rel.relationship_type === 'spouse');
        
        spouseRelationships.forEach(rel => {
            const person1 = this.people.find(p => p.id === rel.person1_id);
            const person2 = this.people.find(p => p.id === rel.person2_id);
            
            if (person1 && person2) {
                const layout = this.calculateTreeLayout();
                const pos1 = this.getPersonPosition(person1.id, layout);
                const pos2 = this.getPersonPosition(person2.id, layout);
                
                if (pos1 && pos2) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', pos1.x);
                    line.setAttribute('y1', pos1.y);
                    line.setAttribute('x2', pos2.x);
                    line.setAttribute('y2', pos2.y);
                    line.setAttribute('stroke', '#FFD700');
                    line.setAttribute('stroke-width', '4');
                    line.setAttribute('stroke-dasharray', '5,5');
                    line.setAttribute('opacity', '0.8');
                    relationshipContainer.appendChild(line);
                }
            }
        });
    }
    
    calculateTreeLayout() {
        if (this.people.length === 0) {
            return { generations: [] };
        }
        
        // Simple layout algorithm - can be enhanced later
        const generations = {};
        const rootPerson = this.people[0]; // For now, use first person as root
        
        // Assign generation levels
        this.people.forEach(person => {
            const level = person.generation_level || 0;
            if (!generations[level]) {
                generations[level] = [];
            }
            generations[level].push(person);
        });
        
        // Calculate positions for each generation
        const generationArray = [];
        const centerX = 600;
        const generationHeight = 120;
        const baseY = 400;
        
        Object.keys(generations).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            const levelNum = parseInt(level);
            const people = generations[level];
            const y = baseY - (levelNum * generationHeight);
            
            // Spread people horizontally
            const spacing = Math.max(150, 800 / Math.max(people.length, 1));
            const startX = centerX - ((people.length - 1) * spacing) / 2;
            
            people.forEach((person, index) => {
                const x = startX + (index * spacing);
                person.x = x;
                person.y = y;
                
                // Find parent position for branch drawing
                const parentRel = this.relationships.find(rel => 
                    rel.person2_id === person.id && rel.relationship_type === 'parent'
                );
                if (parentRel) {
                    const parent = this.people.find(p => p.id === parentRel.person1_id);
                    if (parent) {
                        person.parentX = parent.x || centerX;
                    }
                }
            });
            
            generationArray[levelNum] = people;
        });
        
        return { generations: generationArray };
    }
    
    getPersonPosition(personId, layout) {
        for (const generation of layout.generations) {
            if (generation) {
                const person = generation.find(p => p.id === personId);
                if (person) {
                    return { x: person.x, y: person.y };
                }
            }
        }
        return null;
    }
    
    getPersonColor(person) {
        // Color coding based on gender or generation
        const colors = {
            male: '#4A90E2',
            female: '#E24A90',
            other: '#9B59B6',
            unknown: '#95A5A6'
        };
        return colors[person.gender] || colors.unknown;
    }
    
    getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last;
    }
    
    formatDateRange(birthDate, deathDate, isLiving) {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.getFullYear().toString();
        };
        
        const birth = formatDate(birthDate);
        const death = formatDate(deathDate);
        
        if (birth && death) {
            return `${birth} - ${death}`;
        } else if (birth && isLiving) {
            return `${birth} - present`;
        } else if (birth) {
            return birth;
        }
        return '';
    }
    
    selectPerson(person) {
        this.selectedPerson = person;
        this.highlightSelectedPerson();
        this.openPersonModal(person);
    }
    
    highlightSelectedPerson() {
        // Remove previous highlights
        document.querySelectorAll('.person-node').forEach(node => {
            node.style.filter = 'brightness(1)';
        });
        
        // Highlight selected person
        if (this.selectedPerson) {
            const selectedNode = document.querySelector(`[data-person-id="${this.selectedPerson.id}"]`);
            if (selectedNode) {
                selectedNode.style.filter = 'brightness(1.3) drop-shadow(0 0 10px #FFD700)';
            }
        }
    }
    
    openPersonModal(person) {
        this.loadPersonStories(person.id);
        document.getElementById('personModalName').textContent = person.full_name;
        document.getElementById('personModal').style.display = 'block';
    }
    
    async loadPersonStories(personId) {
        try {
            const response = await fetch(`/api/person/${personId}/stories`);
            const data = await response.json();
            this.displayPersonStories(data.stories || []);
        } catch (error) {
            console.error('Error loading person stories:', error);
        }
    }
    
    displayPersonStories(stories) {
        const container = document.getElementById('personStories');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (stories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p>No stories yet for this person.</p>
                    <button id="addFirstStory" class="btn" style="margin-top: 15px;">Add Their First Story</button>
                </div>
            `;
            
            document.getElementById('addFirstStory')?.addEventListener('click', () => {
                this.openAddStoryModal(this.selectedPerson.id);
            });
            return;
        }
        
        stories.forEach(story => {
            const storyDiv = document.createElement('div');
            storyDiv.className = 'story-item';
            
            let questionsHtml = '';
            if (story.questions_and_answers && story.questions_and_answers.length > 0) {
                questionsHtml = '<div class="story-questions">';
                story.questions_and_answers.forEach(qa => {
                    questionsHtml += `
                        <div class="question-answer">
                            <div class="question">${qa.question}</div>
                            <div class="answer">${qa.answer}</div>
                        </div>
                    `;
                });
                questionsHtml += '</div>';
            }
            
            storyDiv.innerHTML = `
                <div class="story-header">
                    <div class="story-title">${story.title}</div>
                    <div class="story-meta">
                        <span class="story-theme">${story.theme}</span>
                        ${story.time_period ? `<span class="story-period">${story.time_period}</span>` : ''}
                        ${story.year_occurred ? `<span class="story-year">${story.year_occurred}</span>` : ''}
                    </div>
                </div>
                <div class="story-author">Story by: ${story.author_name}</div>
                <div class="story-date">Added ${new Date(story.created_at).toLocaleDateString()}</div>
                ${questionsHtml}
                <div class="story-text">${story.story_text}</div>
                ${story.has_photo ? `<img src="/api/story-photo/${story.id}" class="story-photo" alt="Story photo">` : ''}
            `;
            
            container.appendChild(storyDiv);
        });
    }
    
    openAddPersonModal() {
        this.populateRelationshipOptions();
        document.getElementById('addPersonModal').style.display = 'block';
    }
    
    openAddStoryModal(personId) {
        document.getElementById('storyPersonId').value = personId;
        this.populateStoryThemes();
        document.getElementById('addStoryModal').style.display = 'block';
    }
    
    populateRelationshipOptions() {
        const select = document.getElementById('relationshipPerson');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select person to relate to...</option>';
        
        this.people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.full_name;
            select.appendChild(option);
        });
    }
    
    populateStoryThemes() {
        // This would populate theme dropdown for story creation
        // Implementation depends on your theme system
    }
    
    updateTreeTransform() {
        const svg = document.getElementById('familyTreeSVG');
        if (svg) {
            const transform = `translate(${this.panX}, ${this.panY}) scale(${this.scale})`;
            svg.style.transform = transform;
        }
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.scale * 100) + '%';
        }
    }
    
    centerTree() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
        this.updateTreeTransform();
        this.updateZoomDisplay();
    }
    
    async addPerson(personData) {
        try {
            const response = await fetch('/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    family_code: this.familyCode,
                    ...personData
                })
            });
            
            if (response.ok) {
                await this.loadTreeData();
                this.renderTree();
                document.getElementById('addPersonModal').style.display = 'none';
            }
        } catch (error) {
            console.error('Error adding person:', error);
        }
    }
    
    async addStory(storyData) {
        try {
            const response = await fetch('/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    family_code: this.familyCode,
                    ...storyData
                })
            });
            
            if (response.ok) {
                await this.loadPersonStories(storyData.person_id);
                document.getElementById('addStoryModal').style.display = 'none';
            }
        } catch (error) {
            console.error('Error adding story:', error);
        }
    }
}

// Initialize family tree when page loads
document.addEventListener('DOMContentLoaded', function() {
    const familyCode = new URLSearchParams(window.location.search).get('family') || window.familyCode;
    
    if (familyCode) {
        window.familyTree = new FamilyTree(familyCode);
    }
});