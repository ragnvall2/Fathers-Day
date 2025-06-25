/**
 * GridFamilyTree - A grid-based family tree system
 * Designed for manual positioning with automatic line drawing
 */

class GridFamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        console.log('=== GridFamilyTree Constructor ===');
        console.log('familyCode:', familyCode);
        
        this.familyCode = familyCode;
        this.containerId = containerId;
        
        // Grid configuration
        this.gridRows = 6;          // Number of generations (rows)
        this.gridCols = 12;         // Number of positions per row
        this.gridCellSize = 120;    // Size of each grid cell in pixels
        this.gridStartX = 100;      // Grid offset from left
        this.gridStartY = 100;      // Grid offset from top
        
        // Tree data
        this.people = [];
        this.relationships = [];
        
        // UI state
        this.isEditMode = false;
        this.isOwner = false;
        this.selectedPerson = null;
        this.pendingGridPosition = null;
        
        // Drag and drop state
        this.isDragging = false;
        this.draggedPerson = null;
        this.dragStartPos = null;
        this.dragPreviewElement = null;
        
        // View controls
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing GridFamilyTree...');
        
        await this.loadTreeData();
        await this.checkOwnerPermissions();
        this.createTreeContainer();
        this.setupEventListeners();
        this.renderTree();
        
        // Show edit controls if owner
        if (this.isOwner) {
            this.showOwnerControls();
        }
    }
    
    // ===========================================
    // DATA LOADING
    // ===========================================
    
    async loadTreeData() {
        console.log('Loading tree data for family:', this.familyCode);
        
        if (!this.familyCode) {
            console.error('No familyCode provided!');
            return;
        }
        
        try {
            const apiUrl = `/familyTimeline/api/tree/${this.familyCode}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            this.people = data.people || [];
            this.relationships = data.relationships || [];
            
            console.log(`Loaded ${this.people.length} people and ${this.relationships.length} relationships`);
            
            // DEBUG: Log what grid positions we got from the database
            this.people.forEach(person => {
                console.log(`Person ${person.first_name}: grid_row=${person.grid_row} (${typeof person.grid_row}), grid_col=${person.grid_col} (${typeof person.grid_col})`);
            });
            
            // Assign grid positions to people who don't have them
            this.assignGridPositions();
            
        } catch (error) {
            console.error('Error loading tree data:', error);
        }
    }
    
    async checkOwnerPermissions() {
        // For now, assume user is owner if they can access the tree
        // TODO: Implement proper owner checking based on user_role
        this.isOwner = true;
        console.log('Owner permissions:', this.isOwner);
    }
    
    // ===========================================
    // GRID POSITIONING SYSTEM
    // ===========================================
    
    assignGridPositions() {
        // Assign grid positions to people who don't have them
        let currentRow = 0;
        let currentCol = 0;
        
        this.people.forEach(person => {
            // Check if person has valid grid position (not null, undefined, or invalid)
            const hasValidGridRow = person.grid_row !== null && person.grid_row !== undefined && typeof person.grid_row === 'number' && !isNaN(person.grid_row);
            const hasValidGridCol = person.grid_col !== null && person.grid_col !== undefined && typeof person.grid_col === 'number' && !isNaN(person.grid_col);
            
            if (!hasValidGridRow || !hasValidGridCol) {
                console.log(`${person.first_name} has invalid grid position: row=${person.grid_row}, col=${person.grid_col} - auto-assigning`);
                
                // Find next available grid spot
                while (this.isGridPositionOccupied(currentRow, currentCol)) {
                    currentCol++;
                    if (currentCol >= this.gridCols) {
                        currentCol = 0;
                        currentRow++;
                    }
                }
                
                person.grid_row = currentRow;
                person.grid_col = currentCol;
                
                console.log(`Assigned ${person.first_name} to grid position: [${currentRow}, ${currentCol}]`);
                
                currentCol++;
            } else {
                console.log(`${person.first_name} already has valid grid position: [${person.grid_row}, ${person.grid_col}]`);
            }
        });
    }
    
    isGridPositionOccupied(row, col) {
        return this.people.some(person => 
            person.grid_row === row && person.grid_col === col
        );
    }
    
    gridToPixelCoordinates(row, col) {
        return {
            x: this.gridStartX + (col * this.gridCellSize) + (this.gridCellSize / 2),
            y: this.gridStartY + (row * this.gridCellSize) + (this.gridCellSize / 2)
        };
    }
    
    pixelToGridCoordinates(x, y) {
        const col = Math.floor((x - this.gridStartX) / this.gridCellSize);
        const row = Math.floor((y - this.gridStartY) / this.gridCellSize);
        return { row, col };
    }
    
    // ===========================================
    // UI CREATION AND MANAGEMENT
    // ===========================================
    
    createTreeContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const svgWidth = this.gridStartX * 2 + (this.gridCols * this.gridCellSize);
        const svgHeight = this.gridStartY * 2 + (this.gridRows * this.gridCellSize);
        
        container.innerHTML = `
            <div class="grid-tree-canvas">
                <svg id="gridTreeSVG" width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}">
                    <defs>
                        <radialGradient id="personGradient" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" style="stop-color:#90EE90;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
                        </radialGradient>
                        
                        <filter id="personShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.2"/>
                        </filter>
                    </defs>
                    
                    <g id="gridOverlay"></g>
                    <g id="connections"></g>
                    <g id="people"></g>
                </svg>
            </div>
            
            <!-- Tree Controls -->
            <div class="grid-tree-controls">
                <!-- View Controls (Hidden in Edit Mode) -->
                <div id="viewControls" class="control-group">
                    <button id="zoomOut" class="control-btn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="control-btn">+</button>
                    <button id="centerTree" class="large-btn">🎯 Center</button>
                </div>
                
                <!-- Edit Controls (Owner Only) -->
                <div id="editControls" class="control-group" style="display: none;">
                    <button id="toggleEditMode" class="large-btn edit-btn">✏️ Edit Tree</button>
                </div>
                
                <!-- Grid Size Controls (Edit Mode Only) -->
                <div id="gridSizeControls" class="control-group grid-controls" style="display: none;">
                    <div class="grid-control-row">
                        <label>Generations: <span id="gridRowsValue">${this.gridRows}</span></label>
                        <button id="gridRowsDown" class="small-btn">-</button>
                        <button id="gridRowsUp" class="small-btn">+</button>
                    </div>
                    <div class="grid-control-row">
                        <label>Positions: <span id="gridColsValue">${this.gridCols}</span></label>
                        <button id="gridColsDown" class="small-btn">-</button>
                        <button id="gridColsUp" class="small-btn">+</button>
                    </div>
                </div>
            </div>
            
            <!-- Context Menu -->
            <div id="contextMenu" class="context-menu" style="display: none;">
                <div class="context-item" data-action="viewStories">📖 View Stories</div>
                <div class="context-item" data-action="addStory">✍️ Add Story</div>
                <div class="context-separator"></div>
                <div class="context-item" data-action="addSpouse">💕 Add Spouse</div>
                <div class="context-item" data-action="addChild">👶 Add Child</div>
                <div class="context-separator"></div>
                <div class="context-item" data-action="editPerson">✏️ Edit Person</div>
                <div class="context-item" data-action="deletePerson">🗑️ Delete Person</div>
            </div>
        `;
    }
    
    showOwnerControls() {
        const editControls = document.getElementById('editControls');
        if (editControls) {
            editControls.style.display = 'flex';
        }
    }
    
    // ===========================================
    // EDIT MODE MANAGEMENT
    // ===========================================
    
    toggleEditMode() {
        if (!this.isOwner) {
            alert('Only the tree owner can edit the layout.');
            return;
        }
        
        this.isEditMode = !this.isEditMode;
        console.log('Edit mode:', this.isEditMode);
        
        this.updateEditModeUI();
        this.renderTree();
    }
    
    updateEditModeUI() {
        const editButton = document.getElementById('toggleEditMode');
        const gridControls = document.getElementById('gridSizeControls');
        const viewControls = document.getElementById('viewControls');
        const canvas = document.querySelector('.grid-tree-canvas');
        const svg = document.getElementById('gridTreeSVG');
        
        if (editButton) {
            editButton.textContent = this.isEditMode ? '👁️ View Mode' : '✏️ Edit Tree';
            editButton.classList.toggle('active', this.isEditMode);
        }
        
        if (gridControls) {
            gridControls.style.display = this.isEditMode ? 'flex' : 'none';
        }
        
        // Hide/show zoom controls in edit mode
        if (viewControls) {
            viewControls.style.display = this.isEditMode ? 'none' : 'flex';
        }
        
        if (canvas) {
            canvas.classList.toggle('edit-mode', this.isEditMode);
        }
        
        if (svg) {
            if (this.isEditMode) {
                // Reset transform and enable scrolling for edit mode
                this.resetViewForEditMode();
                this.enableGridScrolling();
            } else {
                // Re-enable pan/zoom for view mode
                this.disableGridScrolling();
                this.enablePanZoom();
            }
        }
    }
    
    adjustGridSize(newRows, newCols) {
        this.gridRows = Math.max(3, Math.min(15, newRows));
        this.gridCols = Math.max(6, Math.min(25, newCols));
        
        // Update displays
        document.getElementById('gridRowsValue').textContent = this.gridRows;
        document.getElementById('gridColsValue').textContent = this.gridCols;
        
        console.log(`Grid resized to: ${this.gridRows} × ${this.gridCols}`);
        
        // Update SVG size and container
        this.updateSVGSize();
        
        if (this.isEditMode) {
            this.renderTree();
        }
    }
    
    updateSVGSize() {
        const svg = document.getElementById('gridTreeSVG');
        if (!svg) return;
        
        const svgWidth = Math.max(1400, this.gridStartX * 2 + (this.gridCols * this.gridCellSize));
        const svgHeight = Math.max(1000, this.gridStartY * 2 + (this.gridRows * this.gridCellSize));
        
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        
        console.log(`SVG resized to: ${svgWidth} × ${svgHeight}`);
    }
    
    // ===========================================
    // EDIT MODE NAVIGATION METHODS
    // ===========================================
    
    resetViewForEditMode() {
        // Reset any transforms
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        
        const connections = document.getElementById('connections');
        const people = document.getElementById('people');
        
        if (connections) connections.removeAttribute('transform');
        if (people) people.removeAttribute('transform');
        
        // Reset canvas scroll position
        const canvas = document.getElementById('gridCanvas');
        if (canvas) {
            canvas.scrollLeft = 0;
            canvas.scrollTop = 0;
        }
        
        this.updateZoomDisplay();
    }
    
    enableGridScrolling() {
        const canvas = document.getElementById('gridCanvas');
        if (!canvas) return;
        
        // Enable scrolling for edit mode
        canvas.style.overflow = 'auto';
        canvas.style.cursor = 'default';
        
        // Add scroll indicators if content is larger than container
        this.updateScrollIndicators();
    }
    
    disableGridScrolling() {
        const canvas = document.getElementById('gridCanvas');
        if (!canvas) return;
        
        // Disable scrolling for view mode
        canvas.style.overflow = 'hidden';
        canvas.style.cursor = 'grab';
    }
    
    enablePanZoom() {
        // Re-enable pan and zoom functionality for view mode
        const svg = document.getElementById('gridTreeSVG');
        if (svg) {
            svg.style.cursor = 'grab';
        }
    }
    
    updateScrollIndicators() {
        const canvas = document.getElementById('gridCanvas');
        if (!canvas) return;
        
        const canScrollHorizontally = canvas.scrollWidth > canvas.clientWidth;
        const canScrollVertically = canvas.scrollHeight > canvas.clientHeight;
        
        // Add visual indicators if content is scrollable
        canvas.classList.toggle('scrollable-x', canScrollHorizontally);
        canvas.classList.toggle('scrollable-y', canScrollVertically);
        
        console.log(`Scroll indicators - X: ${canScrollHorizontally}, Y: ${canScrollVertically}`);
    }
    
    // ===========================================
    // RENDERING SYSTEM
    // ===========================================
    
    renderTree() {
        this.clearTree();
        
        if (this.isEditMode) {
            this.renderGridOverlay();
        }
        
        this.renderConnections();
        this.renderPeople();
    }
    
    clearTree() {
        const gridOverlay = document.getElementById('gridOverlay');
        const connections = document.getElementById('connections');
        const people = document.getElementById('people');
        
        if (gridOverlay) gridOverlay.innerHTML = '';
        if (connections) connections.innerHTML = '';
        if (people) people.innerHTML = '';
    }
    
    renderGridOverlay() {
        const container = document.getElementById('gridOverlay');
        if (!container) return;
        
        let gridHTML = '';
        
        // Draw grid background
        const gridWidth = this.gridCols * this.gridCellSize;
        const gridHeight = this.gridRows * this.gridCellSize;
        
        gridHTML += `<rect x="${this.gridStartX}" y="${this.gridStartY}" 
                     width="${gridWidth}" height="${gridHeight}"
                     fill="rgba(255,255,255,0.1)" stroke="rgba(46,125,50,0.3)" 
                     stroke-width="2" stroke-dasharray="10,5" rx="10"/>`;
        
        // Draw generation labels
        for (let row = 0; row < this.gridRows; row++) {
            const y = this.gridStartY + (row * this.gridCellSize) + (this.gridCellSize / 2);
            gridHTML += `<text x="${this.gridStartX - 40}" y="${y + 5}" 
                         font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
                         fill="#2E7D32" text-anchor="middle">Gen ${this.gridRows - row}</text>`;
        }
        
        // Draw grid spots (clickable dots for empty positions)
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                if (!this.isGridPositionOccupied(row, col)) {
                    const coords = this.gridToPixelCoordinates(row, col);
                    
                    // Visible dot
                    gridHTML += `<circle cx="${coords.x}" cy="${coords.y}" r="8" 
                                 fill="rgba(46,125,50,0.4)" stroke="#2E7D32" stroke-width="2"
                                 class="grid-spot" opacity="0.7"/>`;
                    
                    // Larger invisible click area
                    gridHTML += `<circle cx="${coords.x}" cy="${coords.y}" r="30" 
                                 fill="transparent" class="grid-click-area" 
                                 data-row="${row}" data-col="${col}" style="cursor: pointer;"/>`;
                }
            }
        }
        
        container.innerHTML = gridHTML;
    }
    
    renderPeople() {
        const container = document.getElementById('people');
        if (!container) return;
        
        this.people.forEach(person => {
            if (typeof person.grid_row === 'number' && typeof person.grid_col === 'number') {
                this.createPersonNode(container, person);
            }
        });
    }
    
    createPersonNode(container, person) {
        const coords = this.gridToPixelCoordinates(person.grid_row, person.grid_col);
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.style.cursor = 'pointer';
        
        // Person circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', coords.x);
        circle.setAttribute('cy', coords.y);
        circle.setAttribute('r', '30');
        circle.setAttribute('fill', 'url(#personGradient)');
        circle.setAttribute('stroke', '#228B22');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('filter', 'url(#personShadow)');
        group.appendChild(circle);
        
        // Story indicator if person has stories
        if (person.story_count > 0) {
            const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            indicator.setAttribute('cx', coords.x + 35);
            indicator.setAttribute('cy', coords.y - 25);
            indicator.setAttribute('r', '8');
            indicator.setAttribute('fill', '#FFD700');
            indicator.setAttribute('stroke', '#FFA500');
            indicator.setAttribute('stroke-width', '2');
            group.appendChild(indicator);
            
            const bookIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bookIcon.setAttribute('x', coords.x + 35);
            bookIcon.setAttribute('y', coords.y - 20);
            bookIcon.setAttribute('text-anchor', 'middle');
            bookIcon.setAttribute('font-size', '10');
            bookIcon.textContent = '📖';
            group.appendChild(bookIcon);
        }
        
        // Name label
        const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameLabel.setAttribute('x', coords.x);
        nameLabel.setAttribute('y', coords.y + 55);
        nameLabel.setAttribute('text-anchor', 'middle');
        nameLabel.setAttribute('font-family', 'Arial, sans-serif');
        nameLabel.setAttribute('font-size', '12');
        nameLabel.setAttribute('font-weight', 'bold');
        nameLabel.setAttribute('fill', '#2F4F2F');
        nameLabel.textContent = `${person.first_name} ${person.last_name || ''}`.trim();
        group.appendChild(nameLabel);
        
        // Click handler
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handlePersonClick(person.id, e);
        });
        
        // Drag and drop handlers (edit mode only)
        if (this.isEditMode) {
            this.setupPersonDragAndDrop(group, person);
        }
        
        container.appendChild(group);
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
            
            if (person1 && person2 && 
                typeof person1.grid_row === 'number' && typeof person2.grid_row === 'number') {
                this.drawSpouseConnection(container, person1, person2);
            }
        });
    }
    
    drawSpouseConnection(container, person1, person2) {
        const coords1 = this.gridToPixelCoordinates(person1.grid_row, person1.grid_col);
        const coords2 = this.gridToPixelCoordinates(person2.grid_row, person2.grid_col);
        
        // Red line between spouses
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', coords1.x);
        line.setAttribute('y1', coords1.y);
        line.setAttribute('x2', coords2.x);
        line.setAttribute('y2', coords2.y);
        line.setAttribute('stroke', '#DC143C');
        line.setAttribute('stroke-width', '4');
        container.appendChild(line);
        
        // Heart in the middle
        const heartX = (coords1.x + coords2.x) / 2;
        const heartY = (coords1.y + coords2.y) / 2;
        
        const heart = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heart.setAttribute('x', heartX);
        heart.setAttribute('y', heartY + 5);
        heart.setAttribute('text-anchor', 'middle');
        heart.setAttribute('font-size', '20');
        heart.setAttribute('fill', '#DC143C');
        heart.textContent = '❤️';
        container.appendChild(heart);
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
        const parents = group.parents.filter(p => 
            typeof p.grid_row === 'number' && typeof p.grid_col === 'number'
        );
        const children = group.children.filter(c => 
            typeof c.grid_row === 'number' && typeof c.grid_col === 'number'
        );
        
        if (parents.length === 0 || children.length === 0) return;
        
        // Calculate connection point (heart position for couples, or parent position for single parent)
        let heartCoords;
        if (parents.length === 2) {
            const coords1 = this.gridToPixelCoordinates(parents[0].grid_row, parents[0].grid_col);
            const coords2 = this.gridToPixelCoordinates(parents[1].grid_row, parents[1].grid_col);
            heartCoords = {
                x: (coords1.x + coords2.x) / 2,
                y: (coords1.y + coords2.y) / 2
            };
        } else {
            heartCoords = this.gridToPixelCoordinates(parents[0].grid_row, parents[0].grid_col);
        }
        
        // Draw lines to children
        children.forEach(child => {
            const childCoords = this.gridToPixelCoordinates(child.grid_row, child.grid_col);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', heartCoords.x);
            line.setAttribute('y1', heartCoords.y + 15);
            line.setAttribute('x2', childCoords.x);
            line.setAttribute('y2', childCoords.y - 35);
            line.setAttribute('stroke', '#8B4513');
            line.setAttribute('stroke-width', '3');
            container.appendChild(line);
        });
    }
    
    // ===========================================
    // EVENT HANDLING
    // ===========================================
    
    setupEventListeners() {
        this.setupViewControls();
        this.setupEditControls();
        this.setupTreeInteractions();
        this.setupContextMenu();
    }
    
    setupViewControls() {
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => {
            this.scale = Math.min(this.scale * 1.2, 3);
            this.updateTransform();
            this.updateZoomDisplay();
        });
        
        document.getElementById('zoomOut')?.addEventListener('click', () => {
            this.scale = Math.max(this.scale / 1.2, 0.3);
            this.updateTransform();
            this.updateZoomDisplay();
        });
        
        document.getElementById('centerTree')?.addEventListener('click', () => {
            this.centerTree();
        });
    }
    
    setupEditControls() {
        // Edit mode toggle
        document.getElementById('toggleEditMode')?.addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Grid size controls
        document.getElementById('gridRowsUp')?.addEventListener('click', () => {
            this.adjustGridSize(this.gridRows + 1, this.gridCols);
        });
        
        document.getElementById('gridRowsDown')?.addEventListener('click', () => {
            this.adjustGridSize(this.gridRows - 1, this.gridCols);
        });
        
        document.getElementById('gridColsUp')?.addEventListener('click', () => {
            this.adjustGridSize(this.gridRows, this.gridCols + 1);
        });
        
        document.getElementById('gridColsDown')?.addEventListener('click', () => {
            this.adjustGridSize(this.gridRows, this.gridCols - 1);
        });
        
        // Reset grid view button
        document.getElementById('resetGridView')?.addEventListener('click', () => {
            this.resetViewForEditMode();
        });
    }
    
    setupTreeInteractions() {
        const svg = document.getElementById('gridTreeSVG');
        if (!svg) return;
        
        // Grid spot clicks (edit mode only)
        svg.addEventListener('click', (e) => {
            if (this.isEditMode && e.target.classList.contains('grid-click-area')) {
                const row = parseInt(e.target.getAttribute('data-row'));
                const col = parseInt(e.target.getAttribute('data-col'));
                this.handleGridClick(row, col);
            }
        });
        
        // Pan and zoom functionality
        this.setupPanZoom(svg);
        
        // Hide context menu on outside clicks
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.person-node')) {
                this.hideContextMenu();
            }
        });
    }
    
    setupPanZoom(svg) {
        let isPanning = false;
        let startX, startY;
        
        svg.addEventListener('mousedown', (e) => {
            // Only enable pan/zoom in view mode
            if (this.isEditMode) return;
            
            if (e.target === svg || e.target.closest('#gridOverlay')) {
                isPanning = true;
                startX = e.clientX - this.panX;
                startY = e.clientY - this.panY;
                svg.style.cursor = 'grabbing';
            }
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (isPanning && !this.isEditMode) {
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this.updateTransform();
            }
        });
        
        svg.addEventListener('mouseup', () => {
            isPanning = false;
            if (!this.isEditMode) {
                svg.style.cursor = 'grab';
            }
        });
        
        svg.addEventListener('wheel', (e) => {
            // Only enable zoom in view mode
            if (this.isEditMode) return;
            
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.max(0.3, Math.min(3, this.scale * zoomFactor));
            this.updateTransform();
            this.updateZoomDisplay();
        });
    }
    
    setupContextMenu() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.context-item')) {
                const action = e.target.closest('.context-item').getAttribute('data-action');
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            }
        });
    }
    
    // ===========================================
    // DRAG AND DROP FUNCTIONALITY
    // ===========================================
    
    setupPersonDragAndDrop(personElement, person) {
        personElement.style.cursor = 'move';
        
        // Use mouse events instead of HTML5 drag/drop for better SVG compatibility
        personElement.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e, person);
        });
    }
    
    handleMouseDown(e, person) {
        // Only allow left mouse button
        if (e.button !== 0) return;
        
        console.log(`🖱️ MOUSE DOWN: Starting drag for ${person.first_name}`);
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.draggedPerson = person;
        this.dragStartPos = { row: person.grid_row, col: person.grid_col };
        
        // Style the dragged element
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.transform = 'scale(0.9)';
        e.currentTarget.style.zIndex = '1000';
        
        // Show drop zones
        this.showDropZones();
        
        // Add global mouse events
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Change cursor
        document.body.style.cursor = 'grabbing';
        
        console.log('🎯 Mouse drag initialized, drop zones visible');
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        // Find what element we're over
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        
        // Remove previous hover effects
        document.querySelectorAll('.drop-zone-hover').forEach(zone => {
            zone.classList.remove('drop-zone-hover');
        });
        
        // Check if we're over a drop zone
        if (elementBelow && elementBelow.classList.contains('grid-click-area')) {
            elementBelow.classList.add('drop-zone-hover');
            document.body.style.cursor = 'copy';
        } else {
            document.body.style.cursor = 'no-drop';
        }
    }
    
    handleMouseUp(e) {
        console.log('🖱️ MOUSE UP: Ending drag');
        
        if (!this.isDragging) return;
        
        // Find what element we dropped on
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        
        if (elementBelow && elementBelow.classList.contains('grid-click-area')) {
            const row = parseInt(elementBelow.getAttribute('data-row'));
            const col = parseInt(elementBelow.getAttribute('data-col'));
            
            console.log(`📍 DROPPED on grid spot [${row}, ${col}]`);
            
            // Check if it's a valid drop location
            if (!this.isGridPositionOccupied(row, col) || 
                (this.draggedPerson && row === this.draggedPerson.grid_row && col === this.draggedPerson.grid_col)) {
                
                console.log('✅ Valid drop location, updating position');
                this.updatePersonGridPosition(this.draggedPerson.id, row, col);
            } else {
                console.log('❌ Invalid drop location (occupied)');
                this.revertDrag();
            }
        } else {
            console.log('❌ Dropped outside valid area, reverting');
            this.revertDrag();
        }
        
        this.endDrag();
    }
    
    revertDrag() {
        // Just re-render to put person back in original position
        this.renderTree();
        this.showErrorMessage('Cannot drop there - position is occupied or invalid');
    }
    
    endDrag() {
        console.log('🧹 CLEANING UP DRAG');
        
        // Remove global mouse events
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Reset cursor
        document.body.style.cursor = 'default';
        
        // Reset drag state
        this.isDragging = false;
        this.draggedPerson = null;
        this.dragStartPos = null;
        
        // Hide drop zones and reset styles
        this.hideDropZones();
        
        // Reset any dragged element styles
        document.querySelectorAll('.person-node').forEach(node => {
            node.style.opacity = '1';
            node.style.transform = 'scale(1)';
            node.style.zIndex = 'auto';
        });
        
        console.log('✅ Drag cleanup complete');
    }
    
    showDropZones() {
        console.log('🎯 SHOWING DROP ZONES');
        
        // Highlight available grid spots during drag
        const gridSpots = document.querySelectorAll('.grid-click-area');
        console.log(`Found ${gridSpots.length} grid spots`);
        
        let activeZones = 0;
        
        gridSpots.forEach(spot => {
            const row = parseInt(spot.getAttribute('data-row'));
            const col = parseInt(spot.getAttribute('data-col'));
            
            // Only show spots that are empty (not occupied by other people)
            if (!this.isGridPositionOccupied(row, col) || 
                (this.draggedPerson && row === this.draggedPerson.grid_row && col === this.draggedPerson.grid_col)) {
                
                spot.classList.add('drop-zone-active');
                activeZones++;
            }
        });
        
        console.log(`🎯 Activated ${activeZones} drop zones`);
    }
    
    hideDropZones() {
        console.log('🚫 HIDING DROP ZONES');
        
        const dropZones = document.querySelectorAll('.drop-zone-active');
        console.log(`Hiding ${dropZones.length} drop zones`);
        
        dropZones.forEach(zone => {
            zone.classList.remove('drop-zone-active', 'drop-zone-hover');
        });
    }
    
    async updatePersonGridPosition(personId, newRow, newCol) {
        try {
            const person = this.people.find(p => p.id === personId);
            if (!person) return;
            
            const oldPos = `[${person.grid_row}, ${person.grid_col}]`;
            const newPos = `[${newRow}, ${newCol}]`;
            
            console.log(`Moving ${person.first_name} from ${oldPos} to ${newPos}`);
            
            // Update locally first for immediate feedback
            person.grid_row = newRow;
            person.grid_col = newCol;
            
            // Re-render the tree
            this.renderTree();
            
            // Update in database
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grid_row: newRow,
                    grid_col: newCol
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`Successfully updated ${person.first_name}'s position in database`);
                this.showSuccessMessage(`Moved ${person.first_name} to ${newPos}`);
            } else {
                throw new Error(result.message || 'Failed to update position');
            }
            
        } catch (error) {
            console.error('Error updating person position:', error);
            
            // Revert position on error
            if (this.dragStartPos) {
                const person = this.people.find(p => p.id === personId);
                if (person) {
                    person.grid_row = this.dragStartPos.row;
                    person.grid_col = this.dragStartPos.col;
                    this.renderTree();
                }
            }
            
            this.showErrorMessage('Failed to update position. Please try again.');
        }
    }
    
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 4000);
    }
    
    handlePersonClick(personId, event) {
        // Don't show context menu in edit mode - we want to enable dragging
        if (this.isEditMode) {
            console.log('Edit mode: skipping context menu for drag functionality');
            return;
        }
        
        this.selectedPerson = personId;
        this.showContextMenu(event);
    }
    
    handleGridClick(row, col) {
        console.log(`Grid clicked: [${row}, ${col}]`);
        this.pendingGridPosition = { row, col };
        this.openAddPersonModal();
    }
    
    showContextMenu(event) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
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
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    handleContextMenuAction(action) {
        console.log(`Context menu action: ${action} for person ${this.selectedPerson}`);
        
        switch (action) {
            case 'viewStories':
                this.openPersonModal(this.selectedPerson);
                break;
            case 'addStory':
                this.openAddStoryModal(this.selectedPerson);
                break;
            case 'addSpouse':
                this.openAddSpouseModal(this.selectedPerson);
                break;
            case 'addChild':
                this.openAddChildModal(this.selectedPerson);
                break;
            case 'editPerson':
                this.openEditPersonModal(this.selectedPerson);
                break;
            case 'deletePerson':
                this.openDeletePersonModal(this.selectedPerson);
                break;
        }
    }
    
    // ===========================================
    // UTILITY METHODS
    // ===========================================
    
    updateTransform() {
        const connections = document.getElementById('connections');
        const people = document.getElementById('people');
        const transform = `translate(${this.panX}, ${this.panY}) scale(${this.scale})`;
        
        if (connections) connections.setAttribute('transform', transform);
        if (people) people.setAttribute('transform', transform);
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
        this.updateTransform();
        this.updateZoomDisplay();
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
    
    // ===========================================
    // MODAL OPERATIONS (Placeholder methods - integrate with existing modals)
    // ===========================================
    
    openAddPersonModal() {
        console.log('Opening add person modal for grid position:', this.pendingGridPosition);
        // TODO: Integrate with existing modal system
        // Set this.pendingGridPosition so the form knows where to place the person
        
        // For now, show existing modal
        const modal = document.getElementById('addPersonModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Reset form
            const form = document.getElementById('addPersonForm');
            if (form) form.reset();
            
            // Clear photo preview
            const photoPreview = document.getElementById('addPersonPhotoPreview');
            if (photoPreview) photoPreview.style.display = 'none';
        }
    }
    
    openPersonModal(personId) {
        console.log('Opening person modal for:', personId);
        // TODO: Integrate with existing person modal
        // Load person details and stories
    }
    
    openAddStoryModal(personId) {
        console.log('Opening add story modal for person:', personId);
        // TODO: Integrate with existing story modal
    }
    
    openAddSpouseModal(personId) {
        console.log('Opening add spouse modal for person:', personId);
        // TODO: Find empty grid spot next to this person
        const person = this.people.find(p => p.id === personId);
        if (person && typeof person.grid_row === 'number' && typeof person.grid_col === 'number') {
            // Try to find an adjacent empty spot
            const adjacentSpots = [
                { row: person.grid_row, col: person.grid_col + 1 },
                { row: person.grid_row, col: person.grid_col - 1 },
                { row: person.grid_row + 1, col: person.grid_col },
                { row: person.grid_row - 1, col: person.grid_col }
            ];
            
            for (let spot of adjacentSpots) {
                if (spot.row >= 0 && spot.row < this.gridRows && 
                    spot.col >= 0 && spot.col < this.gridCols && 
                    !this.isGridPositionOccupied(spot.row, spot.col)) {
                    this.pendingGridPosition = spot;
                    break;
                }
            }
            
            if (!this.pendingGridPosition) {
                alert('No adjacent empty spots. Please click on an empty grid spot first.');
                return;
            }
        }
        
        this.currentAddType = 'spouse';
        this.currentParentId = personId;
        this.openAddPersonModal();
    }
    
    openAddChildModal(personId) {
        console.log('Opening add child modal for person:', personId);
        // TODO: Find empty grid spot below this person (next generation)
        const person = this.people.find(p => p.id === personId);
        if (person && typeof person.grid_row === 'number' && typeof person.grid_col === 'number') {
            // Look for empty spot in the generation below (higher row number)
            for (let col = 0; col < this.gridCols; col++) {
                for (let row = person.grid_row + 1; row < this.gridRows; row++) {
                    if (!this.isGridPositionOccupied(row, col)) {
                        this.pendingGridPosition = { row, col };
                        break;
                    }
                }
                if (this.pendingGridPosition) break;
            }
            
            if (!this.pendingGridPosition) {
                alert('No empty spots in lower generations. Please click on an empty grid spot first.');
                return;
            }
        }
        
        this.currentAddType = 'child';
        this.currentParentId = personId;
        this.openAddPersonModal();
    }
    
    openEditPersonModal(personId) {
        console.log('Opening edit person modal for:', personId);
        // TODO: Integrate with existing edit modal
    }
    
    openDeletePersonModal(personId) {
        console.log('Opening delete person modal for:', personId);
        // TODO: Integrate with existing delete modal
    }
    
    // ===========================================
    // API INTEGRATION METHODS
    // ===========================================
    
    async createPerson(personData) {
        try {
            // Add grid position to person data
            if (this.pendingGridPosition) {
                personData.grid_row = this.pendingGridPosition.row;
                personData.grid_col = this.pendingGridPosition.col;
                console.log('*** ADDING GRID POSITION TO PERSON DATA ***');
                console.log('Grid position being added:', this.pendingGridPosition);
            }
            
            console.log('*** FINAL PERSON DATA BEING SENT TO API ***');
            console.log(JSON.stringify(personData, null, 2));
            
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Person created successfully:', result.person_id);
                
                // Create relationship if needed
                if (this.currentAddType && this.currentParentId) {
                    await this.createRelationship(this.currentParentId, result.person_id, this.currentAddType);
                }
                
                // Clear pending data
                this.pendingGridPosition = null;
                this.currentAddType = null;
                this.currentParentId = null;
                
                // Reload and re-render
                await this.loadTreeData();
                this.renderTree();
                
                return result;
            } else {
                throw new Error(result.message || 'Failed to create person');
            }
        } catch (error) {
            console.error('Error creating person:', error);
            throw error;
        }
    }
    
    async createRelationship(person1Id, person2Id, type) {
        try {
            const relationshipData = {
                family_id: parseInt(this.familyCode),
                person1_id: parseInt(person1Id),
                person2_id: parseInt(person2Id),
                relationship_type: type === 'spouse' ? 'spouse' : 'parent'
            };
            
            const response = await fetch('/familyTimeline/api/relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relationshipData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to create relationship');
            }
            
            console.log('Relationship created successfully');
            return result;
        } catch (error) {
            console.error('Error creating relationship:', error);
            throw error;
        }
    }
    
    // ===========================================
    // FORM INTEGRATION METHODS
    // ===========================================
    
    setupFormIntegration() {
        // Integrate with existing add person form
        const addPersonForm = document.getElementById('addPersonForm');
        if (addPersonForm) {
            addPersonForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAddPersonSubmit(e);
            });
        }
        
        // Set up other form integrations as needed
    }
    
    async handleAddPersonSubmit(e) {
        try {
            const formData = new FormData(e.target);
            
            const personData = {
                family_id: parseInt(this.familyCode),
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
            
            await this.createPerson(personData);
            
            // Close modal and reset form
            const modal = document.getElementById('addPersonModal');
            if (modal) modal.style.display = 'none';
            e.target.reset();
            
            this.showSuccessMessage(`${personData.first_name} added successfully!`);
            
        } catch (error) {
            console.error('Error adding person:', error);
            alert('Error adding person: ' + error.message);
        }
    }
    
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
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
}

