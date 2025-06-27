/**
 * Enhanced GridFamilyTree - Combines grid positioning with full editing functionality
 * Base: gridFamilyTree.js (working grid system, drag & drop, connections)
 * Enhanced with: familyTree.js editing features (person editing, stories, node customization)
 */

class EnhancedGridFamilyTree {
    constructor(familyCode, containerId = 'treeContainer') {
        console.log('=== GridFamilyTree Constructor ===');
        console.log('familyCode:', familyCode);
        
        this.familyCode = familyCode;
        this.containerId = containerId;
        
        // Grid configuration
        this.gridRows = 6;
        this.gridCols = 12;
        this.gridCellSize = 120;
        this.gridStartX = 100;
        this.gridStartY = 100;
        
        // Tree data
        this.people = [];
        this.relationships = [];
        
        // UI state
        this.isEditMode = false;
        this.isOwner = false;
        this.selectedPerson = null;
        this.pendingGridPosition = null;

        // Connection state
        this.isConnecting = false;
        this.connectionMode = null;
        this.firstPersonSelected = null;
        this.connectionPreview = null;
        
        // Drag and drop state - EXACT from working version
        this.isDragging = false;
        this.draggedPerson = null;
        this.dragStartPos = null;
        this.ghostElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // View controls
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Enhanced GridFamilyTree...');
        
        await this.loadTreeData();
        await this.checkOwnerPermissions();
        this.createTreeContainer();
        this.setupEventListeners();
        this.renderTree();
        
        if (this.isOwner) {
            this.showOwnerControls();
        }
    }
    
    // ===========================================
    // DATA LOADING (from gridFamilyTree.js)
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
            
