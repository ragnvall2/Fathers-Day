/**
 * Simplified Family Tree - Heart-based connections
 * Click nodes for context menu: Add Spouse, Add Child, Edit, Delete
 */

const NODE_COLORS = {
    green: { start: '#90EE90', end: '#228B22', stroke: '#228B22' },
    blue: { start: '#87CEEB', end: '#1E90FF', stroke: '#1E90FF' },
    purple: { start: '#DDA0DD', end: '#8A2BE2', stroke: '#8A2BE2' },
    pink: { start: '#FFB6C1', end: '#FF69B4', stroke: '#FF69B4' },
    orange: { start: '#FFA500', end: '#FF8C00', stroke: '#FF8C00' },
    red: { start: '#FF6347', end: '#DC143C', stroke: '#DC143C' },
    gold: { start: '#FFD700', end: '#B8860B', stroke: '#B8860B' },
    silver: { start: '#E0E0E0', end: '#C0C0C0', stroke: '#C0C0C0' }
};

function createStarPath(cx, cy, size) {
    const outerRadius = size;
    const innerRadius = size * 0.4;
    const points = 5;
    let path = '';
    
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        
        if (i === 0) {
            path += `M ${x} ${y}`;
        } else {
            path += ` L ${x} ${y}`;
        }
    }
    
    return path + ' Z';
}

function createHeartPath(cx, cy, size) {
    const scale = size / 10; // Changed from 20 to 10 to make it bigger
    return `M ${cx},${cy + 3 * scale} 
            C ${cx},${cy + 1 * scale} ${cx - 6 * scale},${cy - 3 * scale} ${cx - 6 * scale},${cy - 5 * scale}
            C ${cx - 6 * scale},${cy - 7 * scale} ${cx - 3 * scale},${cy - 7 * scale} ${cx},${cy - 5 * scale}
            C ${cx + 3 * scale},${cy - 7 * scale} ${cx + 6 * scale},${cy - 7 * scale} ${cx + 6 * scale},${cy - 5 * scale}
            C ${cx + 6 * scale},${cy - 3 * scale} ${cx},${cy + 1 * scale} ${cx},${cy + 3 * scale} Z`;
}

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
                    [cx, cy - 18],      // top
                    [cx + 16, cy - 9],  // top right
                    [cx + 16, cy + 9],  // bottom right
                    [cx, cy + 18],      // bottom
                    [cx - 16, cy + 9],  // bottom left
                    [cx - 16, cy - 9]   // top left
                ];
                newNode.setAttribute('points', hexPoints.map(p => p.join(',')).join(' '));
                break;
                
            case 'star':
                newNode = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const starPoints = [
                    [cx, cy - 18],           // top point
                    [cx + 5, cy - 6],        // top right inner
                    [cx + 17, cy - 6],       // top right outer
                    [cx + 7, cy + 2],        // right inner
                    [cx + 11, cy + 14],      // bottom right outer
                    [cx, cy + 7],            // bottom inner
                    [cx - 11, cy + 14],      // bottom left outer
                    [cx - 7, cy + 2],        // left inner
                    [cx - 17, cy - 6],       // top left outer
                    [cx - 5, cy - 6]         // top left inner
                ];
                newNode.setAttribute('points', starPoints.map(p => p.join(',')).join(' '));
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

