/**
 * GridFamilyTree - A grid-based family tree system
 * Designed for manual positioning with automatic line drawing
 */
class NodeCustomization {
    constructor(familyTree) {
        this.familyTree = familyTree;
        this.setupCustomizationHandlers();
        
    }
    
    setupCustomizationHandlers() {
        // Color picker selection
        document.addEventListener('change', (e) => {
            if (e.target.type === 'color' && e.target.name === 'node_color') {
                this.handleColorPickerChange(e.target);
            }
        });
        
        // Real-time color updates as user drags
        document.addEventListener('input', (e) => {
            if (e.target.type === 'color' && e.target.name === 'node_color') {
                this.handleColorPickerChange(e.target);
            }
        });
        
        // Shape selection (keep existing)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('shape-option')) {
                this.handleShapeSelection(e.target);
            }
        });
    }
    
    handleColorPickerChange(colorPicker) {
        const form = colorPicker.closest('form');
        const selectedColor = colorPicker.value;
        
        // Update the color preview box
        const preview = form.querySelector('#colorPreview');
        if (preview) {
            const darkColor = this.darkenColor(selectedColor, 0.3);
            preview.style.background = `linear-gradient(45deg, ${selectedColor}, ${darkColor})`;
        }
        
        // Update SVG preview if it exists
        this.updatePreview(form, selectedColor, null);
    }

    // Add this helper function to NodeCustomization class
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const darkR = Math.floor(r * (1 - factor));
        const darkG = Math.floor(g * (1 - factor));
        const darkB = Math.floor(b * (1 - factor));
        
        return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
    }
    
    handleShapeSelection(shapeOption) {
        const form = shapeOption.closest('form');
        if (!form) return;
        
        // Remove selected class from all shape options in this form
        form.querySelectorAll('.shape-option').forEach(s => s.classList.remove('selected'));
        
        // Add selected class to clicked option
        shapeOption.classList.add('selected');
        
        // Update hidden input
        const shapeInput = form.querySelector('input[name="node_shape"]');
        const shape = shapeOption.getAttribute('data-shape');
        if (shapeInput) {
            shapeInput.value = shape;
        }
        
        // Update preview
        this.updatePreview(form, null, shape);
    }
    
    updatePreview(form, color, shape) {
        const previewNode = form.querySelector('#previewNode');
        const gradientStart = form.querySelector('#gradientStart');
        const gradientEnd = form.querySelector('#gradientEnd');
        
        if (!previewNode) return;
        
        // Get current values
        const currentColor = color || form.querySelector('input[name="node_color"]').value;
        const currentShape = shape || form.querySelector('input[name="node_shape"]').value;
        
        // Update colors - now using hex color directly
        if (currentColor) {
            const darkColor = this.darkenColor(currentColor, 0.3);
            if (gradientStart) gradientStart.style.stopColor = currentColor;
            if (gradientEnd) gradientEnd.style.stopColor = darkColor;
            previewNode.setAttribute('stroke', darkColor);
        }
        
        // Update shape
        this.updatePreviewShape(previewNode, currentShape);
    }
    
    updatePreviewShape(node, shape) {
        const svg = node.closest('svg');
        const cx = 40;
        const cy = 30;
        
        // Remove existing preview node
        const existingNode = svg.querySelector('#previewNode');
        if (existingNode) existingNode.remove();
        
        // Create new shape element based on type
        let newNode;
        
        switch (shape) {
            case 'circle':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                newNode.setAttribute('cx', cx);
                newNode.setAttribute('cy', cy);
                newNode.setAttribute('r', '20');
                break;
                
            case 'square':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                newNode.setAttribute('x', cx - 20);
                newNode.setAttribute('y', cy - 20);
                newNode.setAttribute('width', '40');
                newNode.setAttribute('height', '40');
                break;
                
            case 'diamond':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                newNode.setAttribute('x', cx - 15);
                newNode.setAttribute('y', cy - 15);
                newNode.setAttribute('width', '30');
                newNode.setAttribute('height', '30');
                newNode.setAttribute('transform', `rotate(45 ${cx} ${cy})`);
                break;
                
            case 'hexagon':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const hexPoints = [
                    [cx,           cy - 18 * s],
                    [cx + 16 * s,  cy - 9  * s],
                    [cx + 16 * s,  cy + 9  * s],
                    [cx,           cy + 18 * s],
                    [cx - 16 * s,  cy + 9  * s],
                    [cx - 16 * s,  cy - 9  * s],
                ];
                newNode.setAttribute('points', hexPoints.map(p => p.join(',')).join(' '));
                break;
                
            case 'star':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const starOffsets = [
                    [  0, -18], [  5,  -6], [ 17,  -6], [  7,   2],
                    [ 11,  14], [  0,   7], [-11,  14], [ -7,   2],
                    [-17,  -6], [ -5,  -6]
                ].map(([dx,dy]) => [cx + dx * s, cy + dy * s]);
                newNode.setAttribute('points', starOffsets.map(p => p.join(',')).join(' '));
                break;
                
            case 'triangle':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const triPoints = [
                    [cx, cy - 18],      // top point
                    [cx - 16, cy + 13], // bottom left
                    [cx + 16, cy + 13]  // bottom right
                ];
                newNode.setAttribute('points', triPoints.map(p => p.join(',')).join(' '));
                break;
                
            default:
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                newNode.setAttribute('cx', cx);
                newNode.setAttribute('cy', cy);
                newNode.setAttribute('r', '20');
        }
        
        // Apply common attributes
        newNode.setAttribute('id', 'previewNode');
        newNode.setAttribute('fill', 'url(#previewGradient)');
        newNode.setAttribute('stroke', '#228B22');
        newNode.setAttribute('stroke-width', '2');
        
        // Insert back into SVG
        svg.appendChild(newNode);
    }
    
    // Load customization from person data
    loadPersonCustomization(person, form) {
        const nodeColor = person.node_color || '#90EE90';
        const nodeShape = person.node_shape || 'circle';
        
        // Update color picker value
        const colorPicker = form.querySelector('input[name="node_color"]');
        if (colorPicker) {
            colorPicker.value = nodeColor;
            
            // Update color preview
            const preview = form.querySelector('#colorPreview');
            if (preview) {
                const darkColor = this.darkenColor(nodeColor, 0.3);
                preview.style.background = `linear-gradient(45deg, ${nodeColor}, ${darkColor})`;
            }
        }
        
        // Update shape selection
        const shapeOption = form.querySelector(`.shape-option[data-shape="${nodeShape}"]`);
        if (shapeOption) {
            form.querySelectorAll('.shape-option').forEach(s => s.classList.remove('selected'));
            shapeOption.classList.add('selected');
            form.querySelector('input[name="node_shape"]').value = nodeShape;
        }
        
        // Update preview
        this.updatePreview(form, nodeColor, nodeShape);
    }
}

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

        // Relationship creation state
        this.isConnecting = false;
        this.connectionMode = null; // 'spouse' or 'parent'
        this.firstPersonSelected = null;
        this.connectionPreview = null;
        
        // Drag and drop state
        this.isDragging = false;
        this.draggedPerson = null;
        this.dragStartPos = null;
        this.dragPreviewElement = null;
        this.draggedElement = null; // Add this to store reference to dragged element
        this.dragOffset = { x: 0, y: 0 };

        this.nodeCustomization = new NodeCustomization(this);
        
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
    
    // Add relationship creation controls to your UI
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
                    <g id="connectionPreview"></g>
                    <g id="people"></g>
                </svg>
            </div>
            
            <!-- Tree Controls -->
            <div class="tree-controls">
                <!-- View Controls -->
                <div id="viewControls" class="zoom-controls">
                    <button id="zoomOut" class="control-btn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="control-btn">+</button>
                </div>
                <button id="centerTreeBtn">🎯 Center Tree</button>
                
                <!-- Edit Controls -->
                <div id="editControls" class="control-group" style="display: none;">
                    <button id="toggleEditMode" class="btn primary" style="width: 100%;">✏️ Edit Tree</button>
                </div>
                
                <!-- Connection Tools (Edit Mode Only) -->
                <div id="connectionControls" class="connection-tools" style="display: none;">
                    <button id="connectSpouse" class="connection-btn spouse-btn" title="Connect Spouses">💑 Spouse</button>
                    <button id="connectParent" class="connection-btn parent-btn" title="Connect Parent & Child">👨‍👧‍👦 Parent</button>
                    <button id="cancelConnection" class="connection-btn cancel-btn" title="Cancel Connection" style="display: none;">❌ Cancel</button>
                </div>
                
                <!-- Grid Size Controls -->
                <div id="gridSizeControls" class="grid-controls" style="display: none;">
                    <div class="grid-control-group">
                        <label>Generations: <span id="gridRowsValue">${this.gridRows}</span></label>
                        <div>
                            <button id="gridRowsDown" class="grid-btn">-</button>
                            <button id="gridRowsUp" class="grid-btn">+</button>
                        </div>
                    </div>
                    <div class="grid-control-group">
                        <label>Positions: <span id="gridColsValue">${this.gridCols}</span></label>
                        <div>
                            <button id="gridColsDown" class="grid-btn">-</button>
                            <button id="gridColsUp" class="grid-btn">+</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Connection Status Message -->
            <div id="connectionStatus" class="connection-status" style="display: none;">
                <span id="connectionMessage">Click first person to connect</span>
            </div>
            
            <!-- Context Menu -->
            <div id="contextMenu" class="context-menu" style="display: none;">
                <div id="viewStories" class="context-item">📖 View Stories</div>
                <div id="addStory"    class="context-item">✍️ Add Story</div>
                <div class="context-separator"></div>
                <div id="editPerson"  class="context-item">✏️ Edit Person</div>
                <div id="deletePerson"class="context-item">🗑️ Delete Person</div>
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

        // Flip edit mode
        this.isEditMode = !this.isEditMode;
        console.log('Edit mode:', this.isEditMode);

        // Update buttons/UI
        this.updateEditModeUI();

        // Re-center the tree on every mode switch
        this.centerTree();

        // Finally, re-render everything
        this.renderTree();
    }
    
    updateEditModeUI() {
        const editButton = document.getElementById('toggleEditMode');
        const gridControls = document.getElementById('gridSizeControls');
        const viewControls = document.getElementById('viewControls');
        const connectionControls = document.getElementById('connectionControls');
        const canvas = document.querySelector('.grid-tree-canvas');
        
        if (editButton) {
            editButton.textContent = this.isEditMode ? '👁️ View Mode' : '✏️ Edit Tree';
            editButton.classList.toggle('active', this.isEditMode);
        }
        
        if (gridControls) {
            gridControls.style.display = this.isEditMode ? 'flex' : 'none';
        }
        
        if (connectionControls) {
            connectionControls.style.display = this.isEditMode ? 'flex' : 'none';
        }
        
        if (viewControls) {
            viewControls.style.display = this.isEditMode ? 'none' : 'flex';
        }
        
        if (canvas) {
            canvas.classList.toggle('edit-mode', this.isEditMode);
        }
        
        // Cancel any active connections when leaving edit mode
        if (!this.isEditMode && this.isConnecting) {
            this.cancelConnection();
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
    
/**
 * Render a single person node—respecting node_color & node_shape,
 * and attach all event handlers to the <g> wrapper.
 */
    createPersonNode(container, person) {
        const ns     = 'http://www.w3.org/2000/svg';
        const size   = 40;
        const s = size / 20;
        const coords = this.gridToPixelCoordinates(person.grid_row, person.grid_col);

        // 1) Create a <g> wrapper for this person
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.style.cursor = this.isEditMode && !this.isConnecting ? 'move' : 'pointer';

        // 2) Determine fill & stroke
        const fillColor   = person.node_color || '#90EE90';
        const strokeColor = this.nodeCustomization.darkenColor(fillColor, 0.3);

        // 3) Draw the shape
        let shapeEl;
        switch (person.node_shape) {
            case 'square':
                shapeEl = document.createElementNS(ns, 'rect');
                shapeEl.setAttribute('x', coords.x - size);
                shapeEl.setAttribute('y', coords.y - size);
                shapeEl.setAttribute('width', 2 * size);
                shapeEl.setAttribute('height', 2 * size);
                break;
            case 'diamond':
                shapeEl = document.createElementNS(ns, 'rect');
                shapeEl.setAttribute('x', coords.x - size * 0.75);
                shapeEl.setAttribute('y', coords.y - size * 0.75);
                shapeEl.setAttribute('width', size * 1.5);
                shapeEl.setAttribute('height', size * 1.5);
                shapeEl.setAttribute('transform', `rotate(45 ${coords.x} ${coords.y})`);
                break;
            case 'hexagon':
                shapeEl = document.createElementNS(ns, 'polygon');
                const hex = [
                    [  0, -18],
                    [ 16,  -9],
                    [ 16,   9],
                    [  0,  18],
                    [-16,   9],
                    [-16,  -9],
                ].map(([dx, dy]) => `${coords.x + dx * s},${coords.y + dy * s}`);
                shapeEl.setAttribute('points', hex.join(' '));
                break;

            case 'star':
                shapeEl = document.createElementNS(ns,'polygon');
                const starOffsets = [
                    [  0, -18], [  5,  -6], [ 17,  -6], [  7,   2],
                    [ 11,  14], [  0,   7], [-11,  14], [ -7,   2],
                    [-17,  -6], [ -5,  -6]
                ].map(([dx,dy]) => `${coords.x + dx * s},${coords.y + dy * s}`);
                shapeEl.setAttribute('points', starOffsets.join(' '));
                break;
            case 'triangle':
                shapeEl = document.createElementNS(ns,'polygon');
                const tri = [
                    [  0, -18],
                    [-16,  13],
                    [ 16,  13]
                ].map(([dx,dy]) => `${coords.x + dx * s},${coords.y + dy * s}`);
                shapeEl.setAttribute('points', tri.join(' '));
                break;
            case 'circle':
            default:
            shapeEl = document.createElementNS(ns, 'circle');
            shapeEl.setAttribute('cx', coords.x);
            shapeEl.setAttribute('cy', coords.y);
            shapeEl.setAttribute('r', size);
        }
        shapeEl.setAttribute('fill', fillColor);
        shapeEl.setAttribute('stroke', strokeColor);
        shapeEl.setAttribute('stroke-width', '3');
        shapeEl.setAttribute('filter', 'url(#personShadow)');
        group.appendChild(shapeEl);

        // 4) Story‐count indicator
        if (person.story_count > 0) {
            const ind = document.createElementNS(ns, 'circle');
            ind.setAttribute('cx', coords.x + size + 5);
            ind.setAttribute('cy', coords.y - size - 5);
            ind.setAttribute('r', '8');
            ind.setAttribute('fill', '#FFD700');
            ind.setAttribute('stroke', '#FFA500');
            ind.setAttribute('stroke-width', '2');
            group.appendChild(ind);

            const icon = document.createElementNS(ns, 'text');
            icon.setAttribute('x', coords.x + size + 5);
            icon.setAttribute('y', coords.y - size + 2);
            icon.setAttribute('text-anchor', 'middle');
            icon.setAttribute('font-size', '10');
            icon.textContent = '📖';
            group.appendChild(icon);
        }

        // 5) Name label
        const nameLabel = document.createElementNS(ns, 'text');
        nameLabel.setAttribute('x', coords.x);
        nameLabel.setAttribute('y', coords.y + size + 25);
        nameLabel.setAttribute('text-anchor', 'middle');
        nameLabel.setAttribute('font-family', 'Arial, sans-serif');
        nameLabel.setAttribute('font-size', '12');
        nameLabel.setAttribute('font-weight', 'bold');
        nameLabel.setAttribute('fill', '#2F4F2F');
        nameLabel.textContent = `${person.first_name} ${person.last_name || ''}`.trim();
        group.appendChild(nameLabel);

        // 6) Click handler (context‐menu)
        group.addEventListener('click', e => {
        e.stopPropagation();

        // 1) In edit+connecting mode, route into your connection logic
        if (this.isEditMode && this.isConnecting) {
            this.handleConnectionClick(person.id, e);
            return;
        }

        // 2) Otherwise (view mode), show the context menu
        if (!this.isEditMode) {
            this.showContextMenu(person.id, e.clientX, e.clientY);
        }
        });

        // 7) Drag & drop (edit mode)
        if (this.isEditMode && !this.isConnecting) {
            this.setupPersonDragAndDrop(group, person);
        }

        // Finally, add to container
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
        this.setupModalEventListeners();
        this.setupFormHandlers();

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
        
        document.getElementById('centerTreeBtn')?.addEventListener('click', () => {
            this.centerTree();
        });
    }
    
    setupEditControls() {
        // Edit mode toggle
        document.getElementById('toggleEditMode')?.addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Connection controls
        document.getElementById('connectSpouse')?.addEventListener('click', () => {
            this.startConnection('spouse');
        });
        
        document.getElementById('connectParent')?.addEventListener('click', () => {
            this.startConnection('parent');
        });
        
        document.getElementById('cancelConnection')?.addEventListener('click', () => {
            this.cancelConnection();
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

    startConnection(type) {
        console.log(`🔗 Starting connection mode: ${type}`);
        
        this.isConnecting = true;
        this.connectionMode = type;
        this.firstPersonSelected = null;
        
        // Update UI
        this.updateConnectionUI();
        
        // Show status message
        this.showConnectionStatus(`Click first person to connect as ${type === 'spouse' ? 'spouses' : 'parent & child'}`);
        
        // Highlight all people as selectable
        this.highlightSelectablePeople();
        
        // Re-render to update drag/drop behavior
        this.renderPeople();
    }
    
    cancelConnection() {
        console.log('❌ Canceling connection mode');
        
        this.isConnecting = false;
        this.connectionMode = null;
        this.firstPersonSelected = null;
        
        // Clear preview line
        this.clearConnectionPreview();
        
        // Update UI
        this.updateConnectionUI();
        
        // Hide status message
        this.hideConnectionStatus();
        
        // Remove highlights
        this.clearPersonHighlights();
        
        // Re-render to restore drag/drop behavior
        this.renderPeople();
    }

    updateConnectionUI() {
        const spouseBtn = document.getElementById('connectSpouse');
        const parentBtn = document.getElementById('connectParent');
        const cancelBtn = document.getElementById('cancelConnection');
        
        if (spouseBtn) spouseBtn.classList.toggle('active', this.connectionMode === 'spouse');
        if (parentBtn) parentBtn.classList.toggle('active', this.connectionMode === 'parent');
        if (cancelBtn) cancelBtn.style.display = this.isConnecting ? 'block' : 'none';
        
        // Change cursor style when in connection mode
        const canvas = document.querySelector('.grid-tree-canvas');
        if (canvas) {
            canvas.classList.toggle('connecting', this.isConnecting);
        }
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
        const viewStoriesBtn = document.getElementById('viewStories');
        const addStoryBtn    = document.getElementById('addStory');
        const editPersonBtn  = document.getElementById('editPerson');
        const deletePersonBtn= document.getElementById('deletePerson');

        viewStoriesBtn?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openPersonDetailModal(this.selectedPerson);
        });

        addStoryBtn?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openAddStoryModal(this.selectedPerson);
        });

        editPersonBtn?.addEventListener('click', () => {
            this.hideContextMenu();
            if (this.selectedPerson) {
            this.openEditPersonModal(this.selectedPerson);
            }
        });

        deletePersonBtn?.addEventListener('click', () => {
            this.hideContextMenu();
            this.openDeleteConfirmationModal(this.selectedPerson);
        });

        // hide on outside click
        document.addEventListener('click', e => {
            if (!e.target.closest('#contextMenu') && !e.target.closest('.person-node')) {
            this.hideContextMenu();
            }
        });
    }

    setupModalEventListeners() {
        // close when clicking an <span class="close">×</span>
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
            }
        });
        // close when clicking on the backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            }
        });
        // hook up the “Add Story” from the person‐detail modal
        // “Add Story” button in the person‐detail modal
        document.getElementById('addStoryFromModal')?.addEventListener('click', () => {
            if (this.selectedPerson) {
                this.openAddStoryModal(this.selectedPerson);
            }
        });
    }



    
    // ===========================================
    // DRAG AND DROP FUNCTIONALITY
    // ===========================================
    
    // Setup person drag and drop (only when not connecting)
    setupPersonDragAndDrop(personElement, person) {
        // Don't setup drag if we're in connection mode
        if (this.isConnecting) {
            personElement.style.cursor = 'pointer';
            return;
        }
        
        personElement.style.cursor = 'move';
        
        // Use mouse events for drag and drop
        personElement.addEventListener('mousedown', (e) => {
            // Only allow dragging if not in connection mode
            if (!this.isConnecting) {
                this.handleMouseDown(e, person);
            }
        });
    }
    
    // Simple and clean handleMouseDown
    handleMouseDown(e, person) {
        // Only allow left mouse button
        if (e.button !== 0) return;
        
        console.log(`🖱️ MOUSE DOWN: Starting drag for ${person.first_name}`);
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.draggedPerson = person;
        this.dragStartPos = { row: person.grid_row, col: person.grid_col };
        
        // No offset needed - ghost will be centered on cursor
        this.dragOffset = { x: 0, y: 0 };
        
        // Create ghost image
        this.createGhostElement(person, e.currentTarget);
        
        // Style original element to show it's being dragged
        e.currentTarget.style.opacity = '0.5';
        e.currentTarget.style.filter = 'grayscale(1)';
        
        // Show drop zones
        this.showDropZones();
        
        // Add global mouse events
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Hide cursor since ghost replaces it
        document.body.style.cursor = 'none';
        
        console.log('🎯 Ghost drag initialized');
    }

    // Create a ghost element that follows the mouse
    createGhostElement(person, originalElement) {
        // Create ghost container
        this.ghostElement = document.createElement('div');
        this.ghostElement.className = 'drag-ghost';
        
        // Style the ghost
        this.ghostElement.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            transform-origin: center center;
            transform: scale(0.8);
            opacity: 0.8;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
            background: white;
            border-radius: 50%;
            padding: 5px;
            border: 3px solid #4CAF50;
            width: 70px;
            height: 70px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            animation: ghostBounce 0.3s ease-out;
        `;
        
        // Create ghost content (simplified version of the person node)
        const coords = this.gridToPixelCoordinates(person.grid_row, person.grid_col);
        
        // Person circle (as CSS background instead of SVG)
        const circle = document.createElement('div');
        circle.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #90EE90, #228B22);
            border: 2px solid #228B22;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
            font-weight: bold;
            margin-bottom: 2px;
        `;
        
        // Add initials or emoji to the circle
        const initials = `${person.first_name[0]}${(person.last_name && person.last_name[0]) || ''}`;
        circle.textContent = initials;
        
        // Person name
        const nameLabel = document.createElement('div');
        nameLabel.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            color: #2F4F2F;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 60px;
        `;
        nameLabel.textContent = `${person.first_name}`;
        
        // Add story indicator if needed
        if (person.story_count > 0) {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 16px;
                height: 16px;
                background: #FFD700;
                border: 2px solid #FFA500;
                border-radius: 50%;
                font-size: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            indicator.textContent = '📖';
            this.ghostElement.appendChild(indicator);
        }
        
        this.ghostElement.appendChild(circle);
        this.ghostElement.appendChild(nameLabel);
        
        // Add to body
        document.body.appendChild(this.ghostElement);
        
        console.log('👻 Ghost element created');
    }

    // Simple mouse move - center ghost on cursor
    handleMouseMove(e) {
        if (!this.isDragging || !this.ghostElement) return;
        
        // Center ghost directly on mouse cursor
        const ghostWidth = 70; // Width of ghost element
        const ghostHeight = 70; // Height of ghost element
        
        const newX = e.clientX - (ghostWidth / 2);
        const newY = e.clientY - (ghostHeight / 2);
        
        this.ghostElement.style.left = newX + 'px';
        this.ghostElement.style.top = newY + 'px';
        
        // Find what element we're over
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        
        // Remove previous hover effects
        document.querySelectorAll('.drop-zone-hover').forEach(zone => {
            zone.classList.remove('drop-zone-hover');
        });
        
        // Check if we're over a drop zone
        if (elementBelow && elementBelow.classList.contains('grid-click-area')) {
            elementBelow.classList.add('drop-zone-hover');
            
            // Add visual feedback to ghost - make it green when over valid drop zone
            this.ghostElement.style.transform = 'scale(0.9)';
            this.ghostElement.style.filter = 'drop-shadow(0 8px 16px rgba(76,175,80,0.5))';
            this.ghostElement.style.borderColor = '#4CAF50';
            this.ghostElement.style.background = 'rgba(76,175,80,0.1)';
        } else {
            // Reset ghost visual feedback - red when not over valid drop zone
            this.ghostElement.style.transform = 'scale(0.8)';
            this.ghostElement.style.filter = 'drop-shadow(0 8px 16px rgba(220,53,69,0.5))';
            this.ghostElement.style.borderColor = '#dc3545';
            this.ghostElement.style.background = 'rgba(220,53,69,0.1)';
        }
    }

    // Clean handleMouseUp
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

    // Simple cleanup
    endDrag() {
        console.log('🧹 CLEANING UP DRAG');
        
        // Remove global mouse events
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Restore cursor
        document.body.style.cursor = 'default';
        document.body.classList.remove('dragging');
        
        // Remove ghost element
        if (this.ghostElement) {
            // Add fade out animation
            this.ghostElement.style.transition = 'all 0.2s ease-out';
            this.ghostElement.style.opacity = '0';
            this.ghostElement.style.transform = 'scale(0.5)';
            
            setTimeout(() => {
                if (this.ghostElement && this.ghostElement.parentNode) {
                    this.ghostElement.parentNode.removeChild(this.ghostElement);
                }
                this.ghostElement = null;
            }, 200);
        }
        
        // Reset original element styling
        document.querySelectorAll('.person-node').forEach(node => {
            node.style.opacity = '1';
            node.style.filter = 'none';
        });
        
        // Reset drag state
        this.isDragging = false;
        this.draggedPerson = null;
        this.dragStartPos = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Hide drop zones
        this.hideDropZones();
        
        console.log('✅ Drag cleanup complete');
    }

    // Simple revert
    revertDrag() {
        // Show error message
        this.showErrorMessage('Cannot drop there - position is occupied or invalid');
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
        if (this.isConnecting) {
            this.handleConnectionClick(personId, event);
            return;
        }
        
        // Normal person click behavior (context menu, etc.)
        if (!this.isEditMode) {
            this.selectedPerson = personId;
            this.showContextMenu(personId, event);
        }
    }

    handleConnectionClick(personId, event) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        if (!this.firstPersonSelected) {
            // Select first person
            this.firstPersonSelected = person;
            console.log(`👤 First person selected: ${person.first_name}`);
            
            // Highlight selected person
            this.highlightSelectedPerson(personId);
            
            // Update status message
            this.showConnectionStatus(`Click second person to connect with ${person.first_name}`);
            
            // Start showing preview line
            this.startConnectionPreview(person);
            
        } else if (this.firstPersonSelected.id === personId) {
            // Clicked same person - deselect
            this.firstPersonSelected = null;
            this.clearConnectionPreview();
            this.clearPersonHighlights();
            this.highlightSelectablePeople();
            this.showConnectionStatus(`Click first person to connect as ${this.connectionMode === 'spouse' ? 'spouses' : 'parent & child'}`);
            
        } else {
            // Select second person - create connection
            console.log(`👥 Connecting ${this.firstPersonSelected.first_name} with ${person.first_name}`);
            this.createConnection(this.firstPersonSelected, person);
        }
    }

    // Create the relationship connection
    async createConnection(person1, person2) {
        try {
            // Validate the connection
            const validation = this.validateConnection(person1, person2, this.connectionMode);
            if (!validation.valid) {
                this.showErrorMessage(validation.message);
                return;
            }
            
            // Create the relationship
            console.log(`Creating ${this.connectionMode} relationship between ${person1.first_name} and ${person2.first_name}`);
            
            await this.createRelationship(person1.id, person2.id, this.connectionMode);
            
            // Success!
            this.showSuccessMessage(`${person1.first_name} and ${person2.first_name} connected as ${this.connectionMode === 'spouse' ? 'spouses' : 'parent & child'}!`);
            
            // Refresh the tree
            await this.loadTreeData();
            this.renderTree();
            
            // Reset connection mode
            this.cancelConnection();
            
        } catch (error) {
            console.error('Error creating connection:', error);
            this.showErrorMessage('Failed to create connection: ' + error.message);
        }
    }

    // Validate if a connection is allowed
    validateConnection(person1, person2, type) {
        // Check if relationship already exists
        const existingRel = this.relationships.find(rel => 
            rel.relationship_type === type &&
            ((rel.person1_id === person1.id && rel.person2_id === person2.id) ||
            (rel.person1_id === person2.id && rel.person2_id === person1.id))
        );
        
        if (existingRel) {
            return { valid: false, message: `${person1.first_name} and ${person2.first_name} are already connected as ${type}s` };
        }
        
        if (type === 'spouse') {
            // Check if either person already has a spouse
            const person1Spouse = this.getSpouse(person1.id);
            const person2Spouse = this.getSpouse(person2.id);
            
            if (person1Spouse) {
                return { valid: false, message: `${person1.first_name} is already married to ${person1Spouse.first_name}` };
            }
            
            if (person2Spouse) {
                return { valid: false, message: `${person2.first_name} is already married to ${person2Spouse.first_name}` };
            }
        }
        
        if (type === 'parent') {
            // Could add more validation here (age checks, etc.)
        }
        
        return { valid: true };
    }

    // Visual feedback functions
    highlightSelectablePeople() {
        document.querySelectorAll('.person-node').forEach(node => {
            node.classList.add('selectable');
        });
    }

    highlightSelectedPerson(personId) {
        this.clearPersonHighlights();
        document.querySelectorAll('.person-node').forEach(node => {
            if (node.dataset.personId === personId.toString()) {
                node.classList.add('selected');
            } else {
                node.classList.add('selectable');
            }
        });
    }

    clearPersonHighlights() {
        document.querySelectorAll('.person-node').forEach(node => {
            node.classList.remove('selectable', 'selected');
        });
    }

    // Connection preview (line that follows mouse)
    startConnectionPreview(person) {
        const coords = this.gridToPixelCoordinates(person.grid_row, person.grid_col);
        this.connectionPreviewStart = coords;
        
        // Add mouse move listener for preview
        document.addEventListener('mousemove', this.updateConnectionPreview.bind(this));
    }

    updateConnectionPreview(e) {
        if (!this.isConnecting || !this.firstPersonSelected) return;
        
        const svg = document.getElementById('gridTreeSVG');
        const svgRect = svg.getBoundingClientRect();
        
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;
        
        this.drawConnectionPreview(this.connectionPreviewStart, { x: mouseX, y: mouseY });
    }

    drawConnectionPreview(start, end) {
        const container = document.getElementById('connectionPreview');
        if (!container) return;
        
        const color = this.connectionMode === 'spouse' ? '#DC143C' : '#8B4513';
        const strokeWidth = this.connectionMode === 'spouse' ? '4' : '3';
        
        container.innerHTML = `
            <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" 
                stroke="${color}" stroke-width="${strokeWidth}" 
                stroke-dasharray="5,5" opacity="0.7"/>
        `;
    }

    clearConnectionPreview() {
        const container = document.getElementById('connectionPreview');
        if (container) container.innerHTML = '';
        
        document.removeEventListener('mousemove', this.updateConnectionPreview.bind(this));
    }

    // Status message functions
    showConnectionStatus(message) {
        const status = document.getElementById('connectionStatus');
        const messageEl = document.getElementById('connectionMessage');
        
        if (status && messageEl) {
            messageEl.textContent = message;
            status.style.display = 'block';
        }
    }

    hideConnectionStatus() {
        const status = document.getElementById('connectionStatus');
        if (status) {
            status.style.display = 'none';
        }
    }

    startConnectionFromContext(type) {
        // Start connection mode with first person already selected
        this.startConnection(type);
        this.firstPersonSelected = this.people.find(p => p.id === this.selectedPerson);
        this.highlightSelectedPerson(this.selectedPerson);
        this.showConnectionStatus(`Click second person to connect with ${this.firstPersonSelected.first_name}`);
        this.startConnectionPreview(this.firstPersonSelected);
        this.hideContextMenu();
    }
    
    handleGridClick(row, col) {
        console.log(`Grid clicked: [${row}, ${col}]`);
        this.pendingGridPosition = { row, col };
        this.openAddPersonModal();
    }
    
    showContextMenu(personId, x, y) {
        this.selectedPerson = personId;
        const menu = document.getElementById('contextMenu');
        menu.style.left    = `${x}px`;
        menu.style.top     = `${y}px`;
        menu.style.display = 'block';
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

                // if we were in edit‐mode, re-show all the edit UI (grid overlay, buttons, scrolling)
                if ( this.isEditMode ) {
                    this.updateEditModeUI();
                    this.enableGridScrolling();
                }
                
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

            e.preventDefault();
            e.stopPropagation();

            // 1) force edit mode ON *before* we re-render
            this.isEditMode = true;
            this.updateEditModeUI();
            this.enableGridScrolling();
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
                bio_summary: formData.get('bio_summary'),
                node_color: formData.get('node_color'),
                node_shape: formData.get('node_shape'),
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

    // Edit person and story modals
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

    async handleDeletePerson(personId) {
        try {
            const res = await fetch(`/familyTimeline/api/person/${personId}`, {
            method: 'DELETE'
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || 'Delete failed');
            this.showSuccessMessage('Person deleted successfully');
            // hide the modal
            document.getElementById('deleteConfirmModal').style.display = 'none';
            // reload + re-render, keeping edit mode
            await this.loadTreeData();
            this.renderTree();
            if (this.isEditMode) {
            this.updateEditModeUI();
            this.enableGridScrolling();
            }
        } catch (err) {
            console.error(err);
            this.showErrorMessage('Couldn’t delete: ' + err.message);
        }
    }

    async handleEditPersonSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // gather data
        const personId = formData.get('person_id');
        const payload = {
            first_name:    formData.get('first_name'),
            last_name:     formData.get('last_name'),
            maiden_name:   formData.get('maiden_name'),
            nickname:      formData.get('nickname'),
            birth_date:    formData.get('birth_date'),
            death_date:    formData.get('death_date'),
            birth_place:   formData.get('birth_place'),
            gender:        formData.get('gender'),
            is_living:     formData.get('is_living') === 'on',
            bio_summary:   formData.get('bio_summary'),
            node_color:    formData.get('node_color'),
            node_shape:    formData.get('node_shape')
        };

        // optional photo
        const file = formData.get('photo');
        if (file && file.size > 0) {
            payload.photo_data = await this.fileToBase64(file);
            payload.photo_filename = file.name;
        }

        try {
            const res = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || 'Save failed');

            // close, notify & refresh
            document.getElementById('editPersonModal').style.display = 'none';
            this.showSuccessMessage('Person updated!');
            await this.loadTreeData();
            this.renderTree();
        } catch (err) {
            console.error(err);
            this.showErrorMessage('Update failed: ' + err.message);
        }
    }

    async handleStorySubmit(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);

        const payload = {
            family_id:    parseInt(this.familyCode),
            person_id:     fd.get('person_id'),
            title:         fd.get('title'),
            author_name:   fd.get('author_name'),
            theme:         fd.get('theme'),
            time_period:   fd.get('time_period'),
            year_occurred: fd.get('year_occurred'),
            story_text:    fd.get('story_text'),
            is_featured:   fd.get('is_featured') === 'on'
        };

        const file = fd.get('photo');
        if (file && file.size > 0) {
            payload.photo_data = await this.fileToBase64(file);
            payload.photo_filename = file.name;
        }

        try {
            const res = await fetch('/familyTimeline/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || 'Save failed');

            // close modal & refresh stories in detail view
            document.getElementById('addStoryModal').style.display = 'none';
            this.showSuccessMessage('Story saved!');
            // if the detail modal is open, reload its stories:
            if (document.getElementById('personModal').style.display === 'block') {
                this.openPersonDetailModal(payload.person_id);
            }
        } catch (err) {
            console.error(err);
            this.showErrorMessage('Saving story failed: ' + err.message);
        }
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

        if (this.nodeCustomization) {
            this.nodeCustomization.loadPersonCustomization(person, document.getElementById('editPersonForm'));
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
        console.log('=== DEBUG: openAddStoryModal called ===');
        console.log('personId:', personId);
        console.log('window.currentUser:', window.currentUser);
        
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
            
            // Pre-fill the author name with the current user's name
            const authorInput = document.getElementById('storyAuthor');
            if (authorInput && window.currentUser) {
                authorInput.value = window.currentUser.name;
                authorInput.readOnly = true; // Make it read-only since it's the logged-in user
                authorInput.style.backgroundColor = '#f5f5f5'; // Visual indication it's read-only
            }
            
            modal.style.display = 'block';
            document.getElementById('storyForm').reset();
            
            // Re-set the author after reset
            if (authorInput && window.currentUser) {
                authorInput.value = window.currentUser.name;
            }
            
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
        // Store current person ID for the Add Story button
        this.selectedPerson = person.id;
        
        // Update modal content
        document.getElementById('personName').textContent = 
            `${person.first_name} ${person.last_name || ''}`.trim();
        
        // Show basic person info in the header details
        document.getElementById('personDetails').innerHTML = `
            <div style="color: #666; font-size: 14px; line-height: 1.4;">
                ${person.birth_date ? `Born: ${new Date(person.birth_date).toLocaleDateString()}` : ''}
                ${person.birth_date && !person.is_living && person.death_date ? ' | ' : ''}
                ${!person.is_living && person.death_date ? `Died: ${new Date(person.death_date).toLocaleDateString()}` : ''}
                ${!person.is_living && !person.death_date ? '(Deceased)' : ''}
            </div>
        `;
        
        // Display stories directly (no tabs needed)
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
}



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
        
    } else {
        console.error('❌ No family code found! Cannot initialize grid tree.');
    }
});