// ===========================================
// CSS STYLES FOR GRID TREE
// ===========================================

const gridTreeStyles = `
    .grid-tree-canvas {
        width: 100%;
        height: 100vh;
        position: relative;
        cursor: grab;
        background: linear-gradient(135deg, #87CEEB 0%, #98D8C8 50%, #90EE90 100%);
        border-radius: 15px;
        overflow: hidden;
    }
    
    .grid-tree-canvas:active {
        cursor: grabbing;
    }
    
    .grid-tree-canvas.edit-mode {
        border: 3px dashed #4CAF50;
        background: linear-gradient(135deg, #87CEEB 0%, #98D8C8 50%, #90EE90 100%),
                    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);
        overflow: auto;
        cursor: default;
    }
    
    /* Scroll indicators for edit mode */
    .grid-tree-canvas.edit-mode.scrollable-x::after {
        content: "← Scroll horizontally →";
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 15px;
        border-radius: 15px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10;
    }
    
    .grid-tree-canvas.edit-mode.scrollable-y::before {
        content: "↑ Scroll vertically ↓";
        position: absolute;
        top: 50%;
        right: 10px;
        transform: translateY(-50%) rotate(90deg);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 15px;
        border-radius: 15px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10;
        transform-origin: center;
    }
    
    .grid-tree-controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        background: rgba(255,255,255,0.95);
        padding: 20px;
        border-radius: 20px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        backdrop-filter: blur(10px);
        min-width: 200px;
    }
    
    .control-group {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
    }
    
    .control-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(45deg, #4CAF50, #2E7D32);
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(76,175,80,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .control-btn:hover {
        background: linear-gradient(45deg, #45a049, #1B5E20);
        transform: scale(1.1);
        box-shadow: 0 6px 18px rgba(76,175,80,0.4);
    }
    
    .control-btn.edit-btn {
        background: linear-gradient(45deg, #FF9800, #F57C00);
        box-shadow: 0 4px 12px rgba(255,152,0,0.3);
    }
    
    .control-btn.edit-btn.active {
        background: linear-gradient(45deg, #2196F3, #1976D2);
        box-shadow: 0 4px 12px rgba(33,150,243,0.3);
    }
    
    .control-btn.edit-btn:hover {
        background: linear-gradient(45deg, #FB8C00, #E65100);
        box-shadow: 0 6px 18px rgba(255,152,0,0.4);
    }
    
    .large-btn {
        min-width: 120px;
        height: 45px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(45deg, #4CAF50, #2E7D32);
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(76,175,80,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 15px;
        white-space: nowrap;
    }
    
    .large-btn:hover {
        background: linear-gradient(45deg, #45a049, #1B5E20);
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(76,175,80,0.4);
    }
    
    .large-btn.edit-btn {
        background: linear-gradient(45deg, #FF9800, #F57C00);
        box-shadow: 0 4px 12px rgba(255,152,0,0.3);
        min-width: 140px;
    }
    
    .large-btn.edit-btn.active {
        background: linear-gradient(45deg, #2196F3, #1976D2);
        box-shadow: 0 4px 12px rgba(33,150,243,0.3);
    }
    
    .large-btn.edit-btn:hover {
        background: linear-gradient(45deg, #FB8C00, #E65100);
        box-shadow: 0 6px 18px rgba(255,152,0,0.4);
    }
    
    .large-btn.edit-btn.active:hover {
        background: linear-gradient(45deg, #1E88E5, #1565C0);
        box-shadow: 0 6px 18px rgba(33,150,243,0.4);
    }
    
    .reset-btn {
        width: 100%;
        height: 40px;
        border: none;
        border-radius: 10px;
        background: linear-gradient(45deg, #9C27B0, #7B1FA2);
        color: white;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 10px;
    }
    
    .reset-btn:hover {
        background: linear-gradient(45deg, #AB47BC, #8E24AA);
        transform: translateY(-1px);
    }
    
    #zoomLevel {
        font-size: 14px;
        font-weight: bold;
        color: #2E7D32;
        min-width: 60px;
        text-align: center;
        padding: 8px;
        background: rgba(255,255,255,0.8);
        border-radius: 12px;
        border: 2px solid rgba(46,125,50,0.2);
    }
    
    .grid-controls {
        flex-direction: column;
        width: 100%;
        gap: 10px;
        padding: 15px;
        background: rgba(76,175,80,0.1);
        border-radius: 15px;
        border: 2px solid rgba(76,175,80,0.2);
    }
    
    .grid-control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: #2E7D32;
    }
    
    .small-btn {
        width: 25px;
        height: 25px;
        border: none;
        border-radius: 50%;
        background: #4CAF50;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        margin: 0 2px;
        transition: all 0.3s ease;
    }
    
    .small-btn:hover {
        background: #45a049;
        transform: scale(1.1);
    }
    
    .person-node {
        transition: all 0.3s ease;
    }
    
    .person-node:hover {
        filter: brightness(1.1) drop-shadow(0 0 8px rgba(46,125,50,0.6));
    }
    
    .person-node[draggable="true"] {
        cursor: move;
    }
    
    .person-node[draggable="true"]:hover {
        transform: scale(1.05);
        filter: brightness(1.2) drop-shadow(0 0 12px rgba(46,125,50,0.8));
        transform-origin: center center; /* Keep scaling centered */
    }
    
    .grid-spot {
        transition: all 0.3s ease;
    }
    
    .grid-spot:hover {
        fill: rgba(46,125,50,0.8);
        r: 12;
        opacity: 1;
        cursor: pointer;
    }
    
    /* Drag and drop styles */
    .drop-zone-active {
        fill: rgba(33,150,243,0.4);
        stroke: #2196F3;
        stroke-width: 3;
        r: 15;
        opacity: 1;
        animation: dropZonePulse 1.5s infinite;
    }
    
    .drop-zone-hover {
        fill: rgba(76,175,80,0.8);
        stroke: #4CAF50;
        stroke-width: 4;
        r: 18;
        opacity: 1;
    }
    
    @keyframes dropZonePulse {
        0%, 100% { 
            r: 15;
            opacity: 0.6;
        }
        50% { 
            r: 18;
            opacity: 1;
        }
    }
    
    .context-menu {
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        border: 1px solid #ddd;
        padding: 8px 0;
        z-index: 1000;
        min-width: 180px;
        backdrop-filter: blur(10px);
    }
    
    .context-item {
        padding: 12px 20px;
        cursor: pointer;
        transition: background 0.2s ease;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #333;
    }
    
    .context-item:hover {
        background: linear-gradient(90deg, #f0f8ff, #e8f4f8);
        color: #2E7D32;
    }
    
    .context-separator {
        height: 1px;
        background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
        margin: 8px 0;
    }
    
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
    
    @media (max-width: 768px) {
        .grid-tree-controls {
            bottom: 10px;
            right: 10px;
            left: 10px;
            min-width: auto;
            padding: 15px;
        }
        
        .control-group {
            justify-content: space-around;
        }
        
        .grid-controls {
            flex-direction: row;
            justify-content: space-between;
        }
        
        .grid-control-row {
            flex-direction: column;
            gap: 5px;
        }
    }
`;

// Add styles to document
const gridStyleSheet = document.createElement('style');
gridStyleSheet.textContent = gridTreeStyles;
document.head.appendChild(gridStyleSheet);

// ===========================================
// INITIALIZATION
// ===========================================

// Initialize the grid family tree when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== GridFamilyTree DOMContentLoaded ===');
    
    const urlParams = new URLSearchParams(window.location.search);
    const familyCodeFromURL = urlParams.get('family');
    const familyCodeFromWindow = window.familyCode;
    
    const finalFamilyCode = familyCodeFromURL || familyCodeFromWindow;
    
    if (finalFamilyCode) {
        console.log('✅ Creating GridFamilyTree with familyCode:', finalFamilyCode);
        window.gridFamilyTree = new GridFamilyTree(finalFamilyCode);
        
        // Set up form integration after tree is created
        setTimeout(() => {
            if (window.gridFamilyTree) {
                window.gridFamilyTree.setupFormIntegration();
            }
        }, 100);
    } else {
        console.error('❌ No family code found! Cannot initialize grid tree.');
    }
});