/**
 * Enhanced Organic Family Tree - Complete Version
 */

class OrganicFamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        this.familyCode = familyCode;
        this.containerId = containerId;
        this.people = [];
        this.relationships = [];
        this.treeSettings = { style: 'organic' };
        this.selectedPerson = null;
        this.connectingMode = false;
        this.connectionStart = null;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.rootCouple = [];
        
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
            this.treeSettings = { ...this.treeSettings, ...data.settings };
            
            this.identifyRootCouple();
            console.log('Loaded tree data:', data);
        } catch (error) {
            console.error('Error loading tree data:', error);
        }
    }
    
    identifyRootCouple() {
        const spouseRelationships = this.relationships.filter(rel => rel.relationship_type === 'spouse');
        
        if (spouseRelationships.length === 0 && this.people.length >= 2) {
            this.rootCouple = this.people.slice(0, 2);
        } else if (spouseRelationships.length > 0) {
            let oldestCouple = null;
            let oldestGeneration = Infinity;
            
            spouseRelationships.forEach(rel => {
                const person1 = this.people.find(p => p.id === rel.person1_id);
                const person2 = this.people.find(p => p.id === rel.person2_id);
                
                if (person1 && person2) {
                    const avgGeneration = (person1.generation_level + person2.generation_level) / 2;
                    if (avgGeneration < oldestGeneration) {
                        oldestGeneration = avgGeneration;
                        oldestCouple = [person1, person2];
                    }
                }
            });
            
            this.rootCouple = oldestCouple || [];
        }
    }
    
    createTreeContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="organic-tree-canvas">
                <svg id="organicTreeSVG" width="100%" height="100%" viewBox="0 0 1400 1000">
                    <defs>
                        <radialGradient id="trunkGradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#654321;stop-opacity:1" />
                        </radialGradient>
                        
                        <linearGradient id="branchGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#A0522D;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#654321;stop-opacity:1" />
                        </linearGradient>
                        
                        <radialGradient id="leafGradient" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" style="stop-color:#90EE90;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
                        </radialGradient>
                        
                        <filter id="organicShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
                        </filter>
                        
                        <filter id="leafShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
                        </filter>
                        
                        <marker id="connectionArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L0,6 L9,3 z" fill="#FFD700"/>
                        </marker>
                    </defs>
                    
                    <g id="treeStructure">
                        <path id="mainTrunk" d="M 700 950 Q 700 850 700 750" 
                              stroke="url(#trunkGradient)" stroke-width="25" fill="none" 
                              filter="url(#organicShadow)" />
                    </g>
                    
                    <g id="branchConnections"></g>
                    <g id="peopleNodes"></g>
                    
                    <line id="connectionLine" x1="0" y1="0" x2="0" y2="0" 
                          stroke="#FFD700" stroke-width="3" stroke-dasharray="5,5" 
                          opacity="0" marker-end="url(#connectionArrow)"/>
                </svg>
            </div>
            
            <div class="organic-tree-controls">
                <div class="control-group">
                    <button id="connectModeBtn" class="mode-btn">🔗 Connect Mode</button>
                    <button id="addRootBtn" class="action-btn" ${this.people.length >= 2 ? 'style="display: none;"' : ''}>
                        👫 Add Root Couple
                    </button>
                </div>
                
                <div class="zoom-controls">
                    <button id="zoomOut" class="control-btn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="control-btn">+</button>
                </div>
                
                <div class="tree-actions">
                    <button id="addPersonBtn" class="action-btn">+ Add Person</button>
                    <button id="centerTreeBtn" class="action-btn">🎯 Center</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.setupTreeInteractions();
        this.setupConnectionHandlers();
        this.setupFormHandlers();
        this.setupControlButtons();
    }
    
    setupTreeInteractions() {
        const svg = document.getElementById('organicTreeSVG');
        if (!svg) return;
        
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
            } else if (this.connectingMode && this.connectionStart) {
                this.updateConnectionLine(e);
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
    }
    
    setupConnectionHandlers() {
        document.getElementById('connectModeBtn')?.addEventListener('click', () => {
            this.connectingMode = !this.connectingMode;
            this.updateConnectionMode();
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
        
        // Make the toolbar Add Person button work
        document.getElementById('addPersonBtn')?.addEventListener('click', () => {
            console.log('Toolbar Add Person button clicked');
            this.openAddPersonModal();
        });
        
        document.getElementById('addRootBtn')?.addEventListener('click', () => {
            this.openAddRootCoupleModal();
        });
        
        // Settings button
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            alert('Tree settings feature coming soon! This will let you change tree style, colors, and display options.');
        });
    }
    
    setupFormHandlers() {
        // Add Person Form
        const addPersonForm = document.getElementById('addPersonForm');
        if (addPersonForm) {
            addPersonForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Add person form submitted');
                
                const formData = {
                    family_code: this.familyCode,
                    first_name: document.getElementById('firstName').value,
                    last_name: document.getElementById('lastName').value || '',
                    birth_date: document.getElementById('birthDate').value || null,
                    gender: document.getElementById('gender').value || '',
                    is_living: document.getElementById('isLiving') ? document.getElementById('isLiving').value === 'true' : true,
                    generation_level: this.calculateGenerationLevel()
                };
                
                console.log('Form data:', formData);
                await this.addPerson(formData);
            });
        }
        
        // Close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
    
    updateConnectionMode() {
        const btn = document.getElementById('connectModeBtn');
        const svg = document.getElementById('organicTreeSVG');
        
        if (this.connectingMode) {
            btn.textContent = '❌ Exit Connect Mode';
            btn.classList.add('active');
            svg.style.cursor = 'crosshair';
            this.showConnectionHints();
        } else {
            btn.textContent = '🔗 Connect Mode';
            btn.classList.remove('active');
            svg.style.cursor = 'grab';
            this.hideConnectionHints();
            this.connectionStart = null;
            this.hideConnectionLine();
        }
    }
    
    showConnectionHints() {
        document.querySelectorAll('.person-node').forEach(node => {
            node.classList.add('connectable');
        });
    }
    
    hideConnectionHints() {
        document.querySelectorAll('.person-node').forEach(node => {
            node.classList.remove('connectable');
        });
    }
    
    updateConnectionLine(event) {
        const svg = document.getElementById('organicTreeSVG');
        const line = document.getElementById('connectionLine');
        const rect = svg.getBoundingClientRect();
        
        const startNode = document.querySelector(`[data-person-id="${this.connectionStart.id}"]`);
        if (!startNode) return;
        
        const transform = startNode.getAttribute('transform');
        const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
        
        if (translateMatch) {
            const startX = parseFloat(translateMatch[1]);
            const startY = parseFloat(translateMatch[2]);
            const endX = (event.clientX - rect.left - this.panX) / this.scale;
            const endY = (event.clientY - rect.top - this.panY) / this.scale;
            
            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', endY);
            line.setAttribute('opacity', '1');
        }
    }
    
    hideConnectionLine() {
        const line = document.getElementById('connectionLine');
        line.setAttribute('opacity', '0');
    }
    
    renderTree() {
        if (this.people.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        this.calculateOrganicLayout();
        this.renderTreeStructure();
        this.renderPeople();
        this.renderConnections();
        this.centerTree();
    }
    
    renderEmptyState() {
        const peopleContainer = document.getElementById('peopleNodes');
        if (!peopleContainer) return;
        
        peopleContainer.innerHTML = `
            <text x="700" y="400" text-anchor="middle" font-family="Georgia, serif" 
                  font-size="24" fill="#8B4513" font-weight="bold">
                🌱 Plant your family tree
            </text>
            <text x="700" y="430" text-anchor="middle" font-family="Georgia, serif" 
                  font-size="16" fill="#666">
                Start by adding your root couple
            </text>
        `;
    }
    
    calculateOrganicLayout() {
        if (this.people.length === 0) return;
        
        const generations = {};
        
        this.people.forEach(person => {
            const level = person.generation_level || 0;
            if (!generations[level]) generations[level] = [];
            generations[level].push(person);
        });
        
        const baseY = 800;
        const generationHeight = 120;
        const centerX = 700;
        
        Object.keys(generations).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            const levelNum = parseInt(level);
            const people = generations[level];
            const y = baseY - (levelNum * generationHeight);
            
            this.positionGeneration(people, centerX, y, levelNum);
        });
    }
    
    positionGeneration(people, centerX, y, generationLevel) {
        if (people.length === 1) {
            people[0].x = centerX;
            people[0].y = y;
            return;
        }
        
        if (generationLevel === 0 && people.length === 2) {
            people[0].x = centerX - 60;
            people[0].y = y;
            people[1].x = centerX + 60;
            people[1].y = y;
            return;
        }
        
        const spacing = Math.max(140, 800 / Math.max(people.length, 1));
        const startX = centerX - ((people.length - 1) * spacing) / 2;
        
        people.forEach((person, index) => {
            person.x = startX + (index * spacing);
            person.y = y;
        });
    }
    
    renderTreeStructure() {
        const treeStructure = document.getElementById('treeStructure');
        if (!treeStructure) return;
        
        const existingBranches = treeStructure.querySelectorAll('.organic-branch');
        existingBranches.forEach(branch => branch.remove());
        
        this.drawOrganicBranches();
    }
    
    drawOrganicBranches() {
        const treeStructure = document.getElementById('treeStructure');
        const parentChildRels = this.relationships.filter(rel => rel.relationship_type === 'parent');
        
        parentChildRels.forEach(rel => {
            const parent = this.people.find(p => p.id === rel.person1_id);
            const child = this.people.find(p => p.id === rel.person2_id);
            
            if (parent && child && parent.x !== undefined && child.x !== undefined) {
                this.createOrganicBranch(parent, child, treeStructure);
            }
        });
    }
    
    createOrganicBranch(parent, child, container) {
        const controlPoint1X = parent.x + (child.x - parent.x) * 0.3;
        const controlPoint1Y = parent.y - 30;
        const controlPoint2X = parent.x + (child.x - parent.x) * 0.7;
        const controlPoint2Y = child.y + 30;
        
        const branchPath = `M ${parent.x} ${parent.y - 30} 
                           C ${controlPoint1X} ${controlPoint1Y} 
                             ${controlPoint2X} ${controlPoint2Y} 
                             ${child.x} ${child.y + 30}`;
        
        const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        branch.setAttribute('d', branchPath);
        branch.setAttribute('stroke', 'url(#branchGradient)');
        branch.setAttribute('stroke-width', '8');
        branch.setAttribute('fill', 'none');
        branch.setAttribute('class', 'organic-branch');
        branch.setAttribute('filter', 'url(#organicShadow)');
        
        const pathLength = branch.getTotalLength();
        branch.style.strokeDasharray = pathLength;
        branch.style.strokeDashoffset = pathLength;
        branch.style.animation = 'growBranch 1s ease-out forwards';
        
        container.appendChild(branch);
    }
    
    renderPeople() {
        const peopleContainer = document.getElementById('peopleNodes');
        if (!peopleContainer) return;
        
        peopleContainer.innerHTML = '';
        
        this.people.forEach(person => {
            if (person.x !== undefined && person.y !== undefined) {
                const personGroup = this.createOrganicPersonNode(person);
                peopleContainer.appendChild(personGroup);
            }
        });
    }
    
    createOrganicPersonNode(person) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node organic-person');
        group.setAttribute('data-person-id', person.id);
        group.setAttribute('transform', `translate(${person.x}, ${person.y})`);
        group.style.cursor = 'pointer';
        
        const leaf = this.createLeafShape();
        leaf.setAttribute('fill', 'url(#leafGradient)');
        leaf.setAttribute('stroke', this.getPersonColor(person));
        leaf.setAttribute('stroke-width', '3');
        leaf.setAttribute('filter', 'url(#leafShadow)');
        group.appendChild(leaf);
        
        if (person.has_photo) {
            const photoCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            photoCircle.setAttribute('cx', '0');
            photoCircle.setAttribute('cy', '0');
            photoCircle.setAttribute('r', '25');
            photoCircle.setAttribute('fill', `url(#photo-${person.id})`);
            
            this.createPhotoPattern(person.id);
            group.appendChild(photoCircle);
        } else {
            const initials = this.getInitials(person.first_name, person.last_name);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', '5');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'Georgia, serif');
            text.setAttribute('font-size', '18');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#2F4F2F');
            text.textContent = initials;
            group.appendChild(text);
        }
        
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', '0');
        nameText.setAttribute('y', '65');
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-family', 'Georgia, serif');
        nameText.setAttribute('font-size', '14');
        nameText.setAttribute('font-weight', 'bold');
        nameText.setAttribute('fill', '#8B4513');
        nameText.textContent = person.full_name;
        group.appendChild(nameText);
        
        if (person.birth_date || person.death_date) {
            const dates = this.formatDateRange(person.birth_date, person.death_date, person.is_living);
            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', '0');
            dateText.setAttribute('y', '80');
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-family', 'Georgia, serif');
            dateText.setAttribute('font-size', '11');
            dateText.setAttribute('fill', '#666');
            dateText.textContent = dates;
            group.appendChild(dateText);
        }
        
        this.setupPersonInteractions(group, person);
        return group;
    }
    
    createLeafShape() {
        const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const leafPath = 'M 0,-40 C -25,-35 -35,-10 -30,10 C -25,25 -10,35 0,40 C 10,35 25,25 30,10 C 35,-10 25,-35 0,-40 Z';
        leaf.setAttribute('d', leafPath);
        return leaf;
    }
    
    setupPersonInteractions(group, person) {
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.connectingMode) {
                this.handleConnectionClick(person);
            } else {
                this.selectPerson(person);
            }
        });
        
        group.addEventListener('mouseenter', () => {
            group.style.transform = group.getAttribute('transform') + ' scale(1.1)';
            group.style.filter = 'brightness(1.1)';
        });
        
        group.addEventListener('mouseleave', () => {
            group.style.transform = group.getAttribute('transform');
            group.style.filter = 'brightness(1)';
        });
        
        let isDragging = false;
        
        group.addEventListener('mousedown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                isDragging = true;
                this.connectionStart = person;
                e.preventDefault();
            }
        });
        
        group.addEventListener('mouseup', (e) => {
            if (isDragging && this.connectionStart && this.connectionStart.id !== person.id) {
                this.showRelationshipModal(this.connectionStart, person);
                isDragging = false;
                this.connectionStart = null;
                this.hideConnectionLine();
            }
        });
    }
    
    handleConnectionClick(person) {
        if (!this.connectionStart) {
            this.connectionStart = person;
            this.highlightPerson(person, 'connection-start');
        } else if (this.connectionStart.id === person.id) {
            this.connectionStart = null;
            this.clearHighlights();
            this.hideConnectionLine();
        } else {
            this.showRelationshipModal(this.connectionStart, person);
            this.clearHighlights();
            this.hideConnectionLine();
        }
    }
    
    highlightPerson(person, className) {
        const node = document.querySelector(`[data-person-id="${person.id}"]`);
        if (node) {
            node.classList.add(className);
        }
    }
    
    clearHighlights() {
        document.querySelectorAll('.person-node').forEach(node => {
            node.classList.remove('connection-start', 'connection-end');
        });
    }
    
    showRelationshipModal(person1, person2) {
        this.createRelationshipModal(person1, person2);
    }
    
    createRelationshipModal(person1, person2) {
        const existingModal = document.getElementById('relationshipModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'relationshipModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content relationship-modal">
                <span class="close">&times;</span>
                <h2>Connect Family Members</h2>
                
                <div class="relationship-persons">
                    <div class="relationship-person">
                        <div class="name">${person1.full_name}</div>
                        <div class="details">${this.formatDateRange(person1.birth_date, person1.death_date, person1.is_living)}</div>
                    </div>
                    <div class="relationship-arrow">🔗</div>
                    <div class="relationship-person">
                        <div class="name">${person2.full_name}</div>
                        <div class="details">${this.formatDateRange(person2.birth_date, person2.death_date, person2.is_living)}</div>
                    </div>
                </div>
                
                <p style="margin: 20px 0; color: #666; font-size: 16px;">
                    How is <strong>${person1.first_name}</strong> related to <strong>${person2.first_name}</strong>?
                </p>
                
                <div class="relationship-options">
                    <button class="relationship-btn" data-relation="spouse">
                        💑 Spouse/Partner
                    </button>
                    <button class="relationship-btn" data-relation="parent">
                        👨‍👧‍👦 ${person1.first_name} is ${person2.first_name}'s Parent
                    </button>
                    <button class="relationship-btn" data-relation="child">
                        👶 ${person1.first_name} is ${person2.first_name}'s Child
                    </button>
                    <button class="relationship-btn" data-relation="sibling">
                        👫 Siblings
                    </button>
                    <button class="relationship-btn extended" data-relation="grandparent">
                        👴 ${person1.first_name} is ${person2.first_name}'s Grandparent
                    </button>
                    <button class="relationship-btn extended" data-relation="grandchild">
                        👧 ${person1.first_name} is ${person2.first_name}'s Grandchild
                    </button>
                    <button class="relationship-btn extended" data-relation="aunt_uncle">
                        👩‍🦳 Aunt/Uncle & Niece/Nephew
                    </button>
                    <button class="relationship-btn extended" data-relation="cousin">
                        👥 Cousins
                    </button>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button class="btn secondary" onclick="document.getElementById('relationshipModal').style.display='none'">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
            this.connectionStart = null;
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.connectionStart = null;
            }
        });
        
        modal.querySelectorAll('.relationship-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const relationType = btn.getAttribute('data-relation');
                await this.createRelationship(person1, person2, relationType);
                modal.style.display = 'none';
                this.connectionStart = null;
                this.connectingMode = false;
                this.updateConnectionMode();
            });
        });
    }
    
    async createRelationship(person1, person2, relationType) {
        try {
            const relationshipData = {
                family_code: this.familyCode,
                person1_id: person1.id,
                person2_id: person2.id,
                relationship_type: relationType
            };
            
            const response = await fetch('/familyTimeline/api/relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relationshipData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Relationship created:', result);
                
                await this.loadTreeData();
                this.renderTree();
                
                this.showSuccessMessage(`Connected ${person1.first_name} and ${person2.first_name}!`);
            } else {
                throw new Error('Failed to create relationship');
            }
        } catch (error) {
            console.error('Error creating relationship:', error);
            alert('Error creating relationship. Please try again.');
        }
    }
    
    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(45deg, #4CAF50, #2E7D32);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(76,175,80,0.3);
            z-index: 3000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    calculateGenerationLevel() {
        if (this.people.length === 0) return 0;
        if (this.people.length === 1) return 0;
        
        const maxGeneration = Math.max(...this.people.map(p => p.generation_level || 0));
        return maxGeneration + 1;
    }
    
    async addPerson(personData) {
        console.log('Adding person:', personData);
        try {
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);
            
            if (response.ok && result.success) {
                console.log('Person added successfully!');
                await this.loadTreeData();
                this.renderTree();
                document.getElementById('addPersonModal').style.display = 'none';
                document.getElementById('addPersonForm').reset();
                this.showSuccessMessage(`${personData.first_name} added to the family tree!`);
                
                if (this.people.length >= 2) {
                    const addRootBtn = document.getElementById('addRootBtn');
                    if (addRootBtn) addRootBtn.style.display = 'none';
                }
            } else {
                console.error('Error adding person:', result);
                alert('Error adding person: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Network error adding person:', error);
            alert('Network error. Please check your connection and try again.');
        }
    }
    
    openAddPersonModal() {
        const existingModal = document.getElementById('addPersonModal');
        if (existingModal) {
            existingModal.style.display = 'block';
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'addPersonModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>🌱 Add New Family Member</h2>
                <form id="addPersonForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="firstName">First Name *</label>
                            <input type="text" id="firstName" required>
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="birthDate">Birth Date</label>
                            <input type="date" id="birthDate">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select id="gender">
                                <option value="">Select...</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="isLiving">Status</label>
                        <select id="isLiving">
                            <option value="true">Living</option>
                            <option value="false">Deceased</option>
                        </select>
                    </div>
                    
                    <div class="form-actions" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                        <button type="submit" class="btn primary">🌳 Add to Tree</button>
                        <button type="button" class="btn secondary" onclick="document.getElementById('addPersonModal').style.display='none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        this.setupFormHandlers();
    }
    
    openAddRootCoupleModal() {
        alert('Add Root Couple feature coming soon! For now, add two people individually and then connect them as spouses.');
        this.openAddPersonModal();
    }
    
    selectPerson(person) {
        this.selectedPerson = person;
        this.openPersonModal(person);
    }
    
    async openPersonModal(person) {
        // Remove existing modal if present
        const existingModal = document.getElementById('personModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create person details modal
        const modal = document.createElement('div');
        modal.id = 'personModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <span class="close">&times;</span>
                <div class="person-header">
                    <div class="person-info">
                        <h2 id="personModalName">${person.full_name}</h2>
                        <div id="personModalDetails" class="person-details">
                            ${this.formatPersonDetails(person)}
                        </div>
                    </div>
                    <div class="person-actions">
                        <button id="addStoryBtn" class="btn primary">+ Add Story</button>
                        <button id="editPersonBtn" class="btn secondary">Edit Person</button>
                    </div>
                </div>
                
                <div class="modal-tabs">
                    <button class="tab-btn active" data-tab="stories">Stories</button>
                    <button class="tab-btn" data-tab="timeline">Life Timeline</button>
                    <button class="tab-btn" data-tab="family">Family Connections</button>
                </div>
                
                <div class="tab-content">
                    <div id="tab-stories" class="tab-panel active">
                        <div id="personStories" class="stories-container">
                            <div class="loading-stories">Loading stories...</div>
                        </div>
                    </div>
                    
                    <div id="tab-timeline" class="tab-panel">
                        <div id="personTimeline" class="timeline-container">
                            <p style="text-align: center; color: #666; padding: 40px;">
                                Timeline view coming soon! This will show ${person.first_name}'s life events in chronological order.
                            </p>
                        </div>
                    </div>
                    
                    <div id="tab-family" class="tab-panel">
                        <div id="personFamily" class="family-connections">
                            ${this.renderFamilyConnections(person)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Setup modal event listeners
        this.setupPersonModalHandlers(modal, person);
        
        // Load person's stories
        await this.loadPersonStories(person.id);
    }
    
    formatPersonDetails(person) {
        let details = [];
        
        if (person.birth_date || person.is_living) {
            details.push(this.formatDateRange(person.birth_date, person.death_date, person.is_living));
        }
        
        if (person.birth_place) {
            details.push(`Born in ${person.birth_place}`);
        }
        
        if (person.bio_summary) {
            details.push(person.bio_summary);
        }
        
        return details.join(' • ') || 'No additional details available';
    }
    
    renderFamilyConnections(person) {
        const connections = this.relationships.filter(rel => 
            rel.person1_id === person.id || rel.person2_id === person.id
        );
        
        if (connections.length === 0) {
            return '<p style="text-align: center; color: #666; padding: 40px;">No family connections yet. Use Connect Mode to add relationships!</p>';
        }
        
        let html = '<div class="family-connections-list">';
        
        connections.forEach(rel => {
            const otherPersonId = rel.person1_id === person.id ? rel.person2_id : rel.person1_id;
            const otherPerson = this.people.find(p => p.id === otherPersonId);
            
            if (otherPerson) {
                const relationshipLabel = this.getRelationshipLabel(rel.relationship_type, rel.person1_id === person.id);
                html += `
                    <div class="connection-item">
                        <div class="connection-type">${relationshipLabel}</div>
                        <div class="connection-person">${otherPerson.full_name}</div>
                        <div class="connection-details">${this.formatDateRange(otherPerson.birth_date, otherPerson.death_date, otherPerson.is_living)}</div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    getRelationshipLabel(relType, isFirstPerson) {
        const labels = {
            'spouse': 'Spouse',
            'parent': isFirstPerson ? 'Child' : 'Parent',
            'child': isFirstPerson ? 'Parent' : 'Child', 
            'sibling': 'Sibling',
            'grandparent': isFirstPerson ? 'Grandchild' : 'Grandparent',
            'grandchild': isFirstPerson ? 'Grandparent' : 'Grandchild',
            'aunt_uncle': isFirstPerson ? 'Niece/Nephew' : 'Aunt/Uncle',
            'cousin': 'Cousin'
        };
        return labels[relType] || relType;
    }
    
    setupPersonModalHandlers(modal, person) {
        // Close button
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
        
        // Add Story button
        modal.querySelector('#addStoryBtn').addEventListener('click', () => {
            this.openAddStoryModal(person);
        });
        
        // Edit Person button
        modal.querySelector('#editPersonBtn').addEventListener('click', () => {
            alert('Edit person feature coming soon!');
        });
    }
    
    switchTab(targetTab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
        
        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`tab-${targetTab}`).classList.add('active');
    }
    
    async loadPersonStories(personId) {
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}/stories`);
            const data = await response.json();
            this.displayPersonStories(data.stories || []);
        } catch (error) {
            console.error('Error loading person stories:', error);
            this.displayPersonStories([]); // Show empty state on error
        }
    }
    
    displayPersonStories(stories) {
        const container = document.getElementById('personStories');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (stories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3 style="margin-bottom: 15px;">No stories yet</h3>
                    <p style="margin-bottom: 20px;">Be the first to share a memory about ${this.selectedPerson ? this.selectedPerson.first_name : 'this person'}!</p>
                    <button id="addFirstStoryBtn" class="btn primary">Add Their First Story</button>
                </div>
            `;
            
            document.getElementById('addFirstStoryBtn')?.addEventListener('click', () => {
                this.openAddStoryModal(this.selectedPerson);
            });
            return;
        }
        
        // Group stories by theme
        const storiesByTheme = {};
        stories.forEach(story => {
            if (!storiesByTheme[story.theme]) {
                storiesByTheme[story.theme] = [];
            }
            storiesByTheme[story.theme].push(story);
        });
        
        // Render stories grouped by theme
        Object.keys(storiesByTheme).forEach(theme => {
            const themeSection = document.createElement('div');
            themeSection.className = 'theme-section';
            themeSection.innerHTML = `
                <h3 class="theme-header">${theme}</h3>
                <div class="theme-stories"></div>
            `;
            
            const themeStoriesContainer = themeSection.querySelector('.theme-stories');
            
            storiesByTheme[theme].forEach(story => {
                const storyDiv = this.createStoryElement(story);
                themeStoriesContainer.appendChild(storyDiv);
            });
            
            container.appendChild(themeSection);
        });
    }
    
    createStoryElement(story) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story-item';
        if (story.is_featured) {
            storyDiv.classList.add('featured');
        }
        
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
                    ${story.time_period ? `<span class="story-period">${story.time_period}</span>` : ''}
                    ${story.year_occurred ? `<span class="story-year">${story.year_occurred}</span>` : ''}
                    ${story.is_featured ? '<span class="story-featured">⭐ Featured</span>' : ''}
                </div>
            </div>
            <div class="story-author">Story by: ${story.author_name}</div>
            <div class="story-date">Added ${new Date(story.created_at).toLocaleDateString()}</div>
            ${questionsHtml}
            <div class="story-text">${story.story_text}</div>
            ${story.has_photo ? `<img src="/familyTimeline/api/story-photo/${story.id}" class="story-photo" alt="Story photo">` : ''}
        `;
        
        return storyDiv;
    }
    
    async openAddStoryModal(person) {
        // Remove existing modal if present
        const existingModal = document.getElementById('addStoryModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Load themes first
        await this.loadThemes();
        
        // Create add story modal
        const modal = document.createElement('div');
        modal.id = 'addStoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <span class="close">&times;</span>
                <h2>Add Story for ${person.first_name}</h2>
                <form id="addStoryForm">
                    <input type="hidden" id="storyPersonId" value="${person.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="storyTitle">Story Title *</label>
                            <input type="text" id="storyTitle" required placeholder="Give your story a memorable title...">
                        </div>
                        <div class="form-group">
                            <label for="storyAuthor">Author (Your Name) *</label>
                            <input type="text" id="storyAuthor" required placeholder="Who is telling this story?">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="storyTheme">Theme *</label>
                            <select id="storyTheme" required>
                                <option value="">Select a theme...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="timePeriod">Time Period</label>
                            <input type="text" id="timePeriod" placeholder="e.g., Childhood, 1950s, College Years">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="yearOccurred">Year (approximate)</label>
                        <input type="number" id="yearOccurred" min="1900" max="2030" placeholder="When did this happen?">
                    </div>
                    
                    <div class="form-group" id="storyQuestionsGroup" style="display: none;">
                        <label>Guided Questions (optional - select ones you'd like to answer)</label>
                        <div id="storyQuestions" class="theme-questions"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="storyText">Your Story *</label>
                        <textarea id="storyText" rows="8" required placeholder="Tell the story here..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="storyPhoto">Add Photo</label>
                        <input type="file" id="storyPhoto" accept="image/*">
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="isFeatured"> 
                            Featured Story (highlight this story)
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn primary">Save Story</button>
                        <button type="button" class="btn secondary" onclick="document.getElementById('addStoryModal').style.display='none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Populate themes
        this.populateStoryThemes();
        
        // Setup story modal handlers
        this.setupStoryModalHandlers(modal, person);
    }
    
    async loadThemes() {
        try {
            const response = await fetch('/familyTimeline/api/themes');
            const data = await response.json();
            this.themes = data.themes || [];
        } catch (error) {
            console.error('Error loading themes:', error);
            this.themes = [];
        }
    }
    
    populateStoryThemes() {
        const select = document.getElementById('storyTheme');
        if (!select) return;
        
        // Clear existing options except first
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add theme options
        this.themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.key;
            option.textContent = theme.name;
            select.appendChild(option);
        });
    }
    
    setupStoryModalHandlers(modal, person) {
        // Close button
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Theme change handler
        document.getElementById('storyTheme')?.addEventListener('change', async (e) => {
            await this.handleThemeChange(e.target.value);
        });
        
        // Form submission
        document.getElementById('addStoryForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleStorySubmission(person);
        });
    }
    
    async handleThemeChange(selectedTheme) {
        const questionsGroup = document.getElementById('storyQuestionsGroup');
        const questionsContainer = document.getElementById('storyQuestions');
        
        if (!questionsGroup || !questionsContainer) return;
        
        if (selectedTheme) {
            try {
                const response = await fetch(`/familyTimeline/api/themes/${selectedTheme}/questions`);
                const data = await response.json();
                
                questionsContainer.innerHTML = '';
                
                data.questions.forEach(question => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'question-option';
                    
                    questionDiv.innerHTML = `
                        <label>
                            <input type="checkbox" name="themeQuestions" value="${question.id}" data-question="${question.text}">
                            <span class="question-text">${question.text}</span>
                        </label>
                        <div class="answer-input" style="display: none;">
                            <textarea placeholder="Your answer..." rows="3"></textarea>
                        </div>
                    `;
                    
                    questionsContainer.appendChild(questionDiv);
                    
                    // Add checkbox handler
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
                });
                
                questionsGroup.style.display = 'block';
            } catch (error) {
                console.error('Error loading theme questions:', error);
            }
        } else {
            questionsGroup.style.display = 'none';
        }
    }
    
    async handleStorySubmission(person) {
        // Collect form data
        const formData = {
            person_id: person.id,
            title: document.getElementById('storyTitle').value,
            author_name: document.getElementById('storyAuthor').value,
            theme: this.getThemeName(document.getElementById('storyTheme').value),
            time_period: document.getElementById('timePeriod').value || null,
            year_occurred: parseInt(document.getElementById('yearOccurred').value) || null,
            story_text: document.getElementById('storyText').value,
            is_featured: document.getElementById('isFeatured').checked
        };
        
        // Collect questions and answers
        const questionsAndAnswers = [];
        const selectedQuestions = document.querySelectorAll('input[name="themeQuestions"]:checked');
        
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
        
        formData.questions_and_answers = questionsAndAnswers;
        
        // Handle photo if present
        const photoFile = document.getElementById('storyPhoto').files[0];
        if (photoFile) {
            formData.photo_data = await this.fileToBase64(photoFile);
            formData.photo_filename = photoFile.name;
        }
        
        // Submit story
        await this.saveStory(formData);
    }
    
    getThemeName(themeKey) {
        const theme = this.themes.find(t => t.key === themeKey);
        return theme ? theme.name : themeKey;
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    async saveStory(storyData) {
        try {
            const response = await fetch('/familyTimeline/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    family_code: this.familyCode,
                    ...storyData
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Story saved:', result);
                
                // Close modal and refresh stories
                document.getElementById('addStoryModal').style.display = 'none';
                await this.loadPersonStories(storyData.person_id);
                
                this.showSuccessMessage('Story saved successfully!');
            } else {
                throw new Error('Failed to save story');
            }
        } catch (error) {
            console.error('Error saving story:', error);
            alert('Error saving story. Please try again.');
        }
    }
    
    createPhotoPattern(personId) {
        const defs = document.querySelector('defs');
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', `photo-${personId}`);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', '50');
        pattern.setAttribute('height', '50');
        
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', `/familyTimeline/api/person-photo/${personId}`);
        image.setAttribute('width', '50');
        image.setAttribute('height', '50');
        image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        
        pattern.appendChild(image);
        defs.appendChild(pattern);
    }
    
    renderConnections() {
        const connectionsContainer = document.getElementById('branchConnections');
        if (!connectionsContainer) return;
        
        connectionsContainer.innerHTML = '';
        
        const spouseRelationships = this.relationships.filter(rel => rel.relationship_type === 'spouse');
        
        spouseRelationships.forEach(rel => {
            const person1 = this.people.find(p => p.id === rel.person1_id);
            const person2 = this.people.find(p => p.id === rel.person2_id);
            
            if (person1 && person2 && person1.x !== undefined && person2.x !== undefined) {
                this.createMarriageConnection(person1, person2, connectionsContainer);
            }
        });
    }
    
    createMarriageConnection(person1, person2, container) {
        const midX = (person1.x + person2.x) / 2;
        const midY = (person1.y + person2.y) / 2 - 20;
        
        const marriagePath = `M ${person1.x} ${person1.y} Q ${midX} ${midY} ${person2.x} ${person2.y}`;
        
        const marriageLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        marriageLine.setAttribute('d', marriagePath);
        marriageLine.setAttribute('stroke', '#FFD700');
        marriageLine.setAttribute('stroke-width', '4');
        marriageLine.setAttribute('fill', 'none');
        marriageLine.setAttribute('stroke-dasharray', '8,4');
        marriageLine.setAttribute('filter', 'url(#organicShadow)');
        marriageLine.setAttribute('class', 'marriage-connection');
        
        const heart = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heart.setAttribute('x', midX);
        heart.setAttribute('y', midY + 5);
        heart.setAttribute('text-anchor', 'middle');
        heart.setAttribute('font-size', '16');
        heart.setAttribute('fill', '#FFD700');
        heart.textContent = '💕';
        
        container.appendChild(marriageLine);
        container.appendChild(heart);
    }
    
    getPersonColor(person) {
        const colors = {
            male: '#4A90E2',
            female: '#E24A90', 
            other: '#9B59B6',
            unknown: '#228B22'
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
    
    updateTreeTransform() {
        const svg = document.getElementById('organicTreeSVG');
        if (svg) {
            svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
        }
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.scale * 100) + '%';
        }
    }
    
    centerTree() {
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
        this.updateTreeTransform();
        this.updateZoomDisplay();
    }
}

// Add notification animations to CSS
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
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
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes growBranch {
        to {
            stroke-dashoffset: 0;
        }
    }
    
    .person-node.connectable {
        animation: pulse 1s infinite;
    }
    
    .person-node.connection-start {
        filter: drop-shadow(0 0 10px #FFD700) brightness(1.2);
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
`;
document.head.appendChild(notificationStyle);

// Initialize the organic family tree
document.addEventListener('DOMContentLoaded', function() {
    const familyCode = new URLSearchParams(window.location.search).get('family') || window.familyCode;
    
    if (familyCode) {
        window.familyTree = new OrganicFamilyTree(familyCode);
    }
});