// Add SVG gradients for all colors to your createTreeContainer function
function createColorGradients() {
    const defs = document.querySelector('#familyTreeSVG defs');
    if (!defs) return;
    
    Object.entries(NODE_COLORS).forEach(([colorName, colors]) => {
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        gradient.setAttribute('id', `${colorName}Gradient`);
        gradient.setAttribute('cx', '30%');
        gradient.setAttribute('cy', '30%');
        gradient.setAttribute('r', '70%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('style', `stop-color:${colors.start};stop-opacity:1`);
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('style', `stop-color:${colors.end};stop-opacity:1`);
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
    });
}

class SimpleFamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        console.log('=== DEBUG: SimpleFamilyTree Constructor ===');
        console.log('familyCode parameter:', familyCode);
        console.log('typeof familyCode:', typeof familyCode);
        console.log('containerId:', containerId);
        
        this.familyCode = familyCode;
        this.containerId = containerId;
        this.people = [];
        this.relationships = [];
        this.selectedPerson = null;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isEditMode = false;
        this.gridRows = 6;        // Default 6 generations
        this.gridCols = 12;       // Default 12 positions per generation
        this.gridCellSize = 100;  // Size of each grid cell
        this.isOwner = false;     // Will be set based on user permissions

        this.nodeCustomization = new NodeCustomization(this);
        
        console.log('After assignment - this.familyCode:', this.familyCode);
        console.log('=== Calling init() ===');
        
        this.init();
    }
    
    async init() {
        console.log('=== DEBUG: init() called ===');
        
        await this.loadTreeData();
        await this.checkOwnerPermissions(); // NEW: Check permissions
        this.createTreeContainer();
        this.setupEventListeners();
        this.renderTree();
        
        // NEW: Show edit button if owner
        if (this.isOwner) {
            const editBtn = document.getElementById('editTreeBtn');
            if (editBtn) {
                editBtn.style.display = 'block';
            }
        }
    }
    async checkOwnerPermissions() {
        // Check if current user is owner of this family tree
        try {
            const response = await fetch(`/familyTimeline/api/tree/${this.familyCode}`);
            const data = await response.json();
            
            // You'll need to add owner_id to your tree API response
            // For now, we'll assume user is owner if they can access the tree
            this.isOwner = true; // TODO: Replace with actual owner check
            
            console.log('Owner permissions:', this.isOwner);
        } catch (error) {
            console.error('Error checking permissions:', error);
            this.isOwner = false;
        }
    }

    toggleEditMode() {
        if (!this.isOwner) {
            alert('Only the family tree owner can edit the layout.');
            return;
        }
        
        this.isEditMode = !this.isEditMode;
        console.log('Edit mode:', this.isEditMode);
        
        // Update UI
        this.updateEditModeUI();
        this.renderTree();
    }

    updateEditModeUI() {
        const editButton = document.getElementById('editTreeBtn');
        const gridControls = document.getElementById('gridControls');
        
        if (editButton) {
            editButton.textContent = this.isEditMode ? '👁️ View Mode' : '✏️ Edit Tree';
            editButton.style.background = this.isEditMode ? '#FF9800' : '#4CAF50';
        }
        
        if (gridControls) {
            gridControls.style.display = this.isEditMode ? 'flex' : 'none';
        }
        
        // Update tree container class for styling
        const container = document.getElementById(this.containerId);
        if (container) {
            container.classList.toggle('edit-mode', this.isEditMode);
        }
    }

    adjustGridSize(rows, cols) {
        this.gridRows = Math.max(3, Math.min(12, rows)); // Limit between 3-12 rows
        this.gridCols = Math.max(6, Math.min(20, cols)); // Limit between 6-20 cols
        
        console.log(`Grid resized to: ${this.gridRows} rows x ${this.gridCols} cols`);
        
        // Update grid controls display
        document.getElementById('gridRowsValue').textContent = this.gridRows;
        document.getElementById('gridColsValue').textContent = this.gridCols;
        
        // Re-render if in edit mode
        if (this.isEditMode) {
            this.renderTree();
        }
    }

    createGridOverlay() {
        if (!this.isEditMode) return '';
        
        const gridWidth = this.gridCols * this.gridCellSize;
        const gridHeight = this.gridRows * this.gridCellSize;
        const startX = 100; // Offset from left
        const startY = 100; // Offset from top
        
        let gridHTML = '';
        
        // Create grid background
        gridHTML += `<rect x="${startX}" y="${startY}" width="${gridWidth}" height="${gridHeight}" 
                     fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2" 
                     stroke-dasharray="5,5" rx="10"/>`;
        
        // Create grid dots and clickable areas
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const x = startX + (col * this.gridCellSize) + (this.gridCellSize / 2);
                const y = startY + (row * this.gridCellSize) + (this.gridCellSize / 2);
                
                // Check if there's already a person at this position
                const isOccupied = this.isGridPositionOccupied(row, col);
                
                if (!isOccupied) {
                    // Empty grid spot - show clickable dot
                    gridHTML += `<circle cx="${x}" cy="${y}" r="8" 
                                 fill="rgba(46,125,50,0.4)" stroke="#2E7D32" stroke-width="2"
                                 class="grid-spot" data-row="${row}" data-col="${col}"
                                 style="cursor: pointer; opacity: 0.6;"/>`;
                    
                    // Invisible larger click area
                    gridHTML += `<circle cx="${x}" cy="${y}" r="25" 
                                 fill="transparent" class="grid-click-area" 
                                 data-row="${row}" data-col="${col}" style="cursor: pointer;"/>`;
                }
            }
        }
        
        // Add generation labels
        for (let row = 0; row < this.gridRows; row++) {
            const y = startY + (row * this.gridCellSize) + (this.gridCellSize / 2);
            gridHTML += `<text x="${startX - 30}" y="${y + 5}" 
                         font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
                         fill="#2E7D32" text-anchor="middle">G${this.gridRows - row}</text>`;
        }
        
        return gridHTML;
    }

    isGridPositionOccupied(row, col) {
        // Check if any person is positioned at this grid location
        return this.people.some(person => 
            person.gridRow === row && person.gridCol === col
        );
    }

    handleGridClick(row, col) {
        console.log(`Grid clicked: Row ${row}, Col ${col}`);
        
        // Store the grid position for the new person
        this.pendingGridPosition = { row, col };
        
        // Open add person modal
        this.openAddPersonModal('grid');
    }
    
    async loadTreeData() {
        console.log('=== DEBUG: loadTreeData called ===');
        console.log('this.familyCode:', this.familyCode);
        
        if (!this.familyCode) {
            console.error('❌ No familyCode provided!');
            return;
        }
        
        try {
            const apiUrl = `/familyTimeline/api/tree/${this.familyCode}`;
            console.log('🌐 Making API call to:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('📡 Response received:');
            console.log('- Status:', response.status);
            console.log('- Status Text:', response.statusText);
            console.log('- OK:', response.ok);
            
            if (!response.ok) {
                console.error('❌ Response not OK:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('📊 Raw API response data:', data);
            
            this.people = data.people || [];
            this.relationships = data.relationships || [];
            
            console.log('👥 People loaded:', this.people.length, this.people);
            console.log('🔗 Relationships loaded:', this.relationships.length, this.relationships);
            
            // Load story counts for each person
            for (let person of this.people) {
                try {
                    const storiesResponse = await fetch(`/familyTimeline/api/person/${person.id}/stories`);
                    const storiesData = await storiesResponse.json();
                    person.story_count = storiesData.stories ? storiesData.stories.length : 0;
                    console.log(`📖 Person ${person.first_name} has ${person.story_count} stories`);
                } catch (error) {
                    console.warn(`⚠️ Could not load stories for person ${person.id}:`, error);
                    person.story_count = 0;
                }
            }
            
            // If no people exist, create a placeholder starter person
            if (this.people.length === 0) {
                console.log('📝 No people found, attempting to create starter person...');
                await this.createStarterPerson();
            } else {
                console.log('✅ People already exist, skipping starter person creation');
            }
            
            console.log('🏁 loadTreeData completed. Final people array:', this.people);
        } catch (error) {
            console.error('💥 Error in loadTreeData:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    }
    

    async createStarterPerson() {
        console.log('=== DEBUG: Creating starter person ===');
        console.log('this.familyCode:', this.familyCode);
        console.log('typeof this.familyCode:', typeof this.familyCode);
        console.log('parseInt(this.familyCode):', parseInt(this.familyCode));
        
        const starterData = {
            family_id: parseInt(this.familyCode), // Make sure it's an integer
            first_name: 'Click to Edit',
            last_name: '',
            is_living: true,
            bio_summary: 'This is your family tree starter. Click to edit and add your information!'
        };
        
        console.log('Starter person data:', starterData);
        console.log('API URL will be:', '/familyTimeline/api/person');
        
        try {
            console.log('Making fetch request...');
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(starterData)
            });
            
            console.log('Response received:');
            console.log('- Status:', response.status);
            console.log('- Status Text:', response.statusText);
            console.log('- Headers:', Object.fromEntries(response.headers.entries()));
            console.log('- URL:', response.url);
            console.log('- OK:', response.ok);
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('Parsed result:', result);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                console.error('Response text was:', responseText);
                throw new Error('Server returned invalid JSON: ' + responseText);
            }
            
            if (result.success) {
                console.log('✅ Created starter person with ID:', result.person_id);
                // Reload data to get the new person with proper ID
                await this.loadTreeData();
            } else {
                console.error('❌ Failed to create starter person:', result);
                throw new Error(result.message || 'Unknown error creating starter person');
            }
        } catch (error) {
            console.error('💥 Error creating starter person:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            // Don't throw the error - just log it and continue without a starter person
            console.log('Continuing without starter person...');
        }
    }
    setupModalEventListeners() {
        // Handle all modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
        
        // Handle clicking outside modals to close them
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Handle Add Story button from person details modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addStoryFromModal') {
                console.log('Add story from modal clicked, selectedPerson:', this.selectedPerson);
                if (this.selectedPerson) {
                    this.closeModal('personModal');
                    this.openAddStoryModal(this.selectedPerson);
                } else {
                    alert('Error: No person selected for story');
                }
            }
        });
    }

    createPersonNode(container, person) {    
        // Debug line to see what we're working with
        console.log(`Creating node for ${person.first_name} - Color: ${person.node_color}, Shape: ${person.node_shape}`);
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        group.style.cursor = 'pointer';
        
        // Get person's custom color or default
        const nodeColorName = person.node_color || 'green';
        const nodeShape = person.node_shape || 'circle';

        // Convert color name to hex color
        const colorMap = {
            'green': '#90EE90',
            'blue': '#87CEEB', 
            'purple': '#DDA0DD',
            'pink': '#FFB6C1',
            'orange': '#FFA500',
            'red': '#FF6347',
            'gold': '#FFD700',
            'silver': '#E0E0E0'
        };

        // Get the actual hex color
        const nodeColor = colorMap[nodeColorName] || nodeColorName || '#90EE90';

        console.log(`Creating node for ${person.first_name} - Color name: ${nodeColorName}, Hex: ${nodeColor}, Shape: ${nodeShape}`);

        // Create dynamic gradient for custom colors
        const gradientId = `gradient-${person.id}`;
        const darkColor = this.darkenColor(nodeColor, 0.3);

        console.log(`Using colors: ${nodeColor} -> ${darkColor}, Gradient ID: ${gradientId}`);
        
        // Add gradient to defs if it doesn't exist
        const defs = document.querySelector('#familyTreeSVG defs');
        if (defs) {
            // Remove existing gradient if it exists
            const existingGradient = document.getElementById(gradientId);
            if (existingGradient) {
                existingGradient.remove();
            }
            
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            gradient.setAttribute('id', gradientId);
            gradient.setAttribute('cx', '30%');
            gradient.setAttribute('cy', '30%');
            gradient.setAttribute('r', '70%');
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('style', `stop-color:${nodeColor};stop-opacity:1`);
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('style', `stop-color:${darkColor};stop-opacity:1`);
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
            
            console.log(`Created gradient ${gradientId} with colors ${nodeColor} -> ${darkColor}`);
        }
        
        // Create shape based on nodeShape using native SVG elements
        let shapeElement;
        
        switch (nodeShape) {
            case 'circle':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                shapeElement.setAttribute('cx', person.x);
                shapeElement.setAttribute('cy', person.y);
                shapeElement.setAttribute('r', '25');
                break;
                
            case 'square':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shapeElement.setAttribute('x', person.x - 25);
                shapeElement.setAttribute('y', person.y - 25);
                shapeElement.setAttribute('width', '50');
                shapeElement.setAttribute('height', '50');
                break;
                
            case 'diamond':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shapeElement.setAttribute('x', person.x - 20);
                shapeElement.setAttribute('y', person.y - 20);
                shapeElement.setAttribute('width', '40');
                shapeElement.setAttribute('height', '40');
                shapeElement.setAttribute('transform', `rotate(45 ${person.x} ${person.y})`);
                break;
                
            case 'hexagon':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const hexPoints = [
                    [person.x, person.y - 25],      // top
                    [person.x + 22, person.y - 12], // top right
                    [person.x + 22, person.y + 12], // bottom right
                    [person.x, person.y + 25],      // bottom
                    [person.x - 22, person.y + 12], // bottom left
                    [person.x - 22, person.y - 12]  // top left
                ];
                shapeElement.setAttribute('points', hexPoints.map(p => p.join(',')).join(' '));
                break;
                
            case 'star':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const starPoints = [
                    [person.x, person.y - 25],           // top point
                    [person.x + 7, person.y - 8],       // top right inner
                    [person.x + 24, person.y - 8],      // top right outer
                    [person.x + 10, person.y + 3],      // right inner
                    [person.x + 15, person.y + 20],     // bottom right outer
                    [person.x, person.y + 10],          // bottom inner
                    [person.x - 15, person.y + 20],     // bottom left outer
                    [person.x - 10, person.y + 3],      // left inner
                    [person.x - 24, person.y - 8],      // top left outer
                    [person.x - 7, person.y - 8]        // top left inner
                ];
                shapeElement.setAttribute('points', starPoints.map(p => p.join(',')).join(' '));
                break;
                
            case 'triangle':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const triPoints = [
                    [person.x, person.y - 25],      // top point
                    [person.x - 22, person.y + 18], // bottom left
                    [person.x + 22, person.y + 18]  // bottom right
                ];
                shapeElement.setAttribute('points', triPoints.map(p => p.join(',')).join(' '));
                break;
                
            default: // fallback to circle
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                shapeElement.setAttribute('cx', person.x);
                shapeElement.setAttribute('cy', person.y);
                shapeElement.setAttribute('r', '25');
        }
        
        // Apply color - this is the key part!
        shapeElement.setAttribute('fill', `url(#${gradientId})`);
        shapeElement.setAttribute('stroke', darkColor);
        shapeElement.setAttribute('stroke-width', '2');
        shapeElement.setAttribute('filter', 'url(#leafShadow)');
        
        console.log(`Applied fill: url(#${gradientId}) and stroke: ${darkColor}`);
        
        group.appendChild(shapeElement);
        
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

        group.appendChild(nameLabel);

        // Click handler for context menu
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (person.id) {
                this.showContextMenu(person.id, e);
            }
        });

        container.appendChild(group);
    }

    // Add this helper method to SimpleFamilyTree class
    darkenColor(color, factor) {
        // Handle CSS color names by converting them to hex first
        const colorMap = {
            'green': '#90EE90',
            'blue': '#87CEEB',
            'purple': '#DDA0DD',
            'pink': '#FFB6C1',
            'orange': '#FFA500',
            'red': '#FF6347',
            'gold': '#FFD700',
            'silver': '#E0E0E0'
        };
        
        // Convert CSS color name to hex if needed
        if (colorMap[color]) {
            color = colorMap[color];
        }
        
        // Ensure color starts with #
        if (!color.startsWith('#')) {
            console.warn('Invalid color format:', color, 'using default green');
            color = '#90EE90';
        }
        
        try {
            const hex = color.replace('#', '');
            
            // Validate hex length
            if (hex.length !== 6) {
                console.warn('Invalid hex color length:', color, 'using default green');
                color = '#90EE90';
                const hex = color.replace('#', '');
            }
            
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Validate parsed values
            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                console.warn('Failed to parse color:', color, 'using default green');
                return '#228B22'; // Default dark green
            }
            
            const darkR = Math.floor(r * (1 - factor));
            const darkG = Math.floor(g * (1 - factor));
            const darkB = Math.floor(b * (1 - factor));
            
            const result = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
            
            console.log(`Color conversion: ${color} -> ${result}`);
            return result;
            
        } catch (error) {
            console.error('Error in darkenColor:', error, 'color:', color);
            return '#228B22'; // Default dark green fallback
        }
    }
    
    createTreeContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Updated container with edit mode controls
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
                    
                    <g id="gridOverlay"></g>
                    <g id="connections"></g>
                    <g id="peopleNodes"></g>
                </svg>
            </div>
            
            <div class="tree-controls">
                <!-- Existing zoom controls -->
                <div class="zoom-controls">
                    <button id="zoomOut" class="control-btn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="control-btn">+</button>
                </div>
                
                <!-- NEW: Edit mode button (only show if owner) -->
                <button id="editTreeBtn" class="control-btn" style="display: none;">✏️ Edit Tree</button>
                
                <!-- NEW: Grid size controls (only show in edit mode) -->
                <div id="gridControls" class="grid-controls" style="display: none;">
                    <div class="grid-control-group">
                        <label>Rows: <span id="gridRowsValue">${this.gridRows}</span></label>
                        <div>
                            <button id="gridRowsDown" class="grid-btn">-</button>
                            <button id="gridRowsUp" class="grid-btn">+</button>
                        </div>
                    </div>
                    <div class="grid-control-group">
                        <label>Cols: <span id="gridColsValue">${this.gridCols}</span></label>
                        <div>
                            <button id="gridColsDown" class="grid-btn">-</button>
                            <button id="gridColsUp" class="grid-btn">+</button>
                        </div>
                    </div>
                </div>
                
                <button id="centerTreeBtn" class="control-btn">🎯 Center Tree</button>
            </div>
            
            <!-- Context Menu (updated for edit mode) -->
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

        createColorGradients();
    }
    
    setupEventListeners() {
        this.setupTreeInteractions();
        this.setupControlButtons();
        this.setupContextMenu();
        this.setupFormHandlers();
        this.setupModalEventListeners();
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
        
        svg.addEventListener('click', (e) => {
            if (this.isEditMode && e.target.classList.contains('grid-click-area')) {
                const row = parseInt(e.target.getAttribute('data-row'));
                const col = parseInt(e.target.getAttribute('data-col'));
                this.handleGridClick(row, col);
            }
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

        // NEW: Edit mode button
        document.getElementById('editTreeBtn')?.addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // NEW: Grid size controls
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
        
        document.getElementById('centerTreeBtn')?.addEventListener('click', () => {
            this.centerTree();
        });
    }
    
    setupContextMenu() {
        // Make sure we're getting the right elements and adding proper event listeners
        const viewStoriesBtn = document.getElementById('viewStories');
        const addStoryBtn = document.getElementById('addStory');
        const addSpouseBtn = document.getElementById('addSpouse');
        const addChildBtn = document.getElementById('addChild');
        const editPersonBtn = document.getElementById('editPerson');
        const deletePersonBtn = document.getElementById('deletePerson');
        
        if (viewStoriesBtn) {
            viewStoriesBtn.addEventListener('click', () => {
                console.log('View stories clicked, selectedPerson:', this.selectedPerson);
                this.hideContextMenu();
                this.openPersonDetailModal(this.selectedPerson);
            });
        }
        
        if (addStoryBtn) {
            addStoryBtn.addEventListener('click', () => {
                console.log('Add story clicked, selectedPerson:', this.selectedPerson);
                this.hideContextMenu();
                this.openAddStoryModal(this.selectedPerson);
            });
        }
        
        if (addSpouseBtn) {
            addSpouseBtn.addEventListener('click', () => {
                console.log('Add spouse clicked, selectedPerson:', this.selectedPerson);
                this.hideContextMenu();
                this.openAddPersonModal('spouse');
            });
        }
        
        if (addChildBtn) {
            addChildBtn.addEventListener('click', () => {
                console.log('Add child clicked, selectedPerson:', this.selectedPerson);
                this.hideContextMenu();
                this.openAddPersonModal('child');
            });
        }
        
        if (editPersonBtn) {
            editPersonBtn.addEventListener('click', () => {
                console.log('Edit person clicked, selectedPerson:', this.selectedPerson);
                console.log('typeof selectedPerson:', typeof this.selectedPerson);
                this.hideContextMenu();
                
                // Make sure we have a valid person ID before calling edit
                if (this.selectedPerson) {
                    this.openEditPersonModal(this.selectedPerson);
                } else {
                    console.error('No person selected for editing');
                    alert('Error: No person selected. Please try clicking on a person first.');
                }
            });
        }
        
        if (deletePersonBtn) {
            deletePersonBtn.addEventListener('click', () => {
                console.log('Delete person clicked, selectedPerson:', this.selectedPerson);
                this.hideContextMenu();
                this.openDeleteConfirmationModal(this.selectedPerson);
            });
        }
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
                bio_summary: formData.get('bio_summary'),
                node_color: formData.get('node_color') || 'green',
                node_shape: formData.get('node_shape') || 'circle'
            };

            console.log('Sending person data with colors:', personData);
            
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
        
        // Convert to number if it's a string
        if (typeof personId === 'string') {
            personId = parseInt(personId);
        }
        
        // Validate the person ID
        if (!personId || isNaN(personId)) {
            console.error('Invalid person ID provided to context menu:', personId);
            alert('Error: Invalid person selection. Please try again.');
            return;
        }
        
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
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
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
        
        // NEW: Render grid overlay if in edit mode
        if (this.isEditMode) {
            this.renderGridOverlay();
        }
        
        this.calculatePositions();
        this.renderConnections();
        this.renderPeople();
    }

    renderGridOverlay() {
        const gridContainer = document.getElementById('gridOverlay');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = this.createGridOverlay();
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
    
    // Form submission handlers
    async handleAddPersonSubmit(e) {
        e.preventDefault();
        
        console.log('=== DEBUG: handleAddPersonSubmit called ===');
        console.log('this.familyCode:', this.familyCode);
        console.log('this.currentAddType:', this.currentAddType);
        console.log('this.currentParentId:', this.currentParentId);
        
        try {
            const formData = new FormData(e.target);
            
            // IMPORTANT: Add the family_id from this.familyCode
            const personData = {
                family_id: parseInt(this.familyCode), // Add this line!
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
            
            console.log('Person data to submit:', personData);
            
            // Handle photo upload
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                const photoData = await this.fileToBase64(photoFile);
                personData.photo_data = photoData;
                personData.photo_filename = photoFile.name;
            }
            
            console.log('Making API call to create person...');
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            const result = await response.json();
            console.log('Person creation result:', result);
            
            if (result.success) {
                // Create relationship if this is a spouse or child
                if (this.currentAddType && this.currentParentId) {
                    console.log(`Creating ${this.currentAddType} relationship between ${this.currentParentId} and ${result.person_id}`);
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
        console.log('=== DEBUG: createRelationship called ===');
        console.log('person1Id:', person1Id);
        console.log('person2Id:', person2Id);
        console.log('type:', type);
        console.log('this.familyCode:', this.familyCode);
        
        const relationshipData = {
            family_id: parseInt(this.familyCode), // Add this line!
            person1_id: parseInt(person1Id),
            person2_id: parseInt(person2Id),
            relationship_type: type === 'spouse' ? 'spouse' : 'parent'
        };
        
        console.log('Relationship data to submit:', relationshipData);
        
        try {
            const response = await fetch('/familyTimeline/api/relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relationshipData)
            });
            
            const result = await response.json();
            console.log('Relationship creation result:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to create relationship');
            }
            
            return result;
        } catch (error) {
            console.error('Error creating relationship:', error);
            throw error;
        }
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
                family_id: parseInt(this.familyCode),
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
    console.log('=== DEBUG: DOMContentLoaded event fired ===');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const familyCodeFromURL = urlParams.get('family');
    const familyCodeFromWindow = window.familyCode;
    
    console.log('familyCodeFromURL:', familyCodeFromURL);
    console.log('familyCodeFromWindow:', familyCodeFromWindow);
    
    const finalFamilyCode = familyCodeFromURL || familyCodeFromWindow;
    console.log('Final familyCode to use:', finalFamilyCode);
    console.log('typeof finalFamilyCode:', typeof finalFamilyCode);
    
    if (finalFamilyCode) {
        console.log('✅ Creating SimpleFamilyTree with familyCode:', finalFamilyCode);
        window.familyTree = new SimpleFamilyTree(finalFamilyCode);
    } else {
        console.error('❌ No family code found! Cannot initialize tree.');
        console.log('URL params available:', Array.from(urlParams.entries()));
        console.log('window.familyCode:', window.familyCode);
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