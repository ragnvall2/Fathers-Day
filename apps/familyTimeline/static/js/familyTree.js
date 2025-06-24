/**
 * Enhanced Organic Family Tree - Complete Version with Edit/Delete
 * 
 * REPLACE YOUR ENTIRE apps/familyTimeline/static/js/familyTree.js FILE WITH THIS CODE
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
                await this.handleAddPersonSubmit(e);
            });
        }
        
        // Edit Person Form
        const editPersonForm = document.getElementById('editPersonForm');
        if (editPersonForm) {
            editPersonForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleEditPersonSubmit(e);
            });
        }
        
        // Add Relationship Form
        const addRelationshipForm = document.getElementById('addRelationshipForm');
        if (addRelationshipForm) {
            addRelationshipForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAddRelationshipSubmit(e);
            });
        }
        
        // Story Form
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleStorySubmit(e);
            });
        }
        
        // Photo upload handlers
        this.setupPhotoUploadHandlers();
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
    
    updateConnectionMode() {
        const btn = document.getElementById('connectModeBtn');
        if (btn) {
            btn.classList.toggle('active', this.connectingMode);
            btn.textContent = this.connectingMode ? '❌ Exit Connect' : '🔗 Connect Mode';
        }
        
        if (!this.connectingMode) {
            this.connectionStart = null;
            this.hideConnectionLine();
        }
    }
    
    updateConnectionLine(e) {
        const svg = document.getElementById('organicTreeSVG');
        const rect = svg.getBoundingClientRect();
        const line = document.getElementById('connectionLine');
        
        if (line && this.connectionStart) {
            const startNode = document.querySelector(`[data-person-id="${this.connectionStart}"]`);
            if (startNode) {
                const startX = parseFloat(startNode.getAttribute('cx')) || parseFloat(startNode.getAttribute('x')) + 50;
                const startY = parseFloat(startNode.getAttribute('cy')) || parseFloat(startNode.getAttribute('y')) + 50;
                const endX = (e.clientX - rect.left) / this.scale - this.panX / this.scale;
                const endY = (e.clientY - rect.top) / this.scale - this.panY / this.scale;
                
                line.setAttribute('x1', startX);
                line.setAttribute('y1', startY);
                line.setAttribute('x2', endX);
                line.setAttribute('y2', endY);
                line.setAttribute('opacity', '1');
            }
        }
    }
    
    hideConnectionLine() {
        const line = document.getElementById('connectionLine');
        if (line) {
            line.setAttribute('opacity', '0');
        }
    }
    
    updateTreeTransform() {
        const treeStructure = document.getElementById('treeStructure');
        const branchConnections = document.getElementById('branchConnections');
        const peopleNodes = document.getElementById('peopleNodes');
        
        const transform = `translate(${this.panX}, ${this.panY}) scale(${this.scale})`;
        
        if (treeStructure) treeStructure.setAttribute('transform', transform);
        if (branchConnections) branchConnections.setAttribute('transform', transform);
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
        if (this.people.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        this.clearTree();
        this.identifyRootCouple();
        this.calculateOrganicTreeLayout();
        this.renderOrganicTrunk();
        this.renderOrganicBranches();
        this.renderPeople();
        this.addNatureDecorations();
    }
    
    clearTree() {
        const peopleNodes = document.getElementById('peopleNodes');
        const branchConnections = document.getElementById('branchConnections');
        
        if (peopleNodes) peopleNodes.innerHTML = '';
        if (branchConnections) branchConnections.innerHTML = '';
    }

    calculateOrganicTreeLayout() {
        // Create generation mapping
        const generations = this.buildGenerationHierarchy();
        
        // Position root couple in trunk
        this.positionRootCouple();
        
        // Position each generation on branches
        Object.keys(generations).forEach(gen => {
            const genLevel = parseInt(gen);
            if (genLevel > 0) { // Skip root generation (gen 0)
                this.positionGeneration(generations[gen], genLevel);
            }
        });
    }
    
    positionPeople() {
        // Create generation groups
        const generations = {};
        
        this.people.forEach(person => {
            const gen = person.generation_level || 0;
            if (!generations[gen]) generations[gen] = [];
            generations[gen].push(person);
        });
        
        // Position people in organic tree layout
        Object.keys(generations).forEach(gen => {
            const genLevel = parseInt(gen);
            const people = generations[gen];
            const baseY = 800 - (genLevel * 150); // Older generations higher
            
            people.forEach((person, index) => {
                const totalWidth = Math.max(people.length * 200, 400);
                const startX = 700 - (totalWidth / 2);
                const x = startX + (index * (totalWidth / people.length)) + Math.random() * 40 - 20;
                const y = baseY + Math.random() * 40 - 20;
                
                person.x = x;
                person.y = y;
            });
        });
        
        // Special positioning for root couple if they exist
        if (this.rootCouple.length === 2) {
            this.rootCouple[0].x = 650 + Math.random() * 20 - 10;
            this.rootCouple[0].y = 750 + Math.random() * 20 - 10;
            this.rootCouple[1].x = 750 + Math.random() * 20 - 10;
            this.rootCouple[1].y = 750 + Math.random() * 20 - 10;
        }
    }
    
    renderBranches() {
        const branchConnections = document.getElementById('branchConnections');
        if (!branchConnections) return;
        
        // Draw organic branches for parent-child relationships
        this.relationships.forEach(rel => {
            if (rel.relationship_type === 'child') {
                const parent = this.people.find(p => p.id === rel.person1_id);
                const child = this.people.find(p => p.id === rel.person2_id);
                
                if (parent && child) {
                    this.drawOrganicBranch(branchConnections, parent, child);
                }
            }
        });
        
        // Draw marriage connections as gentle curves
        this.relationships.forEach(rel => {
            if (rel.relationship_type === 'spouse') {
                const person1 = this.people.find(p => p.id === rel.person1_id);
                const person2 = this.people.find(p => p.id === rel.person2_id);
                
                if (person1 && person2) {
                    this.drawMarriageConnection(branchConnections, person1, person2);
                }
            }
        });
    }
    
    drawOrganicBranch(container, parent, child) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const startX = parent.x;
        const startY = parent.y + 40;
        const endX = child.x;
        const endY = child.y - 40;
        
        const midY = startY + (endY - startY) * 0.7;
        const controlX1 = startX + Math.random() * 60 - 30;
        const controlY1 = midY + Math.random() * 40 - 20;
        const controlX2 = endX + Math.random() * 60 - 30;
        const controlY2 = midY + Math.random() * 40 - 20;
        
        const d = `M ${startX} ${startY} 
                   C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'url(#branchGradient)');
        path.setAttribute('stroke-width', Math.random() * 4 + 6);
        path.setAttribute('fill', 'none');
        path.setAttribute('filter', 'url(#organicShadow)');
        path.setAttribute('opacity', '0.8');
        
        container.appendChild(path);
    }
    
    drawMarriageConnection(container, person1, person2) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const startX = person1.x;
        const startY = person1.y;
        const endX = person2.x;
        const endY = person2.y;
        
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 - 30;
        
        const d = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#FFD700');
        path.setAttribute('stroke-width', '4');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.7');
        path.setAttribute('stroke-dasharray', '8,4');
        
        container.appendChild(path);
    }
    
    renderPeople() {
        const peopleNodes = document.getElementById('peopleNodes');
        if (!peopleNodes) return;
        
        this.people.forEach(person => {
            this.createPersonNode(peopleNodes, person);
        });
    }
    
    createPersonNode(container, person) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.style.cursor = 'pointer';
        
        // Create organic leaf shape
        const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        leaf.setAttribute('cx', person.x);
        leaf.setAttribute('cy', person.y);
        leaf.setAttribute('rx', '45');
        leaf.setAttribute('ry', '35');
        leaf.setAttribute('fill', 'url(#leafGradient)');
        leaf.setAttribute('stroke', '#228B22');
        leaf.setAttribute('stroke-width', '2');
        leaf.setAttribute('filter', 'url(#leafShadow)');
        leaf.setAttribute('transform', `rotate(${Math.random() * 30 - 15} ${person.x} ${person.y})`);
        
        // Person photo or initial
        if (person.has_photo) {
            const photo = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            photo.setAttribute('x', person.x - 25);
            photo.setAttribute('y', person.y - 25);
            photo.setAttribute('width', '50');
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
        
        // Event handlers
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.connectingMode) {
                this.handleConnectionClick(person.id);
            } else {
                this.showPersonDetails(person.id);
            }
        });
        
        container.appendChild(group);
    }
    
    handleConnectionClick(personId) {
        if (!this.connectionStart) {
            this.connectionStart = personId;
            this.highlightPersonForConnection(personId);
        } else if (this.connectionStart !== personId) {
            this.openRelationshipModal(this.connectionStart, personId);
            this.connectionStart = null;
            this.connectingMode = false;
            this.updateConnectionMode();
            this.hideConnectionLine();
            this.removeConnectionHighlight();
        }
    }
    
    highlightPersonForConnection(personId) {
        const node = document.querySelector(`[data-person-id="${personId}"]`);
        if (node) {
            node.classList.add('connection-start');
        }
    }
    
    removeConnectionHighlight() {
        document.querySelectorAll('.connection-start').forEach(node => {
            node.classList.remove('connection-start');
        });
    }
    
    addDecorations() {
        // Add some decorative elements to make the tree more organic
        const treeStructure = document.getElementById('treeStructure');
        if (!treeStructure) return;
        
        // Add small birds
        for (let i = 0; i < 3; i++) {
            const bird = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bird.setAttribute('x', 200 + Math.random() * 1000);
            bird.setAttribute('y', 100 + Math.random() * 200);
            bird.setAttribute('font-size', '16');
            bird.setAttribute('fill', '#4169E1');
            bird.textContent = '🐦';
            bird.style.opacity = '0.6';
            treeStructure.appendChild(bird);
        }
        
        // Add floating leaves
        for (let i = 0; i < 5; i++) {
            const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            leaf.setAttribute('x', 100 + Math.random() * 1200);
            leaf.setAttribute('y', 50 + Math.random() * 300);
            leaf.setAttribute('font-size', '14');
            leaf.setAttribute('fill', '#32CD32');
            leaf.textContent = '🍃';
            leaf.style.opacity = '0.4';
            treeStructure.appendChild(leaf);
        }
    }
    
    renderEmptyState() {
        const peopleNodes = document.getElementById('peopleNodes');
        if (!peopleNodes) return;
        
        const emptyMessage = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        emptyMessage.setAttribute('x', '700');
        emptyMessage.setAttribute('y', '400');
        emptyMessage.setAttribute('text-anchor', 'middle');
        emptyMessage.setAttribute('font-family', 'Arial, sans-serif');
        emptyMessage.setAttribute('font-size', '24');
        emptyMessage.setAttribute('fill', '#8B7355');
        emptyMessage.textContent = 'Your family tree is ready to grow! Click "Add Person" to start.';
        
        peopleNodes.appendChild(emptyMessage);
    }
    
    // Modal and form handling methods
    
    openAddPersonModal() {
        console.log('Opening Add Person modal');
        const modal = document.getElementById('addPersonModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('addPersonPhoto').value = '';
            document.getElementById('addPersonPhotoPreview').style.display = 'none';
            document.getElementById('addPersonForm').reset();
        }
    }
    
    // ===== NEW EDIT PERSON FUNCTIONALITY =====
    openEditPersonModal(personId) {
        console.log('Opening Edit Person modal for ID:', personId);
        const modal = document.getElementById('editPersonModal');
        if (!modal) return;
        
        // Load person data
        fetch(`/familyTimeline/api/person/${personId}`)
            .then(response => response.json())
            .then(data => {
                if (data.person) {
                    this.populateEditForm(data.person);
                    modal.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error loading person data:', error);
            });
    }
    buildGenerationHierarchy() {
        const generations = {};
        
        // Start with root couple at generation 0
        if (this.rootCouple.length >= 2) {
            generations[0] = [...this.rootCouple];
            
            // Mark root couple generation
            this.rootCouple.forEach(person => {
                person.generation_level = 0;
            });
        }
        
        // Build subsequent generations based on parent-child relationships
        this.people.forEach(person => {
            if (!this.rootCouple.includes(person)) {
                const generation = this.calculatePersonGeneration(person);
                if (!generations[generation]) {
                    generations[generation] = [];
                }
                generations[generation].push(person);
                person.generation_level = generation;
            }
        });
        
        return generations;
    }

    calculatePersonGeneration(person) {
        // Find if this person is a child of someone
        const parentRelationship = this.relationships.find(rel => 
            rel.relationship_type === 'parent' && rel.person2_id === person.id
        );
        
        if (parentRelationship) {
            const parent = this.people.find(p => p.id === parentRelationship.person1_id);
            if (parent) {
                return (parent.generation_level || 0) + 1;
            }
        }
        
        // If no parent found, might be a spouse of root or sibling
        const spouseRelationship = this.relationships.find(rel =>
            rel.relationship_type === 'spouse' && 
            (rel.person1_id === person.id || rel.person2_id === person.id)
        );
        
        if (spouseRelationship) {
            const spouseId = spouseRelationship.person1_id === person.id ? 
                            spouseRelationship.person2_id : spouseRelationship.person1_id;
            const spouse = this.people.find(p => p.id === spouseId);
            if (spouse && this.rootCouple.includes(spouse)) {
                return 0; // Also root generation
            }
        }
        
        return 1; // Default to first child generation
    }

    positionRootCouple() {
        if (this.rootCouple.length >= 2) {
            // Position both in trunk area
            this.rootCouple[0].x = 680;
            this.rootCouple[0].y = 850;
            this.rootCouple[1].x = 720;
            this.rootCouple[1].y = 850;
        } else if (this.rootCouple.length === 1) {
            // Single root person in center of trunk
            this.rootCouple[0].x = 700;
            this.rootCouple[0].y = 850;
        }
    }

    positionGeneration(people, generation) {
        if (people.length === 0) return;
        
        // Calculate base Y position (higher up for each generation)
        const baseY = 850 - (generation * 140);
        
        // Create family groups (group children by their parents)
        const familyGroups = this.groupChildrenByParents(people);
        
        let totalGroupWidth = 0;
        const groupSpacing = 200;
        
        // Calculate total width needed
        familyGroups.forEach(group => {
            totalGroupWidth += Math.max(group.length * 120, 150);
        });
        totalGroupWidth += (familyGroups.length - 1) * groupSpacing;
        
        // Start positioning from left
        const startX = 700 - (totalGroupWidth / 2);
        let currentX = startX;
        
        familyGroups.forEach((group, groupIndex) => {
            const groupWidth = Math.max(group.length * 120, 150);
            
            // Position each person in the group
            group.forEach((person, personIndex) => {
                const personSpacing = groupWidth / Math.max(group.length, 1);
                person.x = currentX + (personIndex * personSpacing) + (personSpacing / 2);
                person.y = baseY + (Math.random() - 0.5) * 30; // Add natural variation
                
                // Store branch endpoint for organic branch drawing
                person.branchGeneration = generation;
                person.familyGroup = groupIndex;
            });
            
            currentX += groupWidth + groupSpacing;
        });
    }

    groupChildrenByParents(people) {
        const groups = [];
        const processed = new Set();
        
        people.forEach(person => {
            if (processed.has(person.id)) return;
            
            // Find siblings (people with same parents)
            const siblings = people.filter(p => {
                if (processed.has(p.id)) return false;
                return this.haveSameParents(person, p);
            });
            
            if (siblings.length > 0) {
                groups.push(siblings);
                siblings.forEach(sibling => processed.add(sibling.id));
            } else {
                groups.push([person]);
                processed.add(person.id);
            }
        });
        
        return groups;
    }

    haveSameParents(person1, person2) {
        const person1Parents = this.getParents(person1.id);
        const person2Parents = this.getParents(person2.id);
        
        if (person1Parents.length === 0 || person2Parents.length === 0) {
            return false;
        }
        
        // Check if they have at least one parent in common
        return person1Parents.some(p1 => 
            person2Parents.some(p2 => p1.id === p2.id)
        );
    }

    getParents(personId) {
        const parentRelationships = this.relationships.filter(rel =>
            rel.relationship_type === 'parent' && rel.person2_id === personId
        );
        
        return parentRelationships.map(rel => 
            this.people.find(p => p.id === rel.person1_id)
        ).filter(p => p); // Filter out nulls
    }
    
    populateEditForm(person) {
        // Populate all the form fields with existing data
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
        
        // Show/hide death date field based on living status
        const deathDateGroup = document.getElementById('editDeathDateGroup');
        if (deathDateGroup) {
            deathDateGroup.style.display = person.is_living ? 'none' : 'block';
        }
    }
    
    // ===== NEW DELETE PERSON FUNCTIONALITY =====
    openDeleteConfirmationModal(personId) {
        console.log('Opening delete confirmation for person ID:', personId);
        
        // First get the deletion preview data
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
        
        // Update modal content with detailed information
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
        
        // Show/hide sections based on content
        const storiesSection = document.getElementById('deleteStoriesSection');
        const relationshipsSection = document.getElementById('deleteRelationshipsSection');
        
        if (storiesSection) {
            storiesSection.style.display = previewData.story_count > 0 ? 'block' : 'none';
        }
        
        if (relationshipsSection) {
            relationshipsSection.style.display = previewData.relationship_count > 0 ? 'block' : 'none';
        }
        
        // Store person ID for deletion and reset confirmation
        document.getElementById('confirmDeleteBtn').setAttribute('data-person-id', personId);
        document.getElementById('deleteConfirmText').value = '';
        document.getElementById('confirmDeleteBtn').disabled = true;
        
        modal.style.display = 'block';
    }
    
    async handleDeletePerson(personId) {
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('deleteConfirmModal');
                this.closeModal('personModal');
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
    // ===== END NEW DELETE FUNCTIONALITY =====
    
    openAddRootCoupleModal() {
        const modal = document.getElementById('addRootCoupleModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    openRelationshipModal(person1Id, person2Id) {
        const modal = document.getElementById('addRelationshipModal');
        if (modal) {
            document.getElementById('relationshipPerson1').value = person1Id;
            document.getElementById('relationshipPerson2').value = person2Id;
            
            const person1 = this.people.find(p => p.id === person1Id);
            const person2 = this.people.find(p => p.id === person2Id);
            
            if (person1 && person2) {
                document.getElementById('relationshipPreview').textContent = 
                    `Creating relationship between ${person1.first_name} and ${person2.first_name}`;
            }
            
            modal.style.display = 'block';
        }
    }
    
    async showPersonDetails(personId) {
        console.log('Showing person details for ID:', personId);
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}`);
            const data = await response.json();
            
            if (data.person) {
                this.populatePersonModal(data.person);
                const modal = document.getElementById('personModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading person details:', error);
        }
    }
    
    populatePersonModal(person) {
        // Store current person ID for edit/delete operations
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
            photoContainer.innerHTML = `<img src="/familyTimeline/api/person-photo/${person.id}" alt="${person.first_name}" />`;
        } else {
            photoContainer.innerHTML = `<div class="no-photo">${person.first_name.charAt(0)}</div>`;
        }
        
        // Load and display stories
        this.loadPersonStories(person.id);
    }
    
    async loadPersonStories(personId) {
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}/stories`);
            const data = await response.json();
            
            const storiesContainer = document.getElementById('personStories');
            if (data.stories && data.stories.length > 0) {
                storiesContainer.innerHTML = data.stories.map(story => `
                    <div class="story-item">
                        <h4>${story.title}</h4>
                        <div class="story-meta">
                            <span class="theme">${story.theme}</span>
                            ${story.year_occurred ? `<span class="year">${story.year_occurred}</span>` : ''}
                            <span class="author">by ${story.author_name}</span>
                        </div>
                        ${story.story_text ? `<p class="story-excerpt">${story.story_text.substring(0, 200)}...</p>` : ''}
                    </div>
                `).join('');
            } else {
                storiesContainer.innerHTML = '<p class="no-stories">No stories yet. Click "Add Story" to create the first one!</p>';
            }
        } catch (error) {
            console.error('Error loading stories:', error);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showSuccessMessage(message) {
        // Create a temporary success message
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
        
        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
    
    // Form submission handlers
    
    async handleAddPersonSubmit(e) {
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            
            if (result.success) {
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
    
    // ===== NEW EDIT PERSON SUBMIT HANDLER =====
    async handleEditPersonSubmit(e) {
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal('editPersonModal');
                this.closeModal('personModal'); // Close person details modal too
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
    // ===== END NEW EDIT HANDLER =====
    
    async handleAddRelationshipSubmit(e) {
        try {
            const formData = new FormData(e.target);
            const relationshipData = {
                family_code: this.familyCode,
                person1_id: parseInt(formData.get('person1_id')),
                person2_id: parseInt(formData.get('person2_id')),
                relationship_type: formData.get('relationship_type'),
                marriage_date: formData.get('marriage_date'),
                divorce_date: formData.get('divorce_date')
            };
            
            const response = await fetch('/familyTimeline/api/relationship', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(relationshipData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal('addRelationshipModal');
                this.showSuccessMessage('Relationship created successfully!');
                await this.loadTreeData();
                this.renderTree();
                e.target.reset();
            } else {
                throw new Error(result.message || 'Failed to create relationship');
            }
        } catch (error) {
            console.error('Error creating relationship:', error);
            alert('Error creating relationship: ' + error.message);
        }
    }
    
    async handleStorySubmit(e) {
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storyData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal('addStoryModal');
                this.showSuccessMessage('Story added successfully!');
                // Refresh person's stories if person modal is open
                if (this.selectedPerson) {
                    this.loadPersonStories(this.selectedPerson);
                }
                e.target.reset();
            } else {
                throw new Error(result.message || 'Failed to add story');
            }
        } catch (error) {
            console.error('Error adding story:', error);
            alert('Error adding story: ' + error.message);
        }
    }
    
    // Utility methods
    
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

// Initialize the family tree when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const familyCode = new URLSearchParams(window.location.search).get('family') || window.familyCode;
    
    if (familyCode) {
        window.familyTree = new OrganicFamilyTree(familyCode);
        
        // Setup modal event handlers
        setupModalHandlers();
    }
});

function setupModalHandlers() {
    // Close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // ===== NEW EDIT/DELETE BUTTON HANDLERS =====
    // Edit person button handler
    document.addEventListener('click', function(e) {
        if (e.target.id === 'editPersonBtn') {
            if (window.familyTree && window.familyTree.selectedPerson) {
                window.familyTree.openEditPersonModal(window.familyTree.selectedPerson);
            }
        }
        
        // Delete person button handler
        if (e.target.id === 'deletePersonBtn') {
            if (window.familyTree && window.familyTree.selectedPerson) {
                window.familyTree.openDeleteConfirmationModal(window.familyTree.selectedPerson);
            }
        }
        
        // Confirm delete button handler
        if (e.target.id === 'confirmDeleteBtn') {
            const personId = e.target.getAttribute('data-person-id');
            if (personId && window.familyTree) {
                window.familyTree.handleDeletePerson(parseInt(personId));
            }
        }
    });
    // ===== END NEW BUTTON HANDLERS =====
    
    // Living status change handler for death date field
    document.addEventListener('change', function(e) {
        if (e.target.id === 'editIsLiving' || e.target.id === 'addIsLiving') {
            const isLiving = e.target.checked;
            const deathDateField = e.target.closest('form').querySelector('input[name="death_date"]');
            
            if (deathDateField) {
                deathDateField.style.display = isLiving ? 'none' : 'block';
                if (isLiving) {
                    deathDateField.value = '';
                }
            }
        }
    });
    
    // Theme selection handler for story forms
    document.addEventListener('change', function(e) {
        if (e.target.name === 'theme' && window.familyTree) {
            loadThemeQuestions(e.target.value, e.target.closest('form'));
        }
    });
}

async function loadThemeQuestions(themeKey, form) {
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

// ===== NEW DELETE CONFIRMATION VALIDATION =====
// Setup delete confirmation text validation
document.addEventListener('DOMContentLoaded', function() {
    const deleteInput = document.getElementById('deleteConfirmText');
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (deleteInput && deleteBtn) {
        deleteInput.addEventListener('input', function() {
            deleteBtn.disabled = this.value.toUpperCase() !== 'DELETE';
        });
    }
});
// ===== END NEW DELETE VALIDATION =====

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
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
    
    .person-node.connection-start {
        filter: drop-shadow(0 0 10px #FFD700) brightness(1.2);
        animation: connectionPulse 1s infinite;
    }
    
    @keyframes connectionPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    .person-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 15px;
    }
    
    .bio-summary {
        grid-column: 1 / -1;
        margin-top: 10px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
    }
    
    .no-photo {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: #e9ecef;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        font-weight: bold;
        color: #6c757d;
    }
    
    .story-item {
        background: #f8f9fa;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        border-left: 4px solid #28a745;
    }
    
    .story-meta {
        display: flex;
        gap: 10px;
        margin: 5px 0;
        font-size: 12px;
    }
    
    .story-meta .theme {
        background: #e3f2fd;
        color: #1976d2;
        padding: 2px 8px;
        border-radius: 12px;
    }
    
    .story-meta .year {
        background: #fff3e0;
        color: #f57c00;
        padding: 2px 8px;
        border-radius: 12px;
    }
    
    .story-meta .author {
        color: #666;
        font-style: italic;
    }
    
    .story-excerpt {
        margin-top: 10px;
        color: #666;
        line-height: 1.4;
    }
    
    .no-stories {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px 20px;
    }
    
    .question-option {
        margin: 10px 0;
        padding: 15px;
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .question-option:hover {
        border-color: #28a745;
        background: #f8fff8;
    }
    
    .question-option label {
        display: flex;
        align-items: flex-start;
        cursor: pointer;
        margin-bottom: 0;
        font-weight: normal;
    }
    
    .question-option input[type="checkbox"] {
        margin-right: 12px;
        width: auto;
        transform: scale(1.2);
        margin-top: 2px;
    }
    
    .question-text {
        flex: 1;
        color: #333;
        line-height: 1.4;
    }
    
    .answer-input {
        margin-top: 10px;
        padding-left: 30px;
    }
    
    .answer-input textarea {
        width: 100%;
        border: 2px solid #e0e0e0;
        border-radius: 5px;
        padding: 8px;
        font-family: inherit;
    }
    
    .answer-input textarea:focus {
        border-color: #28a745;
        outline: none;
    }
`;
document.head.appendChild(style);

// ===== ADD THESE CSS ANIMATIONS =====
const organicTreeStyle = document.createElement('style');
organicTreeStyle.textContent = `
    @keyframes growBranch {
        to {
            stroke-dashoffset: 0;
        }
    }
    
    @keyframes birdFly {
        0%, 100% { transform: translateX(0) translateY(0); }
        25% { transform: translateX(10px) translateY(-5px); }
        50% { transform: translateX(20px) translateY(0); }
        75% { transform: translateX(10px) translateY(5px); }
    }
    
    @keyframes leafFall {
        0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 0.4;
        }
        100% { 
            transform: translateY(800px) rotate(360deg);
            opacity: 0;
        }
    }
    
    .main-branch {
        stroke: #8B4513;
    }
    
    .secondary-branch {
        stroke: #A0522D;
    }
    
    .child-branch {
        stroke: #CD853F;
    }
`;
document.head.appendChild(organicTreeStyle);