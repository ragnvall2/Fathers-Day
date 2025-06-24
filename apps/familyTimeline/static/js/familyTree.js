/**
 * Simplified Family Tree - Heart-based connections
 * Click nodes for context menu: Add Spouse, Add Child, Edit, Delete
 */

class SimpleFamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        this.familyCode = familyCode;
        this.containerId = containerId;
        this.people = [];
        this.relationships = [];
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
            const response = await fetch(`/familyTimeline/api/tree/${this.familyCode}`);
            const data = await response.json();
            
            this.people = data.people || [];
            this.relationships = data.relationships || [];
            
            // Load story counts for each person
            for (let person of this.people) {
                try {
                    const storiesResponse = await fetch(`/familyTimeline/api/person/${person.id}/stories`);
                    const storiesData = await storiesResponse.json();
                    person.story_count = storiesData.stories ? storiesData.stories.length : 0;
                } catch (error) {
                    console.warn(`Could not load stories for person ${person.id}:`, error);
                    person.story_count = 0;
                }
            }
            
            // If no people exist, create a placeholder starter person
            if (this.people.length === 0) {
                await this.createStarterPerson();
            }
            
            console.log('Loaded tree data:', this.people);
        } catch (error) {
            console.error('Error loading tree data:', error);
        }
    }
    
    async createStarterPerson() {
        const starterData = {
            family_code: this.familyCode,
            first_name: 'Click to Edit',
            last_name: '',
            is_living: true,
            bio_summary: 'This is your family tree starter. Click to edit and add your information!'
        };
        
        try {
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(starterData)
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('Created starter person with ID:', result.person_id);
                // Reload data to get the new person with proper ID
                await this.loadTreeData();
            } else {
                console.error('Failed to create starter person:', result);
            }
        } catch (error) {
            console.error('Error creating starter person:', error);
        }
    }
    
    createPersonNode(container, person) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.style.cursor = 'pointer';
        
        // Create leaf shape
        const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        leaf.setAttribute('cx', person.x);
        leaf.setAttribute('cy', person.y);
        leaf.setAttribute('rx', '50');
        leaf.setAttribute('ry', '35');
        leaf.setAttribute('fill', 'url(#leafGradient)');
        leaf.setAttribute('stroke', '#228B22');
        leaf.setAttribute('stroke-width', '2');
        leaf.setAttribute('filter', 'url(#leafShadow)');
        
        // Add story indicator if person has stories
        if (person.story_count > 0) {
            const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            indicator.setAttribute('cx', person.x + 35);
            indicator.setAttribute('cy', person.y - 25);
            indicator.setAttribute('r', '8');
            indicator.setAttribute('fill', '#FFD700');
            indicator.setAttribute('stroke', '#FFA500');
            indicator.setAttribute('stroke-width', '2');
            group.appendChild(indicator);
            
            // Add book emoji
            const bookIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bookIcon.setAttribute('x', person.x + 35);
            bookIcon.setAttribute('y', person.y - 20);
            bookIcon.setAttribute('text-anchor', 'middle');
            bookIcon.setAttribute('font-size', '10');
            bookIcon.textContent = '📖';
            group.appendChild(bookIcon);
        }
        
        // Person photo or initial
        if (person.has_photo) {
            const photo = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            photo.setAttribute('x', person.x - 25);
            photo.setAttribute('y', person.y - 25);
            photo.setAttribute('height', '50');
            photo.setAttribute('href', `/familyTimeline/api/person-photo/${person.id}`);
            photo.setAttribute('clip-path', 'circle(22px)');
            group.appendChild(photo);
        } else {
            const initial = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            initial.setAttribute('x', person.x);
            initial.setAttribute('y', person.y + 5);
            initial.setAttribute('text-anchor', 'middle');
            initial.setAttribute('font-family', 'Arial, sans-serif');
            initial.setAttribute('font-size', '20');
            initial.setAttribute('font-weight', 'bold');
            initial.setAttribute('fill', '#2F4F2F');
            initial.textContent = person.first_name.charAt(0);
            group.appendChild(initial);
        }
        
        // Name label
        const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameLabel.setAttribute('x', person.x);
        nameLabel.setAttribute('y', person.y + 55);
        nameLabel.setAttribute('text-anchor', 'middle');
        nameLabel.setAttribute('font-family', 'Arial, sans-serif');
        nameLabel.setAttribute('font-size', '12');
        nameLabel.setAttribute('font-weight', 'bold');
        nameLabel.setAttribute('fill', '#2F4F2F');
        nameLabel.textContent = `${person.first_name} ${person.last_name || ''}`.trim();
        
        group.appendChild(leaf);
        group.appendChild(nameLabel);
        
        // Click handler for context menu
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showContextMenu(person.id, e);
        });
        
        container.appendChild(group);
    }
    
    createTreeContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Updated context menu to include "View Stories"
        container.innerHTML = `
            <div class="simple-tree-canvas">
                <svg id="familyTreeSVG" width="100%" height="100%" viewBox="0 0 1400 1000">
                    <defs>
                        <radialGradient id="leafGradient" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" style="stop-color:#90EE90;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
                        </radialGradient>
                        
                        <filter id="leafShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.2"/>
                        </filter>
                    </defs>
                    
                    <g id="connections"></g>
                    <g id="peopleNodes"></g>
                </svg>
            </div>
            
            <div class="tree-controls">
                <div class="zoom-controls">
                    <button id="zoomOut" class="control-btn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="control-btn">+</button>
                </div>
                <button id="centerTreeBtn" class="control-btn">🎯 Center</button>
            </div>
            
            <!-- Context Menu -->
            <div id="contextMenu" class="context-menu" style="display: none;">
                <div class="context-item" id="viewStories">📖 View Stories</div>
                <div class="context-item" id="addStory">✍️ Add Story</div>
                <div class="context-separator"></div>
                <div class="context-item" id="addSpouse">💕 Add Spouse</div>
                <div class="context-item" id="addChild">👶 Add Child</div>
                <div class="context-separator"></div>
                <div class="context-item" id="editPerson">✏️ Edit Person</div>
                <div class="context-item" id="deletePerson">🗑️ Delete Person</div>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.setupTreeInteractions();
        this.setupControlButtons();
        this.setupContextMenu();
        this.setupFormHandlers();
    }
    
    setupTreeInteractions() {
        const svg = document.getElementById('familyTreeSVG');
        if (!svg) return;
        
        let isPanning = false;
        let startX, startY;
        
        svg.addEventListener('mousedown', (e) => {
            if (e.target === svg || e.target.closest('#connections')) {
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
        
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.max(0.3, Math.min(3, this.scale * zoomFactor));
            this.updateTreeTransform();
            this.updateZoomDisplay();
        });
        
        // Hide context menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.person-node')) {
                this.hideContextMenu();
            }
        });
    }
    
    setupControlButtons() {
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
    }
    
    setupContextMenu() {
        document.getElementById('viewStories')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openPersonDetailModal(this.selectedPerson);
        });
        
        document.getElementById('addStory')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openAddStoryModal(this.selectedPerson);
        });
        
        document.getElementById('addSpouse')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openAddPersonModal('spouse');
        });
        
        document.getElementById('addChild')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openAddPersonModal('child');
        });
        
        document.getElementById('editPerson')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openEditPersonModal(this.selectedPerson);
        });
        
        document.getElementById('deletePerson')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openDeleteConfirmationModal(this.selectedPerson);
        });
    }
    
    setupFormHandlers() {
        // Add Person Form
        const addPersonForm = document.getElementById('addPersonForm');
        if (addPersonForm) {
            addPersonForm.addEventListener('submit', async (e) => {
                await this.handleAddPersonSubmit(e);
            });
        }
        
        // Edit Person Form
        const editPersonForm = document.getElementById('editPersonForm');
        if (editPersonForm) {
            editPersonForm.addEventListener('submit', async (e) => {
                await this.handleEditPersonSubmit(e);
            });
        }
        
        // Story Form
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', async (e) => {
                await this.handleStorySubmit(e);
            });
        }
        
        // Photo upload handlers
        this.setupPhotoUploadHandlers();
        
        // Theme selection handler
        document.addEventListener('change', (e) => {
            if (e.target.name === 'theme') {
                this.loadThemeQuestions(e.target.value, e.target.closest('form'));
            }
        });
        
        // Delete confirmation validation
        const deleteInput = document.getElementById('deleteConfirmText');
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        
        if (deleteInput && deleteBtn) {
            deleteInput.addEventListener('input', function() {
                deleteBtn.disabled = this.value.toUpperCase() !== 'DELETE';
            });
        }
        
        // Delete button handler
        document.addEventListener('click', (e) => {
            if (e.target.id === 'confirmDeleteBtn') {
                const personId = e.target.getAttribute('data-person-id');
                if (personId) {
                    this.handleDeletePerson(parseInt(personId));
                }
            }
        });
    }
    
    setupPhotoUploadHandlers() {
        // Add person photo upload
        const addPhotoInput = document.getElementById('addPersonPhoto');
        if (addPhotoInput) {
            addPhotoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e, 'addPersonPhotoPreview');
            });
        }
        
        // Edit person photo upload
        const editPhotoInput = document.getElementById('editPersonPhoto');
        if (editPhotoInput) {
            editPhotoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e, 'editPersonPhotoPreview');
            });
        }
        
        // Story photo upload
        const storyPhotoInput = document.getElementById('storyPhoto');
        if (storyPhotoInput) {
            storyPhotoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e, 'storyPhotoPreview');
            });
        }
    }
    
    handlePhotoUpload(event, previewId) {
        const file = event.target.files[0];
        const preview = document.getElementById(previewId);
        
        if (file && preview) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Photo must be smaller than 5MB');
                event.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    async loadThemeQuestions(themeKey, form) {
        if (!themeKey) return;
        
        try {
            const response = await fetch(`/familyTimeline/api/themes/${themeKey}/questions`);
            const data = await response.json();
            
            const questionsContainer = form.querySelector('.theme-questions');
            if (!questionsContainer) return;
            
            questionsContainer.innerHTML = '';
            
            data.questions.forEach(question => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-option';
                
                questionDiv.innerHTML = `
                    <label>
                        <input type="checkbox" name="theme_questions" value="${question.id}" data-question="${question.text}">
                        <span class="question-text">${question.text}</span>
                    </label>
                    <div class="answer-input" style="display: none;">
                        <textarea placeholder="Your answer..." rows="3"></textarea>
                    </div>
                `;
                
                // Add checkbox event listener
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
                
                questionsContainer.appendChild(questionDiv);
            });
            
            questionsContainer.parentElement.style.display = 'block';
        } catch (error) {
            console.error('Error loading theme questions:', error);
        }
    }
    
    async handleEditPersonSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const personId = formData.get('person_id');
            
            const personData = {
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                maiden_name: formData.get('maiden_name'),
                nickname: formData.get('nickname'),
                birth_date: formData.get('birth_date'),
                death_date: formData.get('death_date'),
                birth_place: formData.get('birth_place'),
                gender: formData.get('gender'),
                is_living: formData.get('is_living') === 'on',
                bio_summary: formData.get('bio_summary')
            };
            
            // Handle photo upload if new photo is selected
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                const photoData = await this.fileToBase64(photoFile);
                personData.photo_data = photoData;
                personData.photo_filename = photoFile.name;
            }
            
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal('editPersonModal');
                this.showSuccessMessage(`${personData.first_name} updated successfully!`);
                await this.loadTreeData();
                this.renderTree();
            } else {
                throw new Error(result.message || 'Failed to update person');
            }
        } catch (error) {
            console.error('Error updating person:', error);
            alert('Error updating person: ' + error.message);
        }
    }
    
    async handleDeletePerson(personId) {
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('deleteConfirmModal');
                this.showSuccessMessage(`Person deleted successfully. Removed ${data.deleted_stories} stories and ${data.deleted_relationships} relationships.`);
                await this.loadTreeData();
                this.renderTree();
            } else {
                throw new Error(data.message || 'Failed to delete person');
            }
        } catch (error) {
            console.error('Error deleting person:', error);
            alert('Error deleting person: ' + error.message);
        }
    }
    
    showContextMenu(personId, event) {
        console.log('Context menu for person ID:', personId, 'Type:', typeof personId);
        
        this.selectedPerson = personId;
        const menu = document.getElementById('contextMenu');
        
        // Position menu near the click
        const rect = event.target.getBoundingClientRect();
        menu.style.left = (rect.right + 10) + 'px';
        menu.style.top = rect.top + 'px';
        menu.style.display = 'block';
        
        // Adjust if menu goes off screen
        setTimeout(() => {
            const menuRect = menu.getBoundingClientRect();
            if (menuRect.right > window.innerWidth) {
                menu.style.left = (rect.left - menuRect.width - 10) + 'px';
            }
            if (menuRect.bottom > window.innerHeight) {
                menu.style.top = (rect.bottom - menuRect.height) + 'px';
            }
        }, 0);
    }
    
    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
        this.selectedPerson = null;
    }
    
    updateTreeTransform() {
        const connections = document.getElementById('connections');
        const peopleNodes = document.getElementById('peopleNodes');
        
        const transform = `translate(${this.panX}, ${this.panY}) scale(${this.scale})`;
        
        if (connections) connections.setAttribute('transform', transform);
        if (peopleNodes) peopleNodes.setAttribute('transform', transform);
    }
    
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }
    
    centerTree() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTreeTransform();
        this.updateZoomDisplay();
    }
    
    renderTree() {
        this.clearTree();
        this.calculatePositions();
        this.renderConnections();
        this.renderPeople();
    }
    
    clearTree() {
        const connections = document.getElementById('connections');
        const peopleNodes = document.getElementById('peopleNodes');
        
        if (connections) connections.innerHTML = '';
        if (peopleNodes) peopleNodes.innerHTML = '';
    }
    
    calculatePositions() {
        if (this.people.length === 0) return;
        
        // Find root person (usually the first one or one without parents)
        const rootPerson = this.findRootPerson();
        if (!rootPerson) return;
        
        // Start positioning from root
        this.positionFamily(rootPerson, 700, 200, new Set());
    }
    
    findRootPerson() {
        // Find person without parents, or just use first person
        const personWithoutParents = this.people.find(person => {
            return !this.relationships.some(rel => 
                rel.relationship_type === 'parent' && rel.person2_id === person.id
            );
        });
        
        return personWithoutParents || this.people[0];
    }
    
    positionFamily(person, x, y, visited) {
        if (visited.has(person.id)) return;
        visited.add(person.id);
        
        person.x = x;
        person.y = y;
        
        // Find spouse
        const spouse = this.getSpouse(person.id);
        if (spouse && !visited.has(spouse.id)) {
            spouse.x = x + 150; // Position spouse to the right
            spouse.y = y;
            visited.add(spouse.id);
        }
        
        // Find children
        const children = this.getChildren(person.id);
        if (children.length > 0) {
            const heartX = spouse ? x + 75 : x; // Heart between spouses or at person
            const startX = heartX - (children.length - 1) * 75; // Center children under heart
            
            children.forEach((child, index) => {
                if (!visited.has(child.id)) {
                    this.positionFamily(child, startX + (index * 150), y + 150, visited);
                }
            });
        }
    }
    
    getSpouse(personId) {
        const spouseRel = this.relationships.find(rel => 
            rel.relationship_type === 'spouse' && 
            (rel.person1_id === personId || rel.person2_id === personId)
        );
        
        if (!spouseRel) return null;
        
        const spouseId = spouseRel.person1_id === personId ? spouseRel.person2_id : spouseRel.person1_id;
        return this.people.find(p => p.id === spouseId);
    }
    
    getChildren(personId) {
        const childRelationships = this.relationships.filter(rel => 
            rel.relationship_type === 'parent' && rel.person1_id === personId
        );
        
        return childRelationships.map(rel => 
            this.people.find(p => p.id === rel.person2_id)
        ).filter(p => p);
    }
    
    renderConnections() {
        const container = document.getElementById('connections');
        if (!container) return;
        
        // Render spouse connections (hearts)
        this.renderSpouseConnections(container);
        
        // Render parent-child connections
        this.renderParentChildConnections(container);
    }
    
    renderSpouseConnections(container) {
        const spouseRelationships = this.relationships.filter(rel => rel.relationship_type === 'spouse');
        
        spouseRelationships.forEach(rel => {
            const person1 = this.people.find(p => p.id === rel.person1_id);
            const person2 = this.people.find(p => p.id === rel.person2_id);
            
            if (person1 && person2 && person1.x && person1.y && person2.x && person2.y) {
                this.drawSpouseConnection(container, person1, person2, !rel.divorce_date);
            }
        });
    }
    
    drawSpouseConnection(container, person1, person2, isMarried) {
        // Draw red line between spouses
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', person1.x);
        line.setAttribute('y1', person1.y);
        line.setAttribute('x2', person2.x);
        line.setAttribute('y2', person2.y);
        line.setAttribute('stroke', '#DC143C');
        line.setAttribute('stroke-width', '4');
        container.appendChild(line);
        
        // Add heart if currently married
        if (isMarried) {
            const heartX = (person1.x + person2.x) / 2;
            const heartY = (person1.y + person2.y) / 2;
            
            const heart = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            heart.setAttribute('x', heartX);
            heart.setAttribute('y', heartY + 5);
            heart.setAttribute('text-anchor', 'middle');
            heart.setAttribute('font-size', '20');
            heart.setAttribute('fill', '#DC143C');
            heart.textContent = '❤️';
            container.appendChild(heart);
        }
    }
    
    renderParentChildConnections(container) {
        // Group children by their parents
        const familyGroups = this.groupChildrenByParents();
        
        familyGroups.forEach(group => {
            if (group.parents.length > 0 && group.children.length > 0) {
                this.drawParentChildConnections(container, group);
            }
        });
    }
    
    groupChildrenByParents() {
        const groups = [];
        const processedChildren = new Set();
        
        this.relationships.forEach(rel => {
            if (rel.relationship_type === 'parent' && !processedChildren.has(rel.person2_id)) {
                const parent = this.people.find(p => p.id === rel.person1_id);
                const child = this.people.find(p => p.id === rel.person2_id);
                
                if (parent && child) {
                    // Find all children of this parent
                    const siblings = this.getChildren(parent.id);
                    const spouse = this.getSpouse(parent.id);
                    
                    const group = {
                        parents: spouse ? [parent, spouse] : [parent],
                        children: siblings
                    };
                    
                    groups.push(group);
                    siblings.forEach(sibling => processedChildren.add(sibling.id));
                }
            }
        });
        
        return groups;
    }
    
    drawParentChildConnections(container, group) {
        const parents = group.parents;
        const children = group.children;
        
        // Calculate heart/connection point
        let heartX, heartY;
        if (parents.length === 2) {
            heartX = (parents[0].x + parents[1].x) / 2;
            heartY = (parents[0].y + parents[1].y) / 2;
        } else {
            heartX = parents[0].x;
            heartY = parents[0].y;
        }
        
        // Draw line from heart down to children level
        const childrenY = children[0].y;
        const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        verticalLine.setAttribute('x1', heartX);
        verticalLine.setAttribute('y1', heartY + 15);
        verticalLine.setAttribute('x2', heartX);
        verticalLine.setAttribute('y2', childrenY - 40);
        verticalLine.setAttribute('stroke', '#8B4513');
        verticalLine.setAttribute('stroke-width', '3');
        container.appendChild(verticalLine);
        
        // Draw horizontal line connecting all children
        if (children.length > 1) {
            const leftmostChild = Math.min(...children.map(c => c.x));
            const rightmostChild = Math.max(...children.map(c => c.x));
            
            const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            horizontalLine.setAttribute('x1', leftmostChild);
            horizontalLine.setAttribute('y1', childrenY - 40);
            horizontalLine.setAttribute('x2', rightmostChild);
            horizontalLine.setAttribute('y2', childrenY - 40);
            horizontalLine.setAttribute('stroke', '#8B4513');
            horizontalLine.setAttribute('stroke-width', '3');
            container.appendChild(horizontalLine);
        }
        
        // Draw lines from horizontal line to each child
        children.forEach(child => {
            const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            childLine.setAttribute('x1', child.x);
            childLine.setAttribute('y1', childrenY - 40);
            childLine.setAttribute('x2', child.x);
            childLine.setAttribute('y2', child.y - 35);
            childLine.setAttribute('stroke', '#8B4513');
            childLine.setAttribute('stroke-width', '3');
            container.appendChild(childLine);
        });
    }
    
    renderPeople() {
        const container = document.getElementById('peopleNodes');
        if (!container) return;
        
        this.people.forEach(person => {
            if (person.x && person.y) {
                this.createPersonNode(container, person);
            }
        });
    }
    
    // Modal operations with full story functionality
    openAddPersonModal(type) {
        const modal = document.getElementById('addPersonModal');
        if (modal) {
            // Set up the form based on type (spouse or child)
            this.currentAddType = type;
            this.currentParentId = this.selectedPerson;
            
            modal.style.display = 'block';
            document.getElementById('addPersonForm').reset();
            
            // Clear photo preview
            const photoPreview = document.getElementById('addPersonPhotoPreview');
            if (photoPreview) photoPreview.style.display = 'none';
        }
    }
    
    openEditPersonModal(personId) {
        console.log('Attempting to edit person with ID:', personId, 'Type:', typeof personId);
        
        const modal = document.getElementById('editPersonModal');
        if (!modal) {
            console.error('Edit modal not found');
            return;
        }
        
        // Validate person ID
        if (!personId) {
            console.error('No person ID provided');
            alert('Error: No person ID provided. Please try refreshing the page.');
            return;
        }
        
        // Convert to integer if it's a string
        const numericId = parseInt(personId);
        if (isNaN(numericId)) {
            console.error('Invalid person ID:', personId);
            alert('Error: Invalid person ID format. Please try refreshing the page.');
            return;
        }
        
        console.log('Making API call to:', `/familyTimeline/api/person/${numericId}`);
        
        // Load person data
        fetch(`/familyTimeline/api/person/${numericId}`)
            .then(response => {
                console.log('API Response status:', response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error('API Error response:', text);
                        throw new Error(`Server error: ${response.status} - ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Received person data:', data);
                if (data.person) {
                    this.populateEditForm(data.person);
                    modal.style.display = 'block';
                } else if (data.success === false) {
                    throw new Error(data.error || 'Person not found');
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(error => {
                console.error('Error loading person data:', error);
                alert(`Error loading person data: ${error.message}`);
            });
    }
    
    populateEditForm(person) {
        document.getElementById('editPersonId').value = person.id;
        document.getElementById('editFirstName').value = person.first_name || '';
        document.getElementById('editLastName').value = person.last_name || '';
        document.getElementById('editMaidenName').value = person.maiden_name || '';
        document.getElementById('editNickname').value = person.nickname || '';
        document.getElementById('editBirthDate').value = person.birth_date || '';
        document.getElementById('editDeathDate').value = person.death_date || '';
        document.getElementById('editBirthPlace').value = person.birth_place || '';
        document.getElementById('editGender').value = person.gender || '';
        document.getElementById('editIsLiving').checked = person.is_living;
        document.getElementById('editBioSummary').value = person.bio_summary || '';
        
        // Handle photo preview
        const photoPreview = document.getElementById('editPersonPhotoPreview');
        if (person.has_photo) {
            photoPreview.src = `/familyTimeline/api/person-photo/${person.id}`;
            photoPreview.style.display = 'block';
        } else {
            photoPreview.style.display = 'none';
        }
        
        // Clear file input
        document.getElementById('editPersonPhoto').value = '';
        
        // Show/hide death date field
        const deathDateGroup = document.getElementById('editDeathDateGroup');
        if (deathDateGroup) {
            deathDateGroup.style.display = person.is_living ? 'none' : 'block';
        }
    }
    
    openDeleteConfirmationModal(personId) {
        // Get deletion preview data
        fetch(`/familyTimeline/api/person/${personId}/delete-preview`)
            .then(response => response.json())
            .then(data => {
                this.showDeleteConfirmation(personId, data);
            })
            .catch(error => {
                console.error('Error getting delete preview:', error);
                alert('Error loading deletion details');
            });
    }
    
    showDeleteConfirmation(personId, previewData) {
        const modal = document.getElementById('deleteConfirmModal');
        if (!modal) return;
        
        // Update modal content
        document.getElementById('deletePersonName').textContent = previewData.person_name;
        document.getElementById('deleteStoryCount').textContent = previewData.story_count;
        document.getElementById('deleteRelationshipCount').textContent = previewData.relationship_count;
        
        // Build lists of what will be deleted
        const storiesList = document.getElementById('deleteStoriesList');
        storiesList.innerHTML = '';
        previewData.stories.forEach(story => {
            const li = document.createElement('li');
            li.textContent = `"${story.title}" (${story.theme})`;
            storiesList.appendChild(li);
        });
        
        const relationshipsList = document.getElementById('deleteRelationshipsList');
        relationshipsList.innerHTML = '';
        previewData.relationships.forEach(rel => {
            const li = document.createElement('li');
            li.textContent = `${rel.relationship_type} with ${rel.other_person}`;
            relationshipsList.appendChild(li);
        });
        
        // Show/hide sections
        const storiesSection = document.getElementById('deleteStoriesSection');
        const relationshipsSection = document.getElementById('deleteRelationshipsSection');
        
        if (storiesSection) {
            storiesSection.style.display = previewData.story_count > 0 ? 'block' : 'none';
        }
        if (relationshipsSection) {
            relationshipsSection.style.display = previewData.relationship_count > 0 ? 'block' : 'none';
        }
        
        // Reset confirmation
        document.getElementById('confirmDeleteBtn').setAttribute('data-person-id', personId);
        document.getElementById('deleteConfirmText').value = '';
        document.getElementById('confirmDeleteBtn').disabled = true;
        
        modal.style.display = 'block';
    }
    
    openAddStoryModal(personId) {
        const modal = document.getElementById('addStoryModal');
        if (modal) {
            // Set the person ID for the story
            document.getElementById('storyPersonId').value = personId;
            
            // Load the person's name for context
            const person = this.people.find(p => p.id === personId);
            if (person) {
                const personName = `${person.first_name} ${person.last_name || ''}`.trim();
                document.getElementById('storyPersonName').textContent = personName;
            }
            
            modal.style.display = 'block';
            document.getElementById('storyForm').reset();
            
            // Clear photo preview
            const photoPreview = document.getElementById('storyPhotoPreview');
            if (photoPreview) photoPreview.style.display = 'none';
            
            // Hide theme questions initially
            const questionsGroup = document.getElementById('themeQuestionsGroup');
            if (questionsGroup) questionsGroup.style.display = 'none';
        }
    }
    
    openPersonDetailModal(personId) {
        // Load person details and stories
        Promise.all([
            fetch(`/familyTimeline/api/person/${personId}`).then(r => r.json()),
            fetch(`/familyTimeline/api/person/${personId}/stories`).then(r => r.json())
        ]).then(([personData, storiesData]) => {
            if (personData.person) {
                this.populatePersonModal(personData.person, storiesData.stories || []);
                const modal = document.getElementById('personModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            }
        }).catch(error => {
            console.error('Error loading person details:', error);
        });
    }
    
    populatePersonModal(person, stories) {
        // Store current person ID
        this.selectedPerson = person.id;
        
        // Update modal content
        document.getElementById('personName').textContent = 
            `${person.first_name} ${person.last_name || ''}`.trim();
        
        document.getElementById('personDetails').innerHTML = `
            <div class="person-info-grid">
                ${person.maiden_name ? `<div><strong>Maiden Name:</strong> ${person.maiden_name}</div>` : ''}
                ${person.nickname ? `<div><strong>Nickname:</strong> ${person.nickname}</div>` : ''}
                ${person.birth_date ? `<div><strong>Born:</strong> ${new Date(person.birth_date).toLocaleDateString()}</div>` : ''}
                ${person.death_date ? `<div><strong>Died:</strong> ${new Date(person.death_date).toLocaleDateString()}</div>` : ''}
                ${person.birth_place ? `<div><strong>Birth Place:</strong> ${person.birth_place}</div>` : ''}
                ${person.gender ? `<div><strong>Gender:</strong> ${person.gender}</div>` : ''}
                <div><strong>Status:</strong> ${person.is_living ? 'Living' : 'Deceased'}</div>
                ${person.bio_summary ? `<div class="bio-summary"><strong>Biography:</strong><br>${person.bio_summary}</div>` : ''}
            </div>
        `;
        
        // Update photo
        const photoContainer = document.getElementById('personPhoto');
        if (person.has_photo) {
            photoContainer.innerHTML = `<img src="/familyTimeline/api/person-photo/${person.id}" alt="${person.first_name}" style="max-width: 150px; border-radius: 10px;" />`;
        } else {
            photoContainer.innerHTML = `<div class="no-photo" style="width: 100px; height: 100px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; color: #6c757d;">${person.first_name.charAt(0)}</div>`;
        }
        
        // Display stories
        this.displayPersonStories(stories);
    }
    
    displayPersonStories(stories) {
        const storiesContainer = document.getElementById('personStories');
        if (!storiesContainer) return;
        
        if (stories && stories.length > 0) {
            storiesContainer.innerHTML = stories.map(story => `
                <div class="story-item" style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 10px; border-left: 4px solid #28a745;">
                    <div class="story-header" style="margin-bottom: 15px;">
                        <h4 style="color: #28a745; margin-bottom: 8px;">${story.title}</h4>
                        <div class="story-meta" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                            <span class="theme" style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${story.theme}</span>
                            ${story.time_period ? `<span class="period" style="background: #fff3e0; color: #f57c00; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${story.time_period}</span>` : ''}
                            ${story.year_occurred ? `<span class="year" style="background: #f3e5f5; color: #7b1fa2; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${story.year_occurred}</span>` : ''}
                            ${story.is_featured ? `<span class="featured" style="background: #fff8e1; color: #ff8f00; padding: 4px 8px; border-radius: 12px; font-size: 12px;">⭐ Featured</span>` : ''}
                        </div>
                        <div class="story-author" style="font-style: italic; color: #666; font-size: 14px;">by ${story.author_name}</div>
                        <div class="story-date" style="font-size: 12px; color: #999;">Added on ${new Date(story.created_at).toLocaleDateString()}</div>
                    </div>
                    
                    ${story.questions_and_answers && story.questions_and_answers.length > 0 ? `
                        <div class="story-questions" style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 3px solid #28a745;">
                            ${story.questions_and_answers.map(qa => `
                                <div class="question-answer" style="margin-bottom: 12px;">
                                    <div class="question" style="font-weight: bold; color: #28a745; margin-bottom: 5px; font-size: 14px;">${qa.question}</div>
                                    <div class="answer" style="color: #333; line-height: 1.5; padding-left: 10px; border-left: 2px solid #ddd; font-style: italic; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 5px;">${qa.answer}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="story-text" style="line-height: 1.6; margin: 15px 0; color: #333; background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; border: 1px solid rgba(40,167,69,0.1);">${story.story_text}</div>
                    
                    ${story.has_photo ? `<img src="/familyTimeline/api/story-photo/${story.id}" class="story-photo" style="max-width: 100%; border-radius: 8px; margin-top: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="Story photo">` : ''}
                </div>
            `).join('');
        } else {
            storiesContainer.innerHTML = `
                <div style="text-align: center; color: #666; font-style: italic; padding: 40px 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
                    <h4 style="color: #28a745; margin-bottom: 10px;">📖 No Stories Yet</h4>
                    <p>This person's stories are waiting to be told. Click "Add Story" to share their memories, experiences, and legacy for future generations.</p>
                </div>
            `;
        }
    }
    
    // Form submission handlers
    async handleAddPersonSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const personData = {
                family_code: this.familyCode,
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                maiden_name: formData.get('maiden_name'),
                nickname: formData.get('nickname'),
                birth_date: formData.get('birth_date'),
                death_date: formData.get('death_date'),
                birth_place: formData.get('birth_place'),
                gender: formData.get('gender'),
                is_living: formData.get('is_living') === 'on',
                bio_summary: formData.get('bio_summary')
            };
            
            // Handle photo upload
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                const photoData = await this.fileToBase64(photoFile);
                personData.photo_data = photoData;
                personData.photo_filename = photoFile.name;
            }
            
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Create relationship if this is a spouse or child
                if (this.currentAddType && this.currentParentId) {
                    await this.createRelationship(this.currentParentId, result.person_id, this.currentAddType);
                }
                
                this.closeModal('addPersonModal');
                this.showSuccessMessage(`${personData.first_name} added successfully!`);
                await this.loadTreeData();
                this.renderTree();
                e.target.reset();
            } else {
                throw new Error(result.message || 'Failed to add person');
            }
        } catch (error) {
            console.error('Error adding person:', error);
            alert('Error adding person: ' + error.message);
        }
    }
    
    async createRelationship(person1Id, person2Id, type) {
        const relationshipData = {
            family_code: this.familyCode,
            person1_id: parseInt(person1Id),
            person2_id: parseInt(person2Id),
            relationship_type: type === 'spouse' ? 'spouse' : 'parent'
        };
        
        const response = await fetch('/familyTimeline/api/relationship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relationshipData)
        });
        
        return response.json();
    }
    
    async handleStorySubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            
            // Collect theme questions answers
            const questionsAndAnswers = [];
            const selectedQuestions = e.target.querySelectorAll('input[name="theme_questions"]:checked');
            
            selectedQuestions.forEach(checkbox => {
                const questionText = checkbox.getAttribute('data-question');
                const answerTextarea = checkbox.closest('.question-option').querySelector('textarea');
                const answer = answerTextarea.value.trim();
                
                if (answer) {
                    questionsAndAnswers.push({
                        question: questionText,
                        answer: answer
                    });
                }
            });
            
            const storyData = {
                family_code: this.familyCode,
                person_id: parseInt(formData.get('person_id')),
                title: formData.get('title'),
                author_name: formData.get('author_name'),
                theme: formData.get('theme'),
                time_period: formData.get('time_period'),
                year_occurred: formData.get('year_occurred') ? parseInt(formData.get('year_occurred')) : null,
                story_text: formData.get('story_text'),
                questions_and_answers: questionsAndAnswers,
                is_featured: formData.get('is_featured') === 'on'
            };
            
            // Handle photo upload
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                const photoData = await this.fileToBase64(photoFile);
                storyData.photo_data = photoData;
                storyData.photo_filename = photoFile.name;
            }
            
            const response = await fetch('/familyTimeline/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storyData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal('addStoryModal');
                this.showSuccessMessage('Story added successfully! 📖✨');
                e.target.reset();
                
                // Update the tree to show story indicators
                this.renderTree();
            } else {
                throw new Error(result.message || 'Failed to add story');
            }
        } catch (error) {
            console.error('Error adding story:', error);
            alert('Error adding story: ' + error.message);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }
    
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

// Initialize the simplified family tree
document.addEventListener('DOMContentLoaded', function() {
    const familyCode = new URLSearchParams(window.location.search).get('family') || window.familyCode;
    
    if (familyCode) {
        window.familyTree = new SimpleFamilyTree(familyCode);
    }
});

// Add styles for the simplified tree
const simpleTreeStyle = document.createElement('style');
simpleTreeStyle.textContent = `
    .simple-tree-canvas {
        width: 100%;
        height: 100%;
        position: relative;
        cursor: grab;
        background: linear-gradient(135deg, #87CEEB 0%, #98D8C8 50%, #90EE90 100%);
    }
    
    .simple-tree-canvas:active {
        cursor: grabbing;
    }
    
    .tree-controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 15px;
        align-items: center;
        background: rgba(255,255,255,0.9);
        padding: 10px 20px;
        border-radius: 25px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .zoom-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .control-btn {
        width: 35px;
        height: 35px;
        border: none;
        border-radius: 50%;
        background: #4CAF50;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .control-btn:hover {
        background: #45a049;
        transform: scale(1.1);
    }
    
    #zoomLevel {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        min-width: 50px;
        text-align: center;
    }
    
    .context-menu {
        position: fixed;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        border: 1px solid #ddd;
        padding: 5px 0;
        z-index: 1000;
        min-width: 160px;
    }
    
    .context-item {
        padding: 10px 15px;
        cursor: pointer;
        transition: background 0.2s ease;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .context-item:hover {
        background: #f0f0f0;
    }
    
    .context-separator {
        height: 1px;
        background: #e0e0e0;
        margin: 5px 0;
    }
    
    .person-node {
        transition: all 0.3s ease;
    }
    
    .person-node:hover {
        filter: brightness(1.1) drop-shadow(0 0 8px rgba(46,125,50,0.6));
    }
    
    /* Story indicator styles */
    .story-indicator {
        animation: storyPulse 2s infinite;
    }
    
    @keyframes storyPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    /* Success message animation */
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .success-message {
        animation: slideIn 0.3s ease-out;
    }
`;
document.head.appendChild(simpleTreeStyle);