            this.assignGridPositions();
            
        } catch (error) {
            console.error('Error loading tree data:', error);
        }
    }
    
    async checkOwnerPermissions() {
        this.isOwner = true;
        console.log('Owner permissions:', this.isOwner);
    }
    
    // ===========================================
    // GRID POSITIONING SYSTEM (from gridFamilyTree.js)
    // ===========================================
    
    assignGridPositions() {
        let currentRow = 0;
        let currentCol = 0;
        
        this.people.forEach(person => {
            const hasValidGridRow = person.grid_row !== null && person.grid_row !== undefined && typeof person.grid_row === 'number' && !isNaN(person.grid_row);
            const hasValidGridCol = person.grid_col !== null && person.grid_col !== undefined && typeof person.grid_col === 'number' && !isNaN(person.grid_col);
            
            if (!hasValidGridRow || !hasValidGridCol) {
                console.log(`${person.first_name} has invalid grid position - auto-assigning`);
                
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
    // UI CREATION (KEEPING ORIGINAL WORKING STRUCTURE)
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
                    <g id="connectionPreview"></g>
                    <g id="people"></g>
                </svg>
            </div>
            
            <!-- ADDED: Add Person Modal from familyTree.js -->
            <div id="addPersonModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>🌱 Add New Family Member</h2>
                    <form id="addPersonForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="addFirstName">First Name *</label>
                                <input type="text" id="addFirstName" name="first_name" required>
                            </div>
                            <div class="form-group">
                                <label for="addLastName">Last Name</label>
                                <input type="text" id="addLastName" name="last_name">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="addMaidenName">Maiden Name</label>
                                <input type="text" id="addMaidenName" name="maiden_name">
                            </div>
                            <div class="form-group">
                                <label for="addNickname">Nickname</label>
                                <input type="text" id="addNickname" name="nickname">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="addBirthDate">Birth Date</label>
                                <input type="date" id="addBirthDate" name="birth_date">
                            </div>
                            <div class="form-group">
                                <label for="addDeathDate">Death Date</label>
                                <input type="date" id="addDeathDate" name="death_date">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="addBirthPlace">Birth Place</label>
                                <input type="text" id="addBirthPlace" name="birth_place" placeholder="City, State, Country">
                            </div>
                            <div class="form-group">
                                <label for="addGender">Gender</label>
                                <select id="addGender" name="gender">
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="addIsLiving" name="is_living" checked>
                                This person is still living
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="addPhoto">Photo (optional)</label>
                            <input type="file" id="addPhoto" name="photo" accept="image/*">
                            <img id="addPersonPhotoPreview" style="display: none; max-width: 100px; margin-top: 10px; border-radius: 50%;">
                        </div>
                        
                        <div class="form-group">
                            <label for="addBioSummary">Short Biography</label>
                            <textarea id="addBioSummary" name="bio_summary" rows="3" placeholder="Brief description of this person..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn primary">🌳 Add to Tree</button>
                            <button type="button" class="btn secondary" onclick="document.getElementById('addPersonModal').style.display='none'">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Tree Controls (EXACT ORIGINAL STRUCTURE) -->
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
                <div class="context-item" data-action="viewStories">📖 View Stories</div>
                <div class="context-item" data-action="addStory">✍️ Add Story</div>
                <div class="context-separator"></div>
                <div class="context-item" data-action="connectSpouse">💕 Connect as Spouse</div>
                <div class="context-item" data-action="connectParent">👶 Connect as Parent</div>
                <div class="context-separator"></div>
                <div class="context-item" data-action="addSpouse">💕 Add Spouse</div>
                <div class="context-item" data-action="addChild">👶 Add Child</div>
                <div class="context-separator"></div>
                <div class="context-item" data-action="editPerson">✏️ Edit Person</div>
                <div class="context-item" data-action="deletePerson">🗑️ Delete Person</div>
            </div>
            
            <!-- ADDED: Person Details Modal from familyTree.js -->
            <div id="personModal" class="modal">
                <div class="modal-content large">
                    <span class="close">&times;</span>
                    <div class="person-header">
                        <div class="person-info">
                            <h2 id="personName">Person Name</h2>
                            <div id="personDetails" class="person-details"></div>
                        </div>
                        <div class="person-actions">
                            <button id="addStoryFromModal" class="btn primary">+ Add Story</button>
                        </div>
                    </div>
                    
                    <div class="stories-section">
                        <h3 style="color: #2E7D32; margin-bottom: 20px;">📖 Stories</h3>
                        <div id="personStories" class="stories-container">
                            <div class="loading-stories">Loading stories...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ADDED: Edit Person Modal from familyTree.js -->
            <div id="editPersonModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>✏️ Edit Person</h2>
                    <form id="editPersonForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editFirstName">First Name *</label>
                                <input type="text" id="editFirstName" name="first_name" required>
                            </div>
                            <div class="form-group">
                                <label for="editLastName">Last Name</label>
                                <input type="text" id="editLastName" name="last_name">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editBirthDate">Birth Date</label>
                                <input type="date" id="editBirthDate" name="birth_date">
                            </div>
                            <div class="form-group">
                                <label for="editDeathDate">Death Date</label>
                                <input type="date" id="editDeathDate" name="death_date">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editBio">Biography</label>
                            <textarea id="editBio" name="bio" placeholder="Tell us about this person..."></textarea>
                        </div>
                        
                        <!-- ADDED: Node Customization from familyTree.js -->
                        <div class="node-customization">
                            <h4>🎨 Customize Node Appearance</h4>
                            <div class="node-options">
                                <div class="color-picker-group">
                                    <label for="editNodeColor">Node Color</label>
                                    <input type="color" id="editNodeColor" name="node_color" value="#90EE90">
                                    <div class="color-swatches">
                                        <div class="color-swatch" data-color="#90EE90" style="background: linear-gradient(45deg, #90EE90, #228B22);"></div>
                                        <div class="color-swatch" data-color="#87CEEB" style="background: linear-gradient(45deg, #87CEEB, #1E90FF);"></div>
                                        <div class="color-swatch" data-color="#DDA0DD" style="background: linear-gradient(45deg, #DDA0DD, #8A2BE2);"></div>
                                        <div class="color-swatch" data-color="#FFB6C1" style="background: linear-gradient(45deg, #FFB6C1, #FF69B4);"></div>
                                        <div class="color-swatch" data-color="#FFA500" style="background: linear-gradient(45deg, #FFA500, #FF8C00);"></div>
                                        <div class="color-swatch" data-color="#FF6347" style="background: linear-gradient(45deg, #FF6347, #DC143C);"></div>
                                        <div class="color-swatch" data-color="#FFD700" style="background: linear-gradient(45deg, #FFD700, #B8860B);"></div>
                                        <div class="color-swatch" data-color="#E0E0E0" style="background: linear-gradient(45deg, #E0E0E0, #C0C0C0);"></div>
                                    </div>
                                </div>
                                
                                <div class="shape-picker-group">
                                    <label>Node Shape</label>
                                    <div class="shape-options">
                                        <div class="shape-option selected" data-shape="circle">
                                            <svg width="40" height="40" viewBox="0 0 40 40">
                                                <circle cx="20" cy="20" r="18" fill="#90EE90" stroke="#228B22" stroke-width="2"/>
                                            </svg>
                                            <span>Circle</span>
                                        </div>
                                        <div class="shape-option" data-shape="square">
                                            <svg width="40" height="40" viewBox="0 0 40 40">
                                                <rect x="2" y="2" width="36" height="36" rx="8" fill="#90EE90" stroke="#228B22" stroke-width="2"/>
                                            </svg>
                                            <span>Square</span>
                                        </div>
                                        <div class="shape-option" data-shape="diamond">
                                            <svg width="40" height="40" viewBox="0 0 40 40">
                                                <rect x="12" y="12" width="16" height="16" rx="4" fill="#90EE90" stroke="#228B22" stroke-width="2" transform="rotate(45 20 20)"/>
                                            </svg>
                                            <span>Diamond</span>
                                        </div>
                                        <div class="shape-option" data-shape="star">
                                            <svg width="40" height="40" viewBox="0 0 40 40">
                                                <path d="M20,3 L25,15 L37,15 L28,23 L32,35 L20,28 L8,35 L12,23 L3,15 L15,15 Z" fill="#90EE90" stroke="#228B22" stroke-width="2"/>
                                            </svg>
                                            <span>Star</span>
                                        </div>
                                    </div>
                                    <input type="hidden" name="node_shape" value="circle">
                                </div>
                            </div>
                            
                            <div class="node-preview">
                                <label>Preview:</label>
                                <div id="nodePreview" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(45deg, #90EE90, #228B22); border: 3px solid #228B22; margin: 10px auto;"></div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn primary">💾 Save Changes</button>
                            <button type="button" class="btn secondary" onclick="document.getElementById('editPersonModal').style.display='none'">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ADDED: Add Story Modal from familyTree.js -->
            <div id="addStoryModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>✍️ Add New Story</h2>
                    <form id="addStoryForm">
                        <div class="form-group">
                            <label for="storyTitle">Story Title *</label>
                            <input type="text" id="storyTitle" name="title" required placeholder="A memorable moment...">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="storyYear">Year</label>
                                <input type="number" id="storyYear" name="year" min="1900" max="2025" placeholder="1990">
                            </div>
                            <div class="form-group">
                                <label for="storyCategory">Category</label>
                                <select id="storyCategory" name="category">
                                    <option value="childhood">Childhood</option>
                                    <option value="family">Family</option>
                                    <option value="career">Career</option>
                                    <option value="travel">Travel</option>
                                    <option value="milestone">Milestone</option>
                                    <option value="everyday">Everyday Life</option>
                                    <option value="challenge">Challenge</option>
                                    <option value="relationship">Relationship</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="storyContent">Your Story *</label>
                            <textarea id="storyContent" name="content" required placeholder="Share your memory..." rows="6"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="storyPhoto">Photo (optional)</label>
                            <input type="file" id="storyPhoto" name="photo" accept="image/*">
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn primary">💾 Save Story</button>
                            <button type="button" class="btn secondary" onclick="document.getElementById('addStoryModal').style.display='none'">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Initialize modal close handlers
        this.setupModalHandlers();
    }
    
    // ADDED: Modal setup from familyTree.js
    setupModalHandlers() {
        // Close modal when clicking X
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
    
    showOwnerControls() {
        const editControls = document.getElementById('editControls');
        if (editControls) {
            editControls.style.display = 'flex';
        }
    }
    
    // ===========================================
    // EDIT MODE MANAGEMENT (from gridFamilyTree.js)
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
        
        if (!this.isEditMode && this.isConnecting) {
            this.cancelConnection();
        }
    }
    
    // ===========================================
    // CONNECTION SYSTEM (from gridFamilyTree.js)
    // ===========================================
    
    startConnection(type) {
        console.log(`🔗 Starting connection mode: ${type}`);
        
        this.isConnecting = true;
        this.connectionMode = type;
        this.firstPersonSelected = null;
        
        this.updateConnectionUI();
        this.showConnectionStatus(`Click first person to connect as ${type === 'spouse' ? 'spouses' : 'parent & child'}`);
        this.highlightSelectablePeople();
        
        const canvas = document.getElementById('gridCanvas') || document.querySelector('.grid-tree-canvas');
        if (canvas) {
            canvas.classList.add('connecting');
        }
        
        document.querySelectorAll('.person-node').forEach(node => {
            node.style.cursor = 'pointer';
        });
    }
    
    cancelConnection() {
        console.log('❌ Canceling connection mode');
        
        this.isConnecting = false;
        this.connectionMode = null;
        this.firstPersonSelected = null;
        
        this.updateConnectionUI();
        this.hideConnectionStatus();
        this.clearPersonHighlights();
        
        const canvas = document.getElementById('gridCanvas') || document.querySelector('.grid-tree-canvas');
        if (canvas) {
            canvas.classList.remove('connecting');
        }
        
        document.querySelectorAll('.person-node').forEach(node => {
            if (this.isEditMode) {
                node.style.cursor = 'move';
            } else {
                node.style.cursor = 'pointer';
            }
        });
    }
    
    updateConnectionUI() {
        const spouseBtn = document.getElementById('connectSpouse');
        const parentBtn = document.getElementById('connectParent');
        const cancelBtn = document.getElementById('cancelConnection');
        
        if (spouseBtn) spouseBtn.classList.toggle('active', this.connectionMode === 'spouse');
        if (parentBtn) parentBtn.classList.toggle('active', this.connectionMode === 'parent');
        if (cancelBtn) cancelBtn.style.display = this.isConnecting ? 'block' : 'none';
    }
    
    handleConnectionClick(personId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        if (!this.firstPersonSelected) {
            this.firstPersonSelected = person;
            console.log(`👤 First person selected: ${person.first_name}`);
            
            this.highlightSelectedPerson(personId);
            this.showConnectionStatus(`Click second person to connect with ${person.first_name}`);
            
        } else if (this.firstPersonSelected.id === personId) {
            this.firstPersonSelected = null;
            this.clearPersonHighlights();
            this.highlightSelectablePeople();
            this.showConnectionStatus(`Click first person to connect as ${this.connectionMode === 'spouse' ? 'spouses' : 'parent & child'}`);
            
        } else {
            console.log(`👥 Connecting ${this.firstPersonSelected.first_name} with ${person.first_name}`);
            this.createConnection(this.firstPersonSelected, person);
        }
    }
    
    async createConnection(person1, person2) {
        try {
            const validation = this.validateConnection(person1, person2, this.connectionMode);
            if (!validation.valid) {
                this.showErrorMessage(validation.message);
                return;
            }
            
            console.log(`Creating ${this.connectionMode} relationship between ${person1.first_name} and ${person2.first_name}`);
            
            await this.createRelationship(person1.id, person2.id, this.connectionMode);
            
            this.showSuccessMessage(`${person1.first_name} and ${person2.first_name} connected as ${this.connectionMode === 'spouse' ? 'spouses' : 'parent & child'}!`);
            
            this.cancelConnection();
            await this.loadTreeData();
            this.renderTree();
            
        } catch (error) {
            console.error('Error creating connection:', error);
            this.showErrorMessage('Failed to create connection: ' + error.message);
        }
    }
    
    validateConnection(person1, person2, type) {
        const existingRel = this.relationships.find(rel => 
            rel.relationship_type === type &&
            ((rel.person1_id === person1.id && rel.person2_id === person2.id) ||
            (rel.person1_id === person2.id && rel.person2_id === person1.id))
        );
        
        if (existingRel) {
            return { valid: false, message: `${person1.first_name} and ${person2.first_name} are already connected as ${type}s` };
        }
        
        if (type === 'spouse') {
            const person1Spouse = this.getSpouse(person1.id);
            const person2Spouse = this.getSpouse(person2.id);
            
            if (person1Spouse) {
                return { valid: false, message: `${person1.first_name} is already married to ${person1Spouse.first_name}` };
            }
            
            if (person2Spouse) {
                return { valid: false, message: `${person2.first_name} is already married to ${person2Spouse.first_name}` };
            }
        }
        
        return { valid: true };
    }
    
    async createRelationship(person1Id, person2Id, type) {
        const response = await fetch(`/familyTimeline/api/relationship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                family_id: parseInt(this.familyCode),
                person1_id: person1Id,
                person2_id: person2Id,
                relationship_type: type,
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create relationship: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // ===========================================
    // VISUAL FEEDBACK (from gridFamilyTree.js)
    // ===========================================
    
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
        setTimeout(() => successDiv.remove(), 4000);
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
    
    // ===========================================
    // CONTEXT MENU & EDITING (ENHANCED WITH familyTree.js features)
    // ===========================================
    
    handlePersonClick(personId, event) {
        if (this.isConnecting) {
            this.handleConnectionClick(personId, event);
            return;
        }
        
        this.selectedPerson = personId;
        this.showContextMenu(event);
    }
    
    showContextMenu(event) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        this.updateContextMenuItems();
        
        const rect = event.target.getBoundingClientRect();
        menu.style.left = (rect.right + 10) + 'px';
        menu.style.top = rect.top + 'px';
        menu.style.display = 'block';
        
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
    
    updateContextMenuItems() {
        const connectSpouse = document.querySelector('[data-action="connectSpouse"]');
        const connectParent = document.querySelector('[data-action="connectParent"]');
        const addSpouse = document.querySelector('[data-action="addSpouse"]');
        const addChild = document.querySelector('[data-action="addChild"]');
        const editPerson = document.querySelector('[data-action="editPerson"]');
        const deletePerson = document.querySelector('[data-action="deletePerson"]');
        
        if (this.isEditMode) {
            // EDIT MODE: Show all options
            if (connectSpouse) connectSpouse.style.display = 'block';
            if (connectParent) connectParent.style.display = 'block';
            if (addSpouse) addSpouse.style.display = 'block';
            if (addChild) addChild.style.display = 'block';
            if (editPerson) editPerson.style.display = 'block';
            if (deletePerson) deletePerson.style.display = 'block';
        } else {
            // VIEW MODE: Show only view and edit options
            if (connectSpouse) connectSpouse.style.display = 'none';
            if (connectParent) connectParent.style.display = 'none';
            if (addSpouse) addSpouse.style.display = 'none';
            if (addChild) addChild.style.display = 'none';
            if (editPerson) editPerson.style.display = 'block'; // Keep edit in view mode
            if (deletePerson) deletePerson.style.display = 'none';
        }
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
            case 'connectSpouse':
                this.startConnectionFromContext('spouse');
                break;
            case 'connectParent':
                this.startConnectionFromContext('parent');
                break;
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
    
    startConnectionFromContext(type) {
        this.startConnection(type);
        this.firstPersonSelected = this.people.find(p => p.id === this.selectedPerson);
        this.highlightSelectedPerson(this.selectedPerson);
        this.showConnectionStatus(`Click second person to connect with ${this.firstPersonSelected.first_name}`);
        this.hideContextMenu();
    }
    
    // ===========================================
    // PERSON EDITING MODALS (ADDED from familyTree.js)
    // ===========================================
    
    openPersonModal(personId) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        document.getElementById('personName').textContent = `${person.first_name} ${person.last_name || ''}`.trim();
        document.getElementById('personDetails').innerHTML = `
            <div><strong>Born:</strong> ${person.birth_date || 'Unknown'}</div>
            ${person.death_date ? `<div><strong>Died:</strong> ${person.death_date}</div>` : ''}
            ${person.bio ? `<div><strong>Bio:</strong> ${person.bio}</div>` : ''}
        `;
        
        // Load stories
        this.loadPersonStories(personId);
        
        document.getElementById('personModal').style.display = 'block';
        this.hideContextMenu();
    }
    
    async loadPersonStories(personId) {
        const storiesContainer = document.getElementById('personStories');
        storiesContainer.innerHTML = '<div class="loading-stories">Loading stories...</div>';
        
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}/stories`);
            if (!response.ok) throw new Error('Failed to load stories');
            
            const result = await response.json();
            const stories = result.stories || [];
            
            if (stories.length === 0) {
                storiesContainer.innerHTML = '<div class="no-stories">No stories yet. Click "Add Story" to share a memory!</div>';
                return;
            }
            
            storiesContainer.innerHTML = stories.map(story => `
                <div class="story-item">
                    <div class="story-header">
                        <h4 class="story-title">${story.title}</h4>
                        <div class="story-meta">
                            <span class="story-year">${story.year || 'Unknown year'}</span>
                            <span class="story-category">${story.category || 'General'}</span>
                        </div>
                    </div>
                    <div class="story-content">${story.content}</div>
                    ${story.photo_url ? `<img src="${story.photo_url}" class="story-photo" alt="Story photo">` : ''}
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading stories:', error);
            storiesContainer.innerHTML = '<div class="error">Failed to load stories.</div>';
        }
    }
    
    openEditPersonModal(personId) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        // Populate form
        document.getElementById('editFirstName').value = person.first_name || '';
        document.getElementById('editLastName').value = person.last_name || '';
        document.getElementById('editBirthDate').value = person.birth_date || '';
        document.getElementById('editDeathDate').value = person.death_date || '';
        document.getElementById('editBio').value = person.bio || '';
        
        // Set node customization
        document.getElementById('editNodeColor').value = person.node_color || '#90EE90';
        
        // Update color swatches
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
            if (swatch.dataset.color === (person.node_color || '#90EE90')) {
                swatch.classList.add('selected');
            }
        });
        
        // Set shape
        document.querySelectorAll('.shape-option').forEach(shape => {
            shape.classList.remove('selected');
            if (shape.dataset.shape === (person.node_shape || 'circle')) {
                shape.classList.add('selected');
            }
        });
        document.querySelector('input[name="node_shape"]').value = person.node_shape || 'circle';
        
        // Update preview
        this.updateNodePreview(person.node_color || '#90EE90', person.node_shape || 'circle');
        
        // Setup form handler
        const form = document.getElementById('editPersonForm');
        form.onsubmit = (e) => this.handleEditPersonSubmit(e, personId);
        
        document.getElementById('editPersonModal').style.display = 'block';
        this.hideContextMenu();
    }
    
    updateNodePreview(color, shape) {
        const preview = document.getElementById('nodePreview');
        if (!preview) return;
        
        const darkColor = this.darkenColor(color, 0.3);
        
        switch (shape) {
            case 'square':
                preview.style.borderRadius = '15%';
                break;
            case 'diamond':
                preview.style.borderRadius = '15%';
                preview.style.transform = 'rotate(45deg)';
                break;
            case 'star':
                // For star, we'd need to use CSS clip-path or SVG
                preview.style.borderRadius = '50%';
                preview.style.transform = 'none';
                break;
            default: // circle
                preview.style.borderRadius = '50%';
                preview.style.transform = 'none';
        }
        
        preview.style.background = `linear-gradient(45deg, ${color}, ${darkColor})`;
        preview.style.borderColor = darkColor;
    }
    
    darkenColor(color, factor) {
        // Simple color darkening function
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const darkR = Math.floor(r * (1 - factor));
        const darkG = Math.floor(g * (1 - factor));
        const darkB = Math.floor(b * (1 - factor));
        
        return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
    }
    
    async handleEditPersonSubmit(e, personId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name'),
                    birth_date: formData.get('birth_date'),
                    death_date: formData.get('death_date'),
                    bio: formData.get('bio'),
                    node_color: formData.get('node_color'),
                    node_shape: formData.get('node_shape')
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to update person');
            }
            
            this.showSuccessMessage('Person updated successfully!');
            document.getElementById('editPersonModal').style.display = 'none';
            
            await this.loadTreeData();
            this.renderTree();
            
        } catch (error) {
            console.error('Error updating person:', error);
            this.showErrorMessage('Failed to update person');
        }
    }
    
    openAddStoryModal(personId) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        // Setup form handler
        const form = document.getElementById('addStoryForm');
        form.onsubmit = (e) => this.handleAddStorySubmit(e, personId);
        
        document.getElementById('addStoryModal').style.display = 'block';
        this.hideContextMenu();
    }
    
    async handleAddStorySubmit(e, personId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Add person_id and family_id to formData
        formData.append('person_id', personId);
        formData.append('family_id', this.familyCode);
        
        try {
            const response = await fetch(`/familyTimeline/api/story`, {
                method: 'POST',
                body: formData // Send as FormData to handle file upload
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to add story');
            }
            
            this.showSuccessMessage('Story added successfully!');
            document.getElementById('addStoryModal').style.display = 'none';
            e.target.reset();
            
        } catch (error) {
            console.error('Error adding story:', error);
            this.showErrorMessage('Failed to add story');
        }
    }
    
    openAddSpouseModal(personId) {
        console.log('Opening add spouse modal for person:', personId);
        // Implementation would go here - show add spouse modal
        this.hideContextMenu();
    }
    
    openAddChildModal(personId) {
        console.log('Opening add child modal for person:', personId);
        // Implementation would go here - show add child modal
        this.hideContextMenu();
    }
    
    openDeletePersonModal(personId) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;
        
        if (confirm(`Are you sure you want to delete ${person.first_name}? This action cannot be undone.`)) {
            this.deletePerson(personId);
        }
        this.hideContextMenu();
    }
    
    async deletePerson(personId) {
        try {
            const response = await fetch(`/familyTimeline/api/person/${personId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete person');
            }
            
            this.showSuccessMessage('Person deleted successfully');
            await this.loadTreeData();
            this.renderTree();
            
        } catch (error) {
            console.error('Error deleting person:', error);
            this.showErrorMessage('Failed to delete person');
        }
    }
    
    // ===========================================
    // UTILITY METHODS (from gridFamilyTree.js)
    // ===========================================
    
    getSpouse(personId) {
        const spouseRel = this.relationships.find(rel => 
            rel.relationship_type === 'spouse' && 
            (rel.person1_id === personId || rel.person2_id === personId)
        );
        
        if (!spouseRel) return null;
        
        const spouseId = spouseRel.person1_id === personId ? 
            spouseRel.person2_id : spouseRel.person1_id;
        
        return this.people.find(p => p.id === spouseId);
    }
    
    getChildren(personId) {
        return this.relationships
            .filter(rel => rel.relationship_type === 'parent' && rel.person1_id === personId)
            .map(rel => this.people.find(p => p.id === rel.person2_id))
            .filter(Boolean);
    }
    
    // ===========================================
    // RENDERING SYSTEM (from gridFamilyTree.js)
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
        const connectionPreview = document.getElementById('connectionPreview');
        
        if (gridOverlay) gridOverlay.innerHTML = '';
        if (connections) connections.innerHTML = '';
        if (people) people.innerHTML = '';
        if (connectionPreview) connectionPreview.innerHTML = '';
    }
    
    renderGridOverlay() {
        const container = document.getElementById('gridOverlay');
        if (!container) return;
        
        let gridHTML = '';
        
        const gridWidth = this.gridCols * this.gridCellSize;
        const gridHeight = this.gridRows * this.gridCellSize;
        
        gridHTML += `<rect x="${this.gridStartX}" y="${this.gridStartY}" 
                     width="${gridWidth}" height="${gridHeight}"
                     fill="rgba(255,255,255,0.1)" stroke="rgba(46,125,50,0.3)" 
                     stroke-width="2" stroke-dasharray="10,5" rx="10"/>`;
        
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
                    
                    gridHTML += `<circle cx="${coords.x}" cy="${coords.y}" r="8" 
                                 fill="rgba(46,125,50,0.4)" stroke="#2E7D32" stroke-width="2"
                                 class="grid-spot" opacity="0.7"/>`;
                    
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
        
        // Clear existing nodes to prevent duplicates
        container.innerHTML = '';
        
        this.people.forEach(person => {
            if (typeof person.grid_row === 'number' && typeof person.grid_col === 'number') {
                this.createPersonNode(container, person);
            }
        });
    }
    
    createPersonNode(container, person) {
        // Ensure no duplicate nodes exist
        const existingNode = container.querySelector(`[data-person-id="${person.id}"]`);
        if (existingNode) {
            existingNode.remove();
        }
        
        const coords = this.gridToPixelCoordinates(person.grid_row, person.grid_col);
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'person-node');
        group.setAttribute('data-person-id', person.id);
        
        if (this.isConnecting) {
            group.style.cursor = 'pointer';
        } else if (this.isEditMode) {
            group.style.cursor = 'move';
        } else {
            group.style.cursor = 'pointer';
        }
        
        // Person circle with custom color
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', coords.x);
        circle.setAttribute('cy', coords.y);
        circle.setAttribute('r', '30');
        
        const nodeColor = person.node_color || '#90EE90';
        const darkColor = this.darkenColor(nodeColor, 0.3);
        
        const gradientId = `personGradient${person.id}`;
        let defs = document.querySelector('#gridTreeSVG defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            document.getElementById('gridTreeSVG').appendChild(defs);
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
        
        circle.setAttribute('fill', `url(#${gradientId})`);
        circle.setAttribute('stroke', darkColor);
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
            e.preventDefault();
            e.stopPropagation();
            this.handlePersonClick(person.id, e);
        });
        
        // Drag handlers only in edit mode and not connecting
        if (this.isEditMode && !this.isConnecting) {
            this.setupPersonDragAndDrop(group, person);
        }
        
        container.appendChild(group);
    }

    // Utility method for darkening colors
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
    
    renderConnections() {
        const container = document.getElementById('connections');
        if (!container) return;
        
        this.renderSpouseConnections(container);
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
        
        // Draw red line between spouses
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', coords1.x);
        line.setAttribute('y1', coords1.y);
        line.setAttribute('x2', coords2.x);
        line.setAttribute('y2', coords2.y);
        line.setAttribute('stroke', '#DC143C');
        line.setAttribute('stroke-width', '4');
        container.appendChild(line);
        
        // Add heart symbol
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
    // DRAG AND DROP SYSTEM (from gridFamilyTree.js)
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
    
    // Simple and clean handleMouseDown - EXACT from working version
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
        
        // Add global mouse events - EXACT binding from working version
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Visual feedback
        document.body.style.cursor = 'none';
        document.body.classList.add('dragging');
    }

    // EXACT handleMouseMove from working version
    handleMouseMove(e) {
        if (!this.isDragging || !this.ghostElement) return;
        
        // Move ghost with cursor
        this.ghostElement.style.left = (e.clientX - 35) + 'px';
        this.ghostElement.style.top = (e.clientY - 35) + 'px';
        
        // Check if over drop zone for visual feedback
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        const isOverDropZone = elementBelow && elementBelow.classList.contains('grid-click-area');
        
        if (isOverDropZone) {
            // Visual feedback to ghost - make it green when over valid drop zone
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

    // Clean handleMouseUp - EXACT from working version
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

    // EXACT updatePersonGridPosition from working version
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
            
            // Update in database - THIS IS THE EXACT WORKING VERSION
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
    // Simple cleanup - EXACT from working version
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

    // Simple revert - EXACT from working version
    revertDrag() {
        // Show error message
        this.showErrorMessage('Cannot drop there - position is occupied or invalid');
    }

    // EXACT showDropZones from working version
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
    
    // EXACT hideDropZones from working version
    hideDropZones() {
        console.log('🚫 HIDING DROP ZONES');
        
        const dropZones = document.querySelectorAll('.drop-zone-active');
        console.log(`Hiding ${dropZones.length} drop zones`);
        
        dropZones.forEach(zone => {
            zone.classList.remove('drop-zone-active', 'drop-zone-hover');
        });
    }

    // EXACT createGhostElement from working version
    createGhostElement(person, originalElement) {
        this.ghostElement = document.createElement('div');
        this.ghostElement.className = 'drag-ghost';
        
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
        
        const initials = `${person.first_name[0]}${(person.last_name && person.last_name[0]) || ''}`;
        circle.textContent = initials;
        
        const nameLabel = document.createElement('div');
        nameLabel.style.cssText = `
            font-size: 9px;
            color: #333;
            text-align: center;
            font-weight: bold;
            max-width: 60px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        nameLabel.textContent = person.first_name;
        
        this.ghostElement.appendChild(circle);
        this.ghostElement.appendChild(nameLabel);
        document.body.appendChild(this.ghostElement);
    }

    
    // ===========================================
    // EVENT LISTENERS (from gridFamilyTree.js)
    // ===========================================
    
    setupEventListeners() {
        this.setupViewControls();
        this.setupEditControls();
        this.setupTreeInteractions();
        this.setupContextMenu();
        this.setupFormHandlers();
    }
    
    setupViewControls() {
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
        document.getElementById('toggleEditMode')?.addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        document.getElementById('connectSpouse')?.addEventListener('click', () => {
            this.startConnection('spouse');
        });
        
        document.getElementById('connectParent')?.addEventListener('click', () => {
            this.startConnection('parent');
        });
        
        document.getElementById('cancelConnection')?.addEventListener('click', () => {
            this.cancelConnection();
        });
        
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
    }
    
    setupTreeInteractions() {
        const svg = document.getElementById('gridTreeSVG');
        if (!svg) return;
        
        svg.addEventListener('click', (e) => {
            if (this.isEditMode && e.target.classList.contains('grid-click-area')) {
                const row = parseInt(e.target.getAttribute('data-row'));
                const col = parseInt(e.target.getAttribute('data-col'));
                this.handleGridClick(row, col);
            }
        });
        
        this.setupPanZoom(svg);
        
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
    
    setupFormHandlers() {
        // Add Person Form
        const addPersonForm = document.getElementById('addPersonForm');
        if (addPersonForm) {
            addPersonForm.addEventListener('submit', async (e) => {
                await this.handleAddPersonSubmit(e);
            });
        }
        
        // Color swatch handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-swatch')) {
                const color = e.target.dataset.color;
                const colorInput = document.querySelector('#editNodeColor');
                if (colorInput) {
                    colorInput.value = color;
                    // Update swatches
                    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                    e.target.classList.add('selected');
                    // Update preview
                    const shape = document.querySelector('input[name="node_shape"]').value;
                    this.updateNodePreview(color, shape);
                }
            }
        });
        
        // Shape option handlers
        document.addEventListener('click', (e) => {
            if (e.target.closest('.shape-option')) {
                const shapeOption = e.target.closest('.shape-option');
                const shape = shapeOption.dataset.shape;
                document.querySelectorAll('.shape-option').forEach(s => s.classList.remove('selected'));
                shapeOption.classList.add('selected');
                document.querySelector('input[name="node_shape"]').value = shape;
                // Update preview
                const color = document.getElementById('editNodeColor').value;
                this.updateNodePreview(color, shape);
            }
        });
        
        // Color input change handler
        document.addEventListener('change', (e) => {
            if (e.target.id === 'editNodeColor') {
                const color = e.target.value;
                const shape = document.querySelector('input[name="node_shape"]').value;
                this.updateNodePreview(color, shape);
            }
        });
        
        // Photo upload preview handlers
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.accept.includes('image')) {
                this.handlePhotoPreview(e);
            }
        });
    }
    
    handlePhotoPreview(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('addPersonPhotoPreview');
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    handleGridClick(row, col) {
        console.log(`Grid clicked: [${row}, ${col}]`);
        this.pendingGridPosition = { row, col };
        this.openAddPersonModal();
    }
    
    
    openAddPersonModal() {
        console.log('Opening add person modal for grid position:', this.pendingGridPosition);
        
        // Show the modal
        const modal = document.getElementById('addPersonModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Reset form
            const form = document.getElementById('addPersonForm');
            if (form) {
                form.reset();
                // Set up form submission handler
                form.onsubmit = (e) => this.handleAddPersonSubmit(e);
            }
            
            // Clear photo preview
            const photoPreview = document.getElementById('addPersonPhotoPreview');
            if (photoPreview) photoPreview.style.display = 'none';
        }
        
        this.hideContextMenu();
    }
    
    async handleAddPersonSubmit(e) {
        e.preventDefault();
        
        console.log('=== Adding person to grid position:', this.pendingGridPosition);
        
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
                bio_summary: formData.get('bio_summary'),
                // Add grid position
                grid_row: this.pendingGridPosition ? this.pendingGridPosition.row : null,
                grid_col: this.pendingGridPosition ? this.pendingGridPosition.col : null
            };
            
            // Handle photo upload
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                const photoData = await this.fileToBase64(photoFile);
                personData.photo_data = photoData;
                personData.photo_filename = photoFile.name;
            }
            
            console.log('Creating person with data:', personData);
            
            const response = await fetch('/familyTimeline/api/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create person: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Person created:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to create person');
            }
            
            // Close modal and reset form
            const modal = document.getElementById('addPersonModal');
            if (modal) modal.style.display = 'none';
            e.target.reset();
            
            // Clear pending position
            this.pendingGridPosition = null;
            
            this.showSuccessMessage(`${personData.first_name} added successfully!`);
            
            // Reload and re-render tree
            await this.loadTreeData();
            this.renderTree();
            
        } catch (error) {
            console.error('Error adding person:', error);
            this.showErrorMessage('Failed to add person: ' + error.message);
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
    
    adjustGridSize(newRows, newCols) {
        this.gridRows = Math.max(3, Math.min(15, newRows));
        this.gridCols = Math.max(6, Math.min(25, newCols));
        
        document.getElementById('gridRowsValue').textContent = this.gridRows;
        document.getElementById('gridColsValue').textContent = this.gridCols;
        
        console.log(`Grid resized to: ${this.gridRows} × ${this.gridCols}`);
        
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
    }
    
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
}

// ===========================================
// INITIALIZATION
// ===========================================

// Initialize the enhanced grid family tree when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Enhanced GridFamilyTree DOMContentLoaded ===');
    
    const urlParams = new URLSearchParams(window.location.search);
    const familyCodeFromURL = urlParams.get('family');
    const familyCodeFromWindow = window.familyCode;
    
    const finalFamilyCode = familyCodeFromURL || familyCodeFromWindow;
    
    if (finalFamilyCode) {
        console.log('✅ Creating Enhanced GridFamilyTree with familyCode:', finalFamilyCode);
        window.enhancedGridFamilyTree = new EnhancedGridFamilyTree(finalFamilyCode);
    } else {
        console.error('❌ No family code found! Cannot initialize enhanced grid tree.');
    }
});

// Export for manual initialization if needed
window.EnhancedGridFamilyTree = EnhancedGridFamilyTree;