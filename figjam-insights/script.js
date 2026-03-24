// FigJam Board Analyzer Application
class FigJamAnalyzer {
    constructor() {
        this.initializeElements();
        this.loadSavedToken();
        this.bindEvents();
        this.analysisResults = null;
        this.figmaApiBase = 'https://api.figma.com/v1';
    }

    initializeElements() {
        this.tokenInput = document.getElementById('figma-token');
        this.awsServiceInput = document.getElementById('aws-service');
        this.urlInput = document.getElementById('figjam-url');
        this.analyzeBtn = document.getElementById('analyze-btn');
        this.resultsSection = document.getElementById('results-section');
        this.errorSection = document.getElementById('error-section');
        this.boardInfo = document.getElementById('board-info');
        this.boardOverview = document.getElementById('board-overview');
        this.keyFindings = document.getElementById('key-findings');
        this.themesCategories = document.getElementById('themes-categories');
        this.stickyAnalysis = document.getElementById('sticky-analysis');
        this.detailedSummary = document.getElementById('detailed-summary-content');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');
        this.exportPdfBtn = document.getElementById('export-pdf');
        this.exportMarkdownBtn = document.getElementById('export-markdown');
        this.copySummaryBtn = document.getElementById('copy-summary');
    }

    loadSavedToken() {
        // Load token from localStorage if it exists
        const savedToken = localStorage.getItem('figma_access_token');
        if (savedToken) {
            this.tokenInput.value = savedToken;
            this.tokenInput.type = 'password'; // Keep it masked
            this.showTokenStatus(true);
            console.log('Loaded saved Figma token');
            
            // Trigger validation after loading the token
            setTimeout(() => {
                this.validateInputs();
            }, 100);
        }
    }

    saveToken(token) {
        // Save token to localStorage
        if (token && this.isValidFigmaToken(token)) {
            localStorage.setItem('figma_access_token', token);
            this.showTokenStatus(true);
            console.log('Figma token saved');
        }
    }

    clearSavedToken() {
        localStorage.removeItem('figma_access_token');
        this.showTokenStatus(false);
        console.log('Figma token cleared');
    }

    clearTokenAndRefresh() {
        this.clearSavedToken();
        this.tokenInput.value = '';
        this.validateInputs();
    }

    showTokenStatus(isSaved) {
        const statusElement = document.getElementById('token-status');
        const clearButton = document.getElementById('clear-token-btn');
        
        if (statusElement) {
            statusElement.style.display = isSaved ? 'inline' : 'none';
        }
        
        if (clearButton) {
            clearButton.style.display = isSaved ? 'inline-block' : 'none';
        }
    }

    bindEvents() {
        this.tokenInput.addEventListener('input', () => this.validateInputs());
        this.urlInput.addEventListener('input', () => this.validateInputs());
        this.analyzeBtn.addEventListener('click', () => this.analyzeBoard());
        this.retryBtn.addEventListener('click', () => this.hideError());
        this.exportMarkdownBtn.addEventListener('click', () => this.exportToMarkdown());
        this.copySummaryBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Enter key support
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.analyzeBtn.disabled) {
                this.analyzeBoard();
            }
        });
        
        this.tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.analyzeBtn.disabled) {
                this.analyzeBoard();
            }
        });
    }

    validateInputs() {
        const token = this.tokenInput.value.trim();
        const url = this.urlInput.value.trim();
        
        const isTokenValid = this.isValidFigmaToken(token);
        const isUrlValid = this.isFigJamUrl(url);
        
        console.log('Validation:', { 
            token: token.substring(0, 10) + '...', 
            tokenLength: token.length,
            isTokenValid, 
            url, 
            isUrlValid,
            buttonElement: this.analyzeBtn,
            buttonDisabled: this.analyzeBtn?.disabled
        });
        
        if (this.analyzeBtn) {
            this.analyzeBtn.disabled = !(isTokenValid && isUrlValid);
            console.log('Button disabled set to:', this.analyzeBtn.disabled);
        } else {
            console.error('Analyze button element not found!');
        }
        
        // Visual feedback for token
        if (token && !isTokenValid) {
            this.tokenInput.style.borderColor = '#ef4444';
        } else {
            this.tokenInput.style.borderColor = '#e2e8f0';
        }
        
        // Visual feedback for URL
        if (url && !isUrlValid) {
            this.urlInput.style.borderColor = '#ef4444';
        } else {
            this.urlInput.style.borderColor = '#e2e8f0';
        }
    }

    isValidFigmaToken(token) {
        // Figma tokens are typically 40+ characters
        // Accept any token that's reasonably long
        if (!token || token.length < 15) {
            console.log('Token too short:', token.length);
            return false;
        }
        
        // Most Figma tokens start with 'figd_' but let's be flexible
        const isValid = token.length >= 15;
        console.log('Token validation:', { length: token.length, isValid });
        return isValid;
    }

    isFigJamUrl(url) {
        if (!url) {
            console.log('URL is empty');
            return false;
        }
        
        try {
            const urlObj = new URL(url);
            const validHostnames = ['www.figma.com', 'figma.com'];
            const hasValidHostname = validHostnames.includes(urlObj.hostname);
            const hasValidPath = urlObj.pathname.includes('/board/') || urlObj.pathname.includes('/file/');
            
            console.log('URL validation:', { 
                hostname: urlObj.hostname, 
                hasValidHostname,
                pathname: urlObj.pathname,
                hasValidPath,
                isValid: hasValidHostname && hasValidPath
            });
            
            return hasValidHostname && hasValidPath;
        } catch (error) {
            console.log('URL parse error:', error.message);
            return false;
        }
    }

    extractFileId(url) {
        const match = url.match(/\/(?:board|file)\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async analyzeBoard() {
        const token = this.tokenInput.value.trim();
        const awsService = this.awsServiceInput.value.trim();
        const url = this.urlInput.value.trim();
        
        if (!this.isValidFigmaToken(token)) {
            this.showError('Please enter a valid Figma personal access token');
            return;
        }
        
        if (!this.isFigJamUrl(url)) {
            this.showError('Please enter a valid FigJam board URL');
            return;
        }

        this.setLoading(true);
        this.hideError();
        this.hideResults();

        try {
            const fileId = this.extractFileId(url);
            if (!fileId) {
                throw new Error('Could not extract file ID from URL');
            }

            // Fetch board data from Figma API
            const boardData = await this.fetchBoardData(token, fileId);
            
            // Save token after successful API call
            this.saveToken(token);
            
            // Analyze the board content with AWS service context
            const results = await this.analyzeBoardContent(boardData, url, awsService);
            
            this.analysisResults = results;
            this.displayResults(results);
        } catch (error) {
            console.error('Analysis error:', error);
            
            // If it's an auth error, clear the saved token
            if (error.message.includes('Invalid token') || error.message.includes('Access denied')) {
                this.clearSavedToken();
            }
            
            this.showError(error.message || 'Failed to analyze the FigJam board. Please check your token and URL.');
        } finally {
            this.setLoading(false);
        }
    }

    async fetchBoardData(token, fileId) {
        const response = await fetch(`${this.figmaApiBase}/files/${fileId}`, {
            headers: {
                'X-Figma-Token': token
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Access denied. Check your token permissions or board access.');
            } else if (response.status === 404) {
                throw new Error('Board not found. Please check the URL.');
            } else if (response.status === 401) {
                throw new Error('Invalid token. Please check your Figma personal access token.');
            } else {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
        }

        const boardData = await response.json();
        
        // Get exportable images using the export API
        const imageNodes = this.findImageNodes(boardData);
        if (imageNodes.length > 0) {
            try {
                // Use export API to get image URLs
                const nodeIds = imageNodes.map(node => node.id).join(',');
                const exportResponse = await fetch(
                    `${this.figmaApiBase}/images/${fileId}?ids=${nodeIds}&format=png&scale=2`, 
                    {
                        headers: {
                            'X-Figma-Token': token
                        }
                    }
                );
                
                if (exportResponse.ok) {
                    const exportData = await exportResponse.json();
                    boardData.exportedImages = exportData.images || {};
                    console.log('Exported images:', exportData.images);
                } else {
                    console.warn('Export API failed:', exportResponse.status, exportResponse.statusText);
                    boardData.exportedImages = {};
                }
            } catch (error) {
                console.warn('Could not export images:', error);
                boardData.exportedImages = {};
            }
        } else {
            boardData.exportedImages = {};
        }

        return boardData;
    }

    findImageNodes(boardData) {
        const imageNodes = [];
        
        const traverseNode = (node) => {
            // Look for any node that might contain an image
            if (this.isImageNode(node)) {
                imageNodes.push({
                    id: node.id,
                    name: node.name || 'Image',
                    type: node.type,
                    position: node.absoluteBoundingBox
                });
            }
            
            if (node.children) {
                node.children.forEach(traverseNode);
            }
        };

        if (boardData.document && boardData.document.children) {
            boardData.document.children.forEach(traverseNode);
        }

        return imageNodes;
    }

    isImageNode(node) {
        // Check for image fills
        if (node.fills && node.fills.length > 0) {
            const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
            if (hasImageFill) return true;
        }
        
        // Check for image-like names
        const name = (node.name || '').toLowerCase();
        if (name.includes('image') || name.includes('photo') || name.includes('picture') || 
            name.includes('screenshot') || name.includes('diagram') || name.includes('mockup')) {
            return true;
        }
        
        // Check for rectangles that might be images
        if (node.type === 'RECTANGLE' && node.fills && node.fills.length > 0) {
            return true;
        }
        
        return false;
    }

    async analyzeBoardContent(boardData, url, awsService = '') {
        const stickyNotes = this.extractStickyNotes(boardData);
        const boardInfo = this.extractBoardInfo(boardData);
        
        if (stickyNotes.length === 0) {
            throw new Error('No sticky notes found in this board. Make sure it\'s a FigJam board with sticky notes.');
        }

        // Get AWS service context if provided
        const serviceContext = awsService ? this.getAWSServiceContext(awsService) : null;

        // UX Researcher Analysis with AWS service expertise
        const spatialAnalysis = this.analyzeSpatialPatterns(stickyNotes);
        const reactionAnalysis = this.analyzeReactions(stickyNotes);
        const themes = this.categorizeContentAsUXResearcher(stickyNotes, serviceContext);
        const keyInsights = this.generateUXResearcherInsights(stickyNotes, themes, spatialAnalysis, reactionAnalysis);
        const summary = this.generateUXResearcherSummary(stickyNotes, themes, spatialAnalysis, reactionAnalysis, boardInfo, serviceContext);

        return {
            boardId: this.extractFileId(url),
            boardName: boardInfo.name,
            totalStickyNotes: stickyNotes.length,
            lastModified: new Date(boardInfo.lastModified).toLocaleDateString(),
            collaborators: boardInfo.collaborators || 'Unknown',
            awsService: awsService || null,
            serviceContext: serviceContext,
            stickyNotes: stickyNotes,
            spatialAnalysis,
            reactionAnalysis,
            themes,
            keyInsights,
            summary,
            rawData: boardData
        };
    }

    analyzeSpatialPatterns(stickyNotes) {
        const groups = {};
        
        // Group notes by their groupId
        stickyNotes.forEach(note => {
            if (!groups[note.groupId]) {
                groups[note.groupId] = [];
            }
            groups[note.groupId].push(note);
        });
        
        // Detect columns and rows based on position
        const columns = this.detectColumns(stickyNotes);
        const rows = this.detectRows(stickyNotes);
        
        const patterns = {
            totalGroups: Object.keys(groups).length,
            largestGroup: Math.max(...Object.values(groups).map(g => g.length)),
            averageGroupSize: stickyNotes.length / Object.keys(groups).length,
            isolatedNotes: Object.values(groups).filter(g => g.length === 1).length,
            clusteredNotes: Object.values(groups).filter(g => g.length > 1).length,
            columns: columns,
            rows: rows,
            hasColumnStructure: columns.length >= 2,
            hasRowStructure: rows.length >= 2,
            groupDetails: Object.entries(groups).map(([id, notes]) => ({
                id,
                size: notes.length,
                theme: this.inferGroupTheme(notes),
                position: this.getGroupPosition(notes),
                colors: [...new Set(notes.map(n => n.color))],
                columnIndex: this.getColumnIndex(notes, columns),
                rowIndex: this.getRowIndex(notes, rows)
            }))
        };
        
        return patterns;
    }

    detectColumns(stickyNotes) {
        // Group notes by similar X positions (within 100px tolerance)
        const xPositions = stickyNotes.map(note => note.position.x).sort((a, b) => a - b);
        const columns = [];
        const tolerance = 100;
        
        let currentColumn = { x: xPositions[0], notes: [] };
        
        xPositions.forEach(x => {
            if (Math.abs(x - currentColumn.x) <= tolerance) {
                // Same column
                const notesInColumn = stickyNotes.filter(note => 
                    Math.abs(note.position.x - currentColumn.x) <= tolerance
                );
                currentColumn.notes = notesInColumn;
            } else {
                // New column
                if (currentColumn.notes.length > 0) {
                    columns.push(currentColumn);
                }
                currentColumn = { 
                    x: x, 
                    notes: stickyNotes.filter(note => Math.abs(note.position.x - x) <= tolerance)
                };
            }
        });
        
        if (currentColumn.notes.length > 0) {
            columns.push(currentColumn);
        }
        
        // Infer column names from content or position
        return columns.map((col, index) => ({
            index,
            x: col.x,
            notes: col.notes,
            label: this.inferColumnLabel(col.notes, index, columns.length)
        }));
    }

    detectRows(stickyNotes) {
        // Group notes by similar Y positions (within 100px tolerance)
        const yPositions = stickyNotes.map(note => note.position.y).sort((a, b) => a - b);
        const rows = [];
        const tolerance = 100;
        
        let currentRow = { y: yPositions[0], notes: [] };
        
        yPositions.forEach(y => {
            if (Math.abs(y - currentRow.y) <= tolerance) {
                const notesInRow = stickyNotes.filter(note => 
                    Math.abs(note.position.y - currentRow.y) <= tolerance
                );
                currentRow.notes = notesInRow;
            } else {
                if (currentRow.notes.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = { 
                    y: y, 
                    notes: stickyNotes.filter(note => Math.abs(note.position.y - y) <= tolerance)
                };
            }
        });
        
        if (currentRow.notes.length > 0) {
            rows.push(currentRow);
        }
        
        return rows.map((row, index) => ({
            index,
            y: row.y,
            notes: row.notes,
            label: this.inferRowLabel(row.notes, index)
        }));
    }

    inferColumnLabel(notes, index, totalColumns) {
        const allText = notes.map(n => n.text.toLowerCase()).join(' ');
        
        // Common column patterns
        if (allText.includes('start') || allText.includes('begin') || index === 0) {
            return 'Start/Initial State';
        } else if (allText.includes('stop') || allText.includes('end') || allText.includes('continue') || index === totalColumns - 1) {
            return 'Stop/End State';
        } else if (allText.includes('went well') || allText.includes('good') || allText.includes('positive')) {
            return 'What Went Well';
        } else if (allText.includes('improve') || allText.includes('better') || allText.includes('change')) {
            return 'To Improve';
        } else if (allText.includes('action') || allText.includes('next') || allText.includes('do')) {
            return 'Action Items';
        } else if (allText.includes('idea') || allText.includes('suggestion')) {
            return 'Ideas';
        } else if (allText.includes('problem') || allText.includes('issue') || allText.includes('pain')) {
            return 'Problems/Challenges';
        } else if (allText.includes('question') || allText.includes('unclear')) {
            return 'Questions/Concerns';
        } else {
            return `Column ${index + 1}`;
        }
    }

    inferRowLabel(notes, index) {
        const allText = notes.map(n => n.text.toLowerCase()).join(' ');
        
        if (allText.includes('high priority') || allText.includes('urgent') || allText.includes('critical')) {
            return 'High Priority';
        } else if (allText.includes('medium') || allText.includes('moderate')) {
            return 'Medium Priority';
        } else if (allText.includes('low') || allText.includes('nice to have')) {
            return 'Low Priority';
        } else {
            return `Row ${index + 1}`;
        }
    }

    getColumnIndex(notes, columns) {
        if (notes.length === 0 || columns.length === 0) return -1;
        
        const avgX = notes.reduce((sum, n) => sum + n.position.x, 0) / notes.length;
        
        // Find closest column
        let closestIndex = 0;
        let closestDistance = Math.abs(avgX - columns[0].x);
        
        columns.forEach((col, index) => {
            const distance = Math.abs(avgX - col.x);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        
        return closestIndex;
    }

    getRowIndex(notes, rows) {
        if (notes.length === 0 || rows.length === 0) return -1;
        
        const avgY = notes.reduce((sum, n) => sum + n.position.y, 0) / notes.length;
        
        // Find closest row
        let closestIndex = 0;
        let closestDistance = Math.abs(avgY - rows[0].y);
        
        rows.forEach((row, index) => {
            const distance = Math.abs(avgY - row.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        
        return closestIndex;
    }

    analyzeReactions(stickyNotes) {
        const allReactions = stickyNotes.flatMap(note => note.reactions || []);
        const reactionCounts = {};
        
        // Analyze reactions per note to find highly voted items
        const notesWithVotes = stickyNotes.map(note => {
            const reactions = note.reactions || [];
            const voteCount = reactions.filter(r => 
                r.content === '+1' || 
                r.content === '👍' || 
                r.content === '⭐' ||
                r.content === '❤️' ||
                r.type === 'thumbs_up' ||
                r.type === 'star' ||
                r.type === 'heart'
            ).length;
            
            return {
                note: note.text,
                voteCount,
                reactions,
                hasHighVotes: voteCount >= 3
            };
        }).filter(n => n.voteCount > 0)
          .sort((a, b) => b.voteCount - a.voteCount);
        
        allReactions.forEach(reaction => {
            const key = reaction.content || reaction.type || 'unknown';
            reactionCounts[key] = (reactionCounts[key] || 0) + 1;
        });
        
        return {
            totalReactions: allReactions.length,
            uniqueReactions: Object.keys(reactionCounts).length,
            mostCommonReaction: Object.entries(reactionCounts).sort(([,a], [,b]) => b - a)[0],
            reactionDistribution: reactionCounts,
            engagementLevel: this.calculateEngagementLevel(stickyNotes.length, allReactions.length),
            topVotedNotes: notesWithVotes.slice(0, 5),
            hasVotingPattern: notesWithVotes.length > 0
        };
    }

    inferGroupTheme(notes) {
        const combinedText = notes.map(n => n.text).join(' ').toLowerCase();
        
        // Simple theme inference based on keywords
        if (combinedText.includes('user') || combinedText.includes('customer')) return 'User-focused';
        if (combinedText.includes('problem') || combinedText.includes('issue')) return 'Problem identification';
        if (combinedText.includes('solution') || combinedText.includes('idea')) return 'Solution brainstorming';
        if (combinedText.includes('feature') || combinedText.includes('functionality')) return 'Feature discussion';
        if (combinedText.includes('design') || combinedText.includes('ui')) return 'Design feedback';
        
        return 'General discussion';
    }

    getGroupPosition(notes) {
        const avgX = notes.reduce((sum, n) => sum + n.position.x, 0) / notes.length;
        const avgY = notes.reduce((sum, n) => sum + n.position.y, 0) / notes.length;
        
        // Determine quadrant
        const centerX = 500; // Approximate board center
        const centerY = 500;
        
        if (avgX < centerX && avgY < centerY) return 'Top-left';
        if (avgX >= centerX && avgY < centerY) return 'Top-right';
        if (avgX < centerX && avgY >= centerY) return 'Bottom-left';
        return 'Bottom-right';
    }

    calculateEngagementLevel(noteCount, reactionCount) {
        const ratio = reactionCount / noteCount;
        if (ratio > 0.5) return 'High engagement';
        if (ratio > 0.2) return 'Moderate engagement';
        return 'Low engagement';
    }

    extractStickyNotes(boardData) {
        const stickyNotes = [];
        const images = [];
        
        const traverseNode = (node) => {
            if (node.type === 'STICKY') {
                const text = this.extractTextFromNode(node);
                if (text && text.trim()) {
                    stickyNotes.push({
                        id: node.id,
                        text: text.trim(),
                        position: { 
                            x: node.absoluteBoundingBox?.x || 0, 
                            y: node.absoluteBoundingBox?.y || 0,
                            width: node.absoluteBoundingBox?.width || 0,
                            height: node.absoluteBoundingBox?.height || 0
                        },
                        fills: node.fills || [],
                        reactions: this.extractReactions(node),
                        color: this.getStickyColor(node),
                        size: this.getStickySize(node),
                        attachedImages: [] // Will be populated later
                    });
                }
            } else if (this.isImageNode(node)) {
                // Extract image information
                const exportedUrl = boardData.exportedImages && boardData.exportedImages[node.id];
                
                images.push({
                    id: node.id,
                    name: node.name || 'Untitled Image',
                    position: {
                        x: node.absoluteBoundingBox?.x || 0,
                        y: node.absoluteBoundingBox?.y || 0,
                        width: node.absoluteBoundingBox?.width || 0,
                        height: node.absoluteBoundingBox?.height || 0
                    },
                    fills: node.fills || [],
                    imageUrl: exportedUrl,
                    description: this.extractImageDescription(node),
                    nodeType: node.type
                });
            }
            
            if (node.children) {
                node.children.forEach(traverseNode);
            }
        };

        if (boardData.document && boardData.document.children) {
            boardData.document.children.forEach(traverseNode);
        }

        console.log(`Found ${images.length} images, ${images.filter(img => img.imageUrl).length} with URLs`);

        // Find images that are touching or near sticky notes
        const enhancedNotes = this.attachImagesToNotes(stickyNotes, images);
        
        // Analyze spatial groupings
        const groupedNotes = this.analyzeSpatialGroupings(enhancedNotes);
        return groupedNotes;
    }

    isImageNode(node) {
        // Check for image fills first
        if (node.fills && node.fills.length > 0) {
            const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
            if (hasImageFill) return true;
        }
        
        // Check for image-like names
        const name = (node.name || '').toLowerCase();
        if (name.includes('image') || name.includes('photo') || name.includes('picture') || 
            name.includes('screenshot') || name.includes('diagram') || name.includes('mockup') ||
            name.includes('png') || name.includes('jpg') || name.includes('jpeg')) {
            return true;
        }
        
        // Check for specific node types that might contain images
        if (['RECTANGLE', 'FRAME', 'GROUP'].includes(node.type) && node.fills && node.fills.length > 0) {
            // Additional check for non-text content
            const hasText = node.children && node.children.some(child => child.type === 'TEXT');
            if (!hasText && node.absoluteBoundingBox) {
                const { width, height } = node.absoluteBoundingBox;
                // Likely an image if it's a reasonable size and not just a small decoration
                if (width > 50 && height > 50) {
                    return true;
                }
            }
        }
        
        return false;
    }

    extractImageUrl(node, exportedImages) {
        // First try to get exported image URL
        if (exportedImages && exportedImages[node.id]) {
            return exportedImages[node.id];
        }
        
        // Fallback to image fill reference (though this usually won't work for direct display)
        const imageRef = this.getImageRef(node);
        if (imageRef) {
            // Try the standard Figma image URL format
            return `https://s3-alpha.figma.com/img/${imageRef.substring(0, 4)}/${imageRef.substring(4, 8)}/${imageRef.substring(8)}`;
        }
        
        return null;
    }

    extractImageDescription(node) {
        // Try to extract any text description or alt text
        let description = node.name || '';
        
        // Look for text nodes near the image that might be descriptions
        if (node.parent && node.parent.children) {
            const textNodes = node.parent.children.filter(child => 
                child.type === 'TEXT' && 
                this.isNearPosition(node.absoluteBoundingBox, child.absoluteBoundingBox, 50)
            );
            
            if (textNodes.length > 0) {
                const nearbyText = textNodes.map(textNode => 
                    this.extractTextFromNode(textNode)
                ).filter(text => text && text.trim()).join(' ');
                
                if (nearbyText) {
                    description += (description ? ' - ' : '') + nearbyText;
                }
            }
        }
        
        return description || 'Image';
    }

    attachImagesToNotes(stickyNotes, images) {
        const proximityThreshold = 100; // pixels - how close an image needs to be to a sticky note
        
        return stickyNotes.map(note => {
            const attachedImages = images.filter(image => 
                this.isNearPosition(note.position, image.position, proximityThreshold) ||
                this.isTouchingOrOverlapping(note.position, image.position)
            );
            
            return {
                ...note,
                attachedImages: attachedImages.map(img => ({
                    id: img.id,
                    name: img.name,
                    description: img.description,
                    imageUrl: img.imageUrl,
                    position: img.position,
                    relationship: this.determineImageRelationship(note.position, img.position)
                }))
            };
        });
    }

    isNearPosition(pos1, pos2, threshold) {
        if (!pos1 || !pos2) return false;
        
        const centerX1 = pos1.x + (pos1.width || 0) / 2;
        const centerY1 = pos1.y + (pos1.height || 0) / 2;
        const centerX2 = pos2.x + (pos2.width || 0) / 2;
        const centerY2 = pos2.y + (pos2.height || 0) / 2;
        
        const distance = Math.sqrt(
            Math.pow(centerX1 - centerX2, 2) + 
            Math.pow(centerY1 - centerY2, 2)
        );
        
        return distance <= threshold;
    }

    isTouchingOrOverlapping(notePos, imagePos) {
        if (!notePos || !imagePos) return false;
        
        // Check if rectangles are touching or overlapping
        const noteRight = notePos.x + (notePos.width || 0);
        const noteBottom = notePos.y + (notePos.height || 0);
        const imageRight = imagePos.x + (imagePos.width || 0);
        const imageBottom = imagePos.y + (imagePos.height || 0);
        
        return !(noteRight < imagePos.x || 
                notePos.x > imageRight || 
                noteBottom < imagePos.y || 
                notePos.y > imageBottom);
    }

    determineImageRelationship(notePos, imagePos) {
        if (!notePos || !imagePos) return 'nearby';
        
        if (this.isTouchingOrOverlapping(notePos, imagePos)) {
            return 'attached';
        }
        
        const noteCenterX = notePos.x + (notePos.width || 0) / 2;
        const noteCenterY = notePos.y + (notePos.height || 0) / 2;
        const imageCenterX = imagePos.x + (imagePos.width || 0) / 2;
        const imageCenterY = imagePos.y + (imagePos.height || 0) / 2;
        
        const deltaX = imageCenterX - noteCenterX;
        const deltaY = imageCenterY - noteCenterY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right of note' : 'left of note';
        } else {
            return deltaY > 0 ? 'below note' : 'above note';
        }
    }

    extractReactions(node) {
        // Extract any reactions/stickers attached to the sticky note
        const reactions = [];
        
        // Look for reaction nodes near this sticky note
        if (node.reactions) {
            reactions.push(...node.reactions);
        }
        
        // Check for emoji or sticker elements
        if (node.children) {
            node.children.forEach(child => {
                if (child.type === 'TEXT' && this.isEmoji(child.characters)) {
                    reactions.push({
                        type: 'emoji',
                        content: child.characters,
                        position: child.absoluteBoundingBox
                    });
                }
            });
        }
        
        return reactions;
    }

    getStickyColor(node) {
        if (node.fills && node.fills.length > 0) {
            const fill = node.fills[0];
            if (fill.color) {
                const { r, g, b } = fill.color;
                return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
            }
        }
        return '#FFF475'; // Default sticky note yellow
    }

    getStickySize(node) {
        if (node.absoluteBoundingBox) {
            const { width, height } = node.absoluteBoundingBox;
            if (width > 200 || height > 150) return 'large';
            if (width > 120 || height > 100) return 'medium';
            return 'small';
        }
        return 'medium';
    }

    isEmoji(text) {
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        return emojiRegex.test(text);
    }

    analyzeSpatialGroupings(stickyNotes) {
        // Group sticky notes based on spatial proximity
        const groups = [];
        const processed = new Set();
        const proximityThreshold = 150; // pixels
        
        stickyNotes.forEach((note, index) => {
            if (processed.has(index)) return;
            
            const group = {
                id: `group_${groups.length}`,
                notes: [note],
                centerX: note.position.x,
                centerY: note.position.y,
                reactions: [...note.reactions]
            };
            
            processed.add(index);
            
            // Find nearby notes
            stickyNotes.forEach((otherNote, otherIndex) => {
                if (processed.has(otherIndex)) return;
                
                const distance = Math.sqrt(
                    Math.pow(note.position.x - otherNote.position.x, 2) +
                    Math.pow(note.position.y - otherNote.position.y, 2)
                );
                
                if (distance < proximityThreshold) {
                    group.notes.push(otherNote);
                    group.reactions.push(...otherNote.reactions);
                    processed.add(otherIndex);
                }
            });
            
            // Calculate group center
            if (group.notes.length > 1) {
                group.centerX = group.notes.reduce((sum, n) => sum + n.position.x, 0) / group.notes.length;
                group.centerY = group.notes.reduce((sum, n) => sum + n.position.y, 0) / group.notes.length;
            }
            
            groups.push(group);
        });
        
        // Add grouping metadata to each note
        const enhancedNotes = [];
        groups.forEach(group => {
            group.notes.forEach(note => {
                enhancedNotes.push({
                    ...note,
                    groupId: group.id,
                    groupSize: group.notes.length,
                    groupReactions: group.reactions
                });
            });
        });
        
        return enhancedNotes;
    }

    extractTextFromNode(node) {
        if (node.characters) {
            return node.characters;
        }
        
        if (node.children) {
            return node.children
                .map(child => this.extractTextFromNode(child))
                .filter(text => text)
                .join(' ');
        }
        
        return '';
    }

    getAWSServiceContext(serviceName) {
        const service = serviceName.toLowerCase().trim();
        
        // AWS Service Knowledge Base
        const awsServices = {
            'ec2': {
                name: 'Amazon EC2 (Elastic Compute Cloud)',
                description: 'Virtual servers in the cloud',
                commonUseCases: ['Web hosting', 'Application servers', 'Development environments', 'High-performance computing'],
                keyFeatures: ['Instance types', 'Auto Scaling', 'Load balancing', 'Security groups', 'AMIs'],
                userWorkflows: ['Launching instances', 'Configuring security', 'Managing storage', 'Monitoring performance', 'Cost optimization'],
                commonPainPoints: ['Instance sizing', 'Cost management', 'Security configuration', 'Performance tuning', 'Networking complexity']
            },
            's3': {
                name: 'Amazon S3 (Simple Storage Service)',
                description: 'Object storage service',
                commonUseCases: ['Data backup', 'Static website hosting', 'Data lakes', 'Content distribution', 'Archive storage'],
                keyFeatures: ['Buckets', 'Object storage', 'Versioning', 'Lifecycle policies', 'Access control'],
                userWorkflows: ['Creating buckets', 'Uploading objects', 'Setting permissions', 'Configuring lifecycle rules', 'Data retrieval'],
                commonPainPoints: ['Permission management', 'Cost optimization', 'Data organization', 'Access patterns', 'Security policies']
            },
            'lambda': {
                name: 'AWS Lambda',
                description: 'Serverless compute service',
                commonUseCases: ['Event-driven processing', 'API backends', 'Data transformation', 'Automation', 'Real-time file processing'],
                keyFeatures: ['Function execution', 'Event triggers', 'Auto scaling', 'Pay-per-use', 'Integration with AWS services'],
                userWorkflows: ['Writing functions', 'Configuring triggers', 'Managing permissions', 'Monitoring execution', 'Debugging'],
                commonPainPoints: ['Cold starts', 'Timeout limits', 'Debugging complexity', 'IAM permissions', 'Cost visibility']
            },
            'control tower': {
                name: 'AWS Control Tower',
                description: 'Set up and govern multi-account AWS environment',
                commonUseCases: ['Multi-account setup', 'Governance automation', 'Compliance management', 'Landing zone creation', 'Account provisioning'],
                keyFeatures: ['Landing zones', 'Guardrails', 'Account Factory', 'Dashboard', 'Compliance reporting'],
                userWorkflows: ['Setting up landing zones', 'Creating accounts', 'Applying guardrails', 'Monitoring compliance', 'Managing OUs'],
                commonPainPoints: ['Initial setup complexity', 'Customization limitations', 'Migration challenges', 'Understanding guardrails', 'Integration with existing accounts']
            },
            'cloudformation': {
                name: 'AWS CloudFormation',
                description: 'Infrastructure as Code service',
                commonUseCases: ['Infrastructure automation', 'Environment replication', 'Disaster recovery', 'Resource management', 'Compliance'],
                keyFeatures: ['Templates', 'Stacks', 'Change sets', 'Drift detection', 'StackSets'],
                userWorkflows: ['Writing templates', 'Creating stacks', 'Updating resources', 'Managing dependencies', 'Troubleshooting'],
                commonPainPoints: ['Template complexity', 'Error messages', 'Rollback issues', 'Resource dependencies', 'Learning curve']
            },
            'rds': {
                name: 'Amazon RDS (Relational Database Service)',
                description: 'Managed relational database service',
                commonUseCases: ['Application databases', 'Data warehousing', 'Web applications', 'E-commerce', 'Analytics'],
                keyFeatures: ['Multiple engines', 'Automated backups', 'Read replicas', 'Multi-AZ', 'Performance Insights'],
                userWorkflows: ['Creating databases', 'Configuring backups', 'Scaling resources', 'Monitoring performance', 'Security setup'],
                commonPainPoints: ['Performance tuning', 'Cost management', 'Migration complexity', 'Backup strategies', 'Connection limits']
            },
            'dynamodb': {
                name: 'Amazon DynamoDB',
                description: 'NoSQL database service',
                commonUseCases: ['Mobile backends', 'Gaming', 'IoT', 'Real-time applications', 'Session management'],
                keyFeatures: ['Key-value store', 'Auto scaling', 'Global tables', 'Streams', 'Point-in-time recovery'],
                userWorkflows: ['Table design', 'Query optimization', 'Index management', 'Capacity planning', 'Data modeling'],
                commonPainPoints: ['Data modeling', 'Query patterns', 'Cost optimization', 'Capacity planning', 'Hot partitions']
            },
            'iam': {
                name: 'AWS IAM (Identity and Access Management)',
                description: 'Access control and identity management',
                commonUseCases: ['User management', 'Permission control', 'Role-based access', 'Federation', 'Compliance'],
                keyFeatures: ['Users and groups', 'Roles', 'Policies', 'MFA', 'Access Analyzer'],
                userWorkflows: ['Creating users', 'Assigning permissions', 'Managing roles', 'Policy creation', 'Access auditing'],
                commonPainPoints: ['Policy complexity', 'Least privilege', 'Permission troubleshooting', 'Role assumption', 'Policy conflicts']
            },
            'vpc': {
                name: 'Amazon VPC (Virtual Private Cloud)',
                description: 'Isolated cloud network',
                commonUseCases: ['Network isolation', 'Hybrid cloud', 'Multi-tier applications', 'Security zones', 'Private connectivity'],
                keyFeatures: ['Subnets', 'Route tables', 'Internet gateways', 'NAT gateways', 'Security groups'],
                userWorkflows: ['Network design', 'Subnet configuration', 'Routing setup', 'Security configuration', 'Connectivity'],
                commonPainPoints: ['Network design', 'CIDR planning', 'Routing complexity', 'Security group rules', 'Troubleshooting connectivity']
            }
        };
        
        // Find matching service (case-insensitive, partial match)
        for (const [key, context] of Object.entries(awsServices)) {
            if (service.includes(key) || key.includes(service)) {
                return context;
            }
        }
        
        // Generic AWS service context if specific service not found
        return {
            name: serviceName,
            description: 'AWS Service',
            commonUseCases: ['Cloud computing', 'Application hosting', 'Data management', 'Automation'],
            keyFeatures: ['AWS integration', 'Scalability', 'Security', 'Monitoring'],
            userWorkflows: ['Configuration', 'Deployment', 'Management', 'Monitoring', 'Optimization'],
            commonPainPoints: ['Learning curve', 'Cost management', 'Configuration complexity', 'Integration challenges']
        };
    }

    extractBoardInfo(boardData) {
        return {
            name: boardData.name || 'Untitled Board',
            lastModified: boardData.lastModified || new Date().toISOString(),
            collaborators: boardData.collaborators?.length || 0
        };
    }

    categorizeContentAsUXResearcher(stickyNotes, serviceContext = null) {
        // UX Researcher approach to categorization with AWS service context
        let categories = {
            'User Pain Points': ['pain', 'frustrating', 'difficult', 'confusing', 'annoying', 'broken', 'slow', 'hard'],
            'User Needs & Goals': ['need', 'want', 'goal', 'trying to', 'looking for', 'expect', 'should', 'would like'],
            'Usability Issues': ['usability', 'navigation', 'find', 'locate', 'unclear', 'hidden', 'missing', 'lost'],
            'Feature Requests': ['feature', 'add', 'new', 'enhancement', 'improvement', 'could', 'suggestion'],
            'Positive Feedback': ['good', 'great', 'love', 'like', 'works well', 'helpful', 'useful', 'easy'],
            'Technical Issues': ['bug', 'error', 'crash', 'loading', 'performance', 'technical', 'system'],
            'Content & Information': ['content', 'information', 'text', 'copy', 'messaging', 'unclear', 'missing info'],
            'Accessibility Concerns': ['accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast', 'disability', 'inclusive'],
            'Business Impact': ['business', 'revenue', 'conversion', 'engagement', 'retention', 'growth', 'metrics'],
            'Research Insights': ['research', 'data', 'insight', 'finding', 'observation', 'pattern', 'trend']
        };
        
        // Add AWS service-specific categories if context provided
        if (serviceContext) {
            categories[`${serviceContext.name} Specific`] = [
                ...serviceContext.keyFeatures.map(f => f.toLowerCase()),
                ...serviceContext.commonPainPoints.map(p => p.toLowerCase().split(' ')[0])
            ];
        }

        const themes = Object.keys(categories).map(category => ({
            name: category,
            count: 0,
            notes: [],
            spatialGroups: [],
            reactions: [],
            color: this.getUXCategoryColor(category),
            confidence: 0,
            serviceRelevance: 0
        }));

        stickyNotes.forEach(note => {
            const text = note.text.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;

            for (const [categoryName, keywords] of Object.entries(categories)) {
                let score = keywords.filter(keyword => text.includes(keyword)).length;
                
                // Boost score if matches AWS service context
                if (serviceContext && categoryName.includes(serviceContext.name)) {
                    score *= 1.5;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = categoryName;
                }
            }

            if (bestMatch && bestScore > 0) {
                const theme = themes.find(t => t.name === bestMatch);
                theme.count++;
                theme.notes.push(note.text);
                theme.spatialGroups.push(note.groupId);
                theme.reactions.push(...(note.reactions || []));
                theme.confidence = Math.min(100, theme.confidence + (bestScore * 10));
                
                // Calculate service relevance
                if (serviceContext) {
                    const serviceTerms = [
                        ...serviceContext.keyFeatures,
                        ...serviceContext.commonUseCases,
                        ...serviceContext.userWorkflows
                    ].map(t => t.toLowerCase());
                    
                    const relevanceScore = serviceTerms.filter(term => 
                        text.includes(term.toLowerCase())
                    ).length;
                    
                    theme.serviceRelevance += relevanceScore;
                }
            } else {
                // Fallback categorization
                const generalTheme = themes.find(t => t.name === 'Research Insights');
                generalTheme.count++;
                generalTheme.notes.push(note.text);
                generalTheme.spatialGroups.push(note.groupId);
                generalTheme.reactions.push(...(note.reactions || []));
            }
        });

        return themes.filter(theme => theme.count > 0).sort((a, b) => b.count - a.count);
    }

    getUXCategoryColor(category) {
        const colors = {
            'User Pain Points': '#ff4757',
            'User Needs & Goals': '#2ed573',
            'Usability Issues': '#ffa502',
            'Feature Requests': '#3742fa',
            'Positive Feedback': '#2ed573',
            'Technical Issues': '#ff6b6b',
            'Content & Information': '#5352ed',
            'Accessibility Concerns': '#ff9ff3',
            'Business Impact': '#70a1ff',
            'Research Insights': '#7bed9f'
        };
        return colors[category] || '#c7ceea';
    }

    generateUXResearcherInsights(stickyNotes, themes, spatialAnalysis, reactionAnalysis) {
        const insights = [];
        
        // Spatial insights
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes) {
            insights.push(`Strong collaborative patterns observed - ${spatialAnalysis.clusteredNotes} clustered discussion areas suggest organized ideation and consensus-building`);
        } else {
            insights.push(`Distributed thinking pattern - ${spatialAnalysis.isolatedNotes} isolated notes indicate individual brainstorming or diverse perspectives`);
        }
        
        // Engagement insights
        if (reactionAnalysis.totalReactions > 0) {
            insights.push(`${reactionAnalysis.engagementLevel} detected with ${reactionAnalysis.totalReactions} reactions across ${reactionAnalysis.uniqueReactions} different types - indicates active participant involvement`);
        }
        
        // Theme insights
        if (themes.length > 0) {
            const topTheme = themes[0];
            const dominance = Math.round((topTheme.count / stickyNotes.length) * 100);
            
            if (dominance > 40) {
                insights.push(`Clear research focus on ${topTheme.name.toLowerCase()} (${dominance}% of feedback) - suggests well-defined problem space or strong user consensus`);
            } else {
                insights.push(`Balanced research coverage across ${themes.length} categories - indicates comprehensive discovery or complex multi-faceted challenge`);
            }
        }
        
        // UX Research methodology insights
        const hasUserVoice = themes.some(t => t.name.includes('User'));
        const hasUsabilityFocus = themes.some(t => t.name.includes('Usability'));
        const hasBusinessContext = themes.some(t => t.name.includes('Business'));
        
        if (hasUserVoice && hasUsabilityFocus && hasBusinessContext) {
            insights.push('Comprehensive UX research approach - covers user needs, usability concerns, and business impact for holistic understanding');
        } else if (hasUserVoice && hasUsabilityFocus) {
            insights.push('User-centered research focus - strong emphasis on user experience and usability validation');
        } else if (hasBusinessContext) {
            insights.push('Business-oriented research - findings connected to organizational goals and metrics');
        }
        
        return insights.slice(0, 4);
    }

    generateUXResearcherSummary(stickyNotes, themes, spatialAnalysis, reactionAnalysis, boardInfo, serviceContext = null) {
        const totalNotes = stickyNotes.length;
        
        // Detect session type and topic (enhanced with AWS service context)
        const sessionContext = this.detectSessionContext(stickyNotes, themes, serviceContext);
        
        // Cluster into 4-6 thematic groups
        const thematicClusters = this.createThematicClusters(themes, stickyNotes);
        
        // Generate top 3 insights (AWS service-aware)
        const topInsights = this.generateTopInsights(thematicClusters, stickyNotes, spatialAnalysis, serviceContext);
        
        // Generate action items (AWS service-specific)
        const actionItems = this.generateActionItems(thematicClusters, topInsights, serviceContext);
        
        // Add AWS service context section if provided
        const serviceContextSection = serviceContext ? `
**AWS Service Context**: ${serviceContext.name}  
**Service Description**: ${serviceContext.description}  
` : '';
        
        return `
## Research Analysis: ${boardInfo.name}

**Session Type**: ${sessionContext.sessionType}  
**Topic**: ${sessionContext.topic}  
${serviceContextSection}**Total Feedback Items**: ${totalNotes} sticky notes analyzed

---

## Executive Summary

${this.generateExecutiveSummary(thematicClusters, topInsights, totalNotes, serviceContext)}

---

## Top 3 Insights

${topInsights.map((insight, index) => `
### ${index + 1}. ${insight.title}

${insight.description}

**Why this matters**: ${insight.impact}

**Supporting evidence**: ${insight.evidence}
`).join('')}

---

## Thematic Analysis

${thematicClusters.map((cluster, index) => `
### Theme ${index + 1}: ${cluster.title}

**Summary**: ${cluster.summary}

**Contextual Analysis**:
${cluster.contextualInsights.map(insight => `• ${insight}`).join('\n')}

**Key patterns identified**:
${cluster.patterns.map(pattern => `• ${pattern}`).join('\n')}

**Specific Examples with Context**:
${cluster.specificExamples.map(ex => `
• "${ex.quote}"
  ${ex.context.map(c => `  - ${c}`).join('\n')}
`).join('')}

${cluster.quotes.length > cluster.specificExamples.length ? `
**Additional quotes**:
${cluster.quotes.slice(cluster.specificExamples.length, cluster.specificExamples.length + 2).map(quote => `• "${quote}"`).join('\n')}
${cluster.quotes.length > cluster.specificExamples.length + 2 ? `\n*...and ${cluster.quotes.length - cluster.specificExamples.length - 2} more related items*` : ''}
` : ''}

**What this tells us**: ${cluster.interpretation}
`).join('\n')}

---

## Recommended Actions

${serviceContext ? `### AWS ${serviceContext.name} Specific Recommendations\n${this.generateServiceSpecificRecommendations(serviceContext, thematicClusters)}\n\n` : ''}### Immediate Next Steps (This Sprint)
${actionItems.immediate.map((action, i) => `${i + 1}. **${action.title}**: ${action.description}`).join('\n')}

### Short-term Initiatives (Next 1-2 Months)
${actionItems.shortTerm.map((action, i) => `${i + 1}. **${action.title}**: ${action.description}`).join('\n')}

### Strategic Priorities (3+ Months)
${actionItems.longTerm.map((action, i) => `${i + 1}. **${action.title}**: ${action.description}`).join('\n')}

---

## Complete Feedback Inventory

<details>
<summary>Click to view all ${totalNotes} sticky notes from this session</summary>

${stickyNotes.map((note, index) => {
    const groupInfo = note.groupSize > 1 ? ` (grouped with ${note.groupSize - 1} others)` : '';
    const imageInfo = note.attachedImages && note.attachedImages.length > 0 ? 
        `\n   📎 Images: ${note.attachedImages.map(img => `${img.name}`).join(', ')}` : '';
    return `${index + 1}. "${note.text}"${groupInfo}${imageInfo}`;
}).join('\n')}

</details>

---

## Research Methodology

**Analysis approach**: Thematic clustering with pattern recognition${serviceContext ? ` and ${serviceContext.name} domain expertise` : ''}  
**Collaboration assessment**: ${this.assessCollaboration(spatialAnalysis, reactionAnalysis)}  
**Data quality**: ${this.assessDataQuality(stickyNotes, themes)}  
**Confidence level**: ${this.calculateConfidenceLevel(spatialAnalysis, totalNotes)}

*Analysis completed by UX Research AI${serviceContext ? ` with ${serviceContext.name} subject matter expertise` : ''} on ${new Date().toLocaleDateString()}*
        `.trim();
    }

    generateServiceSpecificRecommendations(serviceContext, clusters) {
        const recommendations = [];
        
        // Generate recommendations based on AWS service knowledge
        const topCluster = clusters[0];
        
        if (topCluster && topCluster.title.includes('Pain Points')) {
            recommendations.push(`• Review ${serviceContext.name} configuration against AWS Well-Architected Framework best practices`);
            recommendations.push(`• Conduct hands-on workshop focusing on ${serviceContext.commonPainPoints[0]} mitigation strategies`);
        }
        
        if (topCluster && topCluster.title.includes('Usability')) {
            recommendations.push(`• Simplify ${serviceContext.userWorkflows[0]} workflow with guided setup or templates`);
            recommendations.push(`• Enhance documentation for ${serviceContext.keyFeatures.slice(0, 2).join(' and ')}`);
        }
        
        recommendations.push(`• Leverage ${serviceContext.name} best practices from AWS Solutions Library`);
        recommendations.push(`• Consider AWS Support or Professional Services engagement for ${serviceContext.name} optimization`);
        
        return recommendations.join('\n');
    }

    detectSessionContext(stickyNotes, themes, serviceContext = null) {
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        
        // Detect session type
        let sessionType = 'Collaborative Research Session';
        if (allText.includes('retrospective') || allText.includes('retro') || allText.includes('went well') || allText.includes('improve')) {
            sessionType = 'Team Retrospective';
        } else if (allText.includes('brainstorm') || allText.includes('idea') || allText.includes('what if')) {
            sessionType = 'Brainstorming Session';
        } else if (allText.includes('user') || allText.includes('customer') || allText.includes('feedback')) {
            sessionType = 'User Feedback Session';
        } else if (allText.includes('problem') || allText.includes('issue') || allText.includes('pain')) {
            sessionType = 'Problem Discovery Session';
        } else if (allText.includes('design') || allText.includes('prototype') || allText.includes('mockup')) {
            sessionType = 'Design Review Session';
        }
        
        // Detect topic
        let topic = 'Product Development';
        if (themes.length > 0) {
            const topTheme = themes[0].name;
            if (topTheme.includes('User')) {
                topic = 'User Experience & Needs';
            } else if (topTheme.includes('Technical')) {
                topic = 'Technical Implementation';
            } else if (topTheme.includes('Business')) {
                topic = 'Business Strategy & Goals';
            } else if (topTheme.includes('Design')) {
                topic = 'Design & Interface';
            } else if (topTheme.includes('Feature')) {
                topic = 'Feature Development';
            }
        }
        
        return { sessionType, topic };
    }

    createThematicClusters(themes, stickyNotes) {
        // Consolidate into 4-6 meaningful clusters
        const clusters = [];
        const targetClusters = Math.min(6, Math.max(4, themes.length));
        
        // Take top themes and merge smaller ones
        const significantThemes = themes.slice(0, targetClusters);
        
        significantThemes.forEach(theme => {
            const matchingNotes = stickyNotes.filter(note => theme.notes.includes(note.text));
            
            // Analyze context for these notes
            const contextAnalysis = this.analyzeNoteContext(matchingNotes);
            
            const cluster = {
                title: theme.name,
                noteCount: theme.count,
                quotes: theme.notes,
                summary: this.generateClusterSummary(theme, matchingNotes),
                patterns: this.identifyPatterns(theme.notes),
                interpretation: this.interpretCluster(theme, matchingNotes),
                contextualInsights: contextAnalysis,
                specificExamples: this.extractSpecificExamples(matchingNotes)
            };
            
            clusters.push(cluster);
        });
        
        return clusters;
    }

    analyzeNoteContext(notes) {
        const insights = [];
        
        // Column context
        const columnPositions = notes.map(n => n.groupDetails?.columnIndex).filter(c => c !== undefined && c >= 0);
        if (columnPositions.length > 0) {
            const uniqueColumns = [...new Set(columnPositions)];
            if (uniqueColumns.length === 1) {
                insights.push(`All feedback in this theme appears in the same column, suggesting it represents a specific phase or category in the workflow`);
            } else {
                insights.push(`Feedback spans ${uniqueColumns.length} different columns, indicating this issue affects multiple stages`);
            }
        }
        
        // Image context
        const notesWithImages = notes.filter(n => n.attachedImages && n.attachedImages.length > 0);
        if (notesWithImages.length > 0) {
            insights.push(`${notesWithImages.length} items include visual evidence (screenshots/diagrams), providing concrete examples of the issues`);
        }
        
        // Voting patterns
        const votedNotes = notes.filter(n => {
            const reactions = n.reactions || [];
            return reactions.some(r => 
                r.content === '+1' || r.content === '👍' || r.content === '⭐'
            );
        });
        
        if (votedNotes.length > 0) {
            const totalVotes = votedNotes.reduce((sum, n) => {
                return sum + (n.reactions || []).filter(r => 
                    r.content === '+1' || r.content === '👍' || r.content === '⭐'
                ).length;
            }, 0);
            insights.push(`${votedNotes.length} items received ${totalVotes} votes from participants, indicating strong consensus on priority`);
        }
        
        // Grouping patterns
        const groupedNotes = notes.filter(n => n.groupSize > 1);
        if (groupedNotes.length > notes.length * 0.5) {
            insights.push(`Most items are spatially grouped together, showing participants actively discussed and built on each other's ideas`);
        }
        
        return insights;
    }

    extractSpecificExamples(notes) {
        const examples = [];
        
        notes.forEach(note => {
            let example = {
                quote: note.text,
                context: []
            };
            
            // Add column context
            if (note.groupDetails?.columnIndex >= 0) {
                example.context.push(`Located in column ${note.groupDetails.columnIndex + 1}`);
            }
            
            // Add image context
            if (note.attachedImages && note.attachedImages.length > 0) {
                note.attachedImages.forEach(img => {
                    example.context.push(`Accompanied by ${img.name}: ${this.analyzeImageContext(note.text, img)}`);
                });
            }
            
            // Add voting context
            const voteCount = (note.reactions || []).filter(r => 
                r.content === '+1' || r.content === '👍' || r.content === '⭐'
            ).length;
            
            if (voteCount > 0) {
                example.context.push(`Received ${voteCount} vote${voteCount > 1 ? 's' : ''} from participants`);
            }
            
            if (example.context.length > 0) {
                examples.push(example);
            }
        });
        
        return examples.slice(0, 3); // Top 3 most contextual examples
    }

    analyzeImageContext(noteText, image) {
        const text = noteText.toLowerCase();
        const imageName = (image.name || '').toLowerCase();
        const imageDesc = (image.description || '').toLowerCase();
        
        // Infer what the image shows based on note content and image metadata
        if (text.includes('error') || text.includes('bug') || text.includes('broken')) {
            return 'Screenshot showing the error state or broken functionality';
        } else if (text.includes('confusing') || text.includes('unclear') || text.includes('hard to find')) {
            return 'Screenshot highlighting the confusing interface element';
        } else if (text.includes('slow') || text.includes('performance')) {
            return 'Evidence of performance issues';
        } else if (text.includes('design') || text.includes('layout') || text.includes('ui')) {
            return 'Visual example of the design concern';
        } else if (text.includes('flow') || text.includes('process') || text.includes('workflow')) {
            return 'Diagram illustrating the problematic workflow';
        } else if (imageName.includes('screenshot') || imageName.includes('screen')) {
            return 'Screenshot providing visual context';
        } else if (imageName.includes('diagram') || imageName.includes('flow')) {
            return 'Diagram explaining the concept';
        } else if (imageName.includes('mockup') || imageName.includes('wireframe')) {
            return 'Proposed solution or design mockup';
        } else {
            return 'Visual evidence supporting this feedback';
        }
    }

    generateClusterSummary(theme, notes) {
        const count = theme.count;
        const themeName = theme.name.toLowerCase();
        
        if (theme.name.includes('Pain Points')) {
            return `Participants identified ${count} specific frustrations and obstacles that are preventing them from achieving their goals efficiently. These pain points span workflow inefficiencies, system limitations, and user experience friction.`;
        } else if (theme.name.includes('User Needs')) {
            return `${count} distinct user needs and goals emerged, revealing what participants are trying to accomplish and the outcomes they expect. These needs provide clear direction for prioritizing features and improvements.`;
        } else if (theme.name.includes('Usability')) {
            return `${count} usability challenges were identified where users struggle with navigation, findability, or understanding how to complete tasks. These barriers create friction and reduce efficiency.`;
        } else if (theme.name.includes('Feature Requests')) {
            return `Participants suggested ${count} specific enhancements and new capabilities that would improve their workflows and add value to their experience. These requests represent opportunities for product differentiation.`;
        } else if (theme.name.includes('Positive')) {
            return `${count} positive observations highlight what's working well and should be preserved or amplified. These strengths provide a foundation to build upon and inform future design decisions.`;
        } else if (theme.name.includes('Technical')) {
            return `${count} technical issues were reported that impact system reliability, performance, or functionality. These problems require engineering attention to ensure a stable user experience.`;
        } else if (theme.name.includes('Content')) {
            return `${count} content and messaging concerns indicate where communication is unclear, incomplete, or confusing. Improving these areas will help users better understand and navigate the product.`;
        } else if (theme.name.includes('Accessibility')) {
            return `${count} accessibility barriers were identified that prevent inclusive access for users with different abilities. Addressing these is essential for serving all users effectively.`;
        } else if (theme.name.includes('Business')) {
            return `${count} business-related observations connect user feedback to organizational goals, metrics, and strategic priorities. These insights help align product decisions with business outcomes.`;
        } else {
            return `${count} observations in this category provide valuable context about user behavior, expectations, and system performance that inform product strategy.`;
        }
    }

    identifyPatterns(notes) {
        const patterns = [];
        const allText = notes.join(' ').toLowerCase();
        
        // Frequency patterns
        const commonWords = this.findCommonWords(notes);
        if (commonWords.length > 0) {
            patterns.push(`Recurring themes: ${commonWords.slice(0, 3).join(', ')}`);
        }
        
        // Sentiment patterns
        const negativeWords = ['difficult', 'hard', 'confusing', 'frustrating', 'slow', 'broken', 'missing'];
        const positiveWords = ['easy', 'helpful', 'good', 'works', 'like', 'love'];
        const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
        const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
        
        if (negativeCount > positiveCount * 2) {
            patterns.push('Predominantly negative sentiment indicating significant pain points');
        } else if (positiveCount > negativeCount) {
            patterns.push('Positive sentiment with constructive feedback');
        } else {
            patterns.push('Balanced perspective with both challenges and opportunities');
        }
        
        // Specificity patterns
        const hasSpecificExamples = notes.some(note => 
            note.length > 50 || note.includes('when') || note.includes('because')
        );
        if (hasSpecificExamples) {
            patterns.push('Detailed, specific feedback with concrete examples');
        } else {
            patterns.push('High-level observations that may benefit from follow-up research');
        }
        
        // User focus
        if (allText.includes('user') || allText.includes('customer') || allText.includes('people')) {
            patterns.push('Strong user-centric perspective throughout feedback');
        }
        
        return patterns.slice(0, 4);
    }

    findCommonWords(notes) {
        const words = notes.join(' ').toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 4);
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        const stopWords = ['about', 'would', 'could', 'should', 'there', 'their', 'which', 'these', 'those'];
        
        return Object.entries(frequency)
            .filter(([word]) => !stopWords.includes(word))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .filter(([, count]) => count > 1)
            .map(([word]) => word);
    }

    interpretCluster(theme, notes) {
        const themeName = theme.name;
        const count = theme.count;
        
        if (themeName.includes('Pain Points')) {
            return `These pain points represent immediate barriers to user success and satisfaction. Addressing them should be a high priority as they directly impact user retention and product perception. The frequency and specificity of these issues suggest they're widespread rather than edge cases.`;
        } else if (themeName.includes('User Needs')) {
            return `Understanding these needs is critical for product-market fit. They reveal the jobs users are trying to do and the outcomes they expect. Aligning features and workflows with these needs will increase product value and user satisfaction.`;
        } else if (themeName.includes('Usability')) {
            return `These usability issues create friction that slows users down and increases cognitive load. While they may not prevent task completion, they accumulate to create a frustrating experience. Quick wins in this area can significantly improve user satisfaction.`;
        } else if (themeName.includes('Feature Requests')) {
            return `These requests represent opportunities to expand product value and competitive differentiation. However, they should be validated against broader user needs and business goals before prioritization. Some may address underlying pain points that could be solved differently.`;
        } else if (themeName.includes('Positive')) {
            return `These positive observations identify what's working well and should be protected during future changes. They also suggest patterns that could be extended to other areas of the product. Understanding why these aspects work well informs design principles.`;
        } else if (themeName.includes('Technical')) {
            return `Technical issues erode trust and create negative experiences that overshadow positive aspects. They require engineering resources but should be prioritized based on frequency, severity, and impact on user workflows. Some may have workarounds while others are blockers.`;
        } else {
            return `This feedback provides important context for product decisions and helps build a comprehensive understanding of user needs, behaviors, and expectations. It should inform both immediate tactical decisions and longer-term strategic planning.`;
        }
    }

    generateTopInsights(clusters, stickyNotes, spatialAnalysis, serviceContext = null) {
        const insights = [];
        
        // Insight 1: Highest priority based on votes and spatial organization
        const topCluster = clusters[0];
        if (topCluster) {
            const percentage = Math.round((topCluster.noteCount / stickyNotes.length) * 100);
            
            // Check for voting patterns in this cluster
            const clusterNotes = stickyNotes.filter(n => topCluster.quotes.includes(n.text));
            const votedNotes = clusterNotes.filter(n => {
                const voteCount = (n.reactions || []).filter(r => 
                    r.content === '+1' || r.content === '👍' || r.content === '⭐'
                ).length;
                return voteCount > 0;
            });
            
            const totalVotes = votedNotes.reduce((sum, n) => {
                return sum + (n.reactions || []).filter(r => 
                    r.content === '+1' || r.content === '👍' || r.content === '⭐'
                ).length;
            }, 0);
            
            // Check for column context
            const columnInfo = spatialAnalysis.hasColumnStructure ? 
                this.getColumnContextForCluster(clusterNotes, spatialAnalysis.columns) : null;
            
            let description = `${percentage}% of all feedback relates to ${topCluster.title.toLowerCase()}`;
            
            if (totalVotes > 0) {
                description += `, with ${votedNotes.length} items receiving ${totalVotes} participant votes, indicating strong consensus on priority`;
            }
            
            if (columnInfo) {
                description += `. ${columnInfo}`;
            } else {
                description += `, making this the most critical area requiring immediate attention`;
            }
            
            insights.push({
                title: `${topCluster.title} is the Clear Priority`,
                description,
                impact: this.generateSpecificImpact(topCluster, clusterNotes, votedNotes),
                evidence: this.generateSpecificEvidence(topCluster, clusterNotes, votedNotes, spatialAnalysis)
            });
        }
        
        // Insight 2: Spatial organization reveals workflow or process issues
        if (spatialAnalysis.hasColumnStructure) {
            const columnAnalysis = this.analyzeColumnDistribution(stickyNotes, spatialAnalysis.columns);
            insights.push({
                title: columnAnalysis.title,
                description: columnAnalysis.description,
                impact: columnAnalysis.impact,
                evidence: columnAnalysis.evidence
            });
        } else {
            // Alternative insight about interconnected themes
            const secondCluster = clusters[1];
            if (secondCluster) {
                const secondNotes = stickyNotes.filter(n => secondCluster.quotes.includes(n.text));
                insights.push({
                    title: `${secondCluster.title} Represents Critical Secondary Concern`,
                    description: this.generateSecondaryInsightDescription(secondCluster, secondNotes, stickyNotes.length),
                    impact: this.generateSpecificImpact(secondCluster, secondNotes, []),
                    evidence: this.generateSpecificEvidence(secondCluster, secondNotes, [], spatialAnalysis)
                });
            }
        }
        
        // Insight 3: Visual evidence and specific examples
        const notesWithImages = stickyNotes.filter(n => n.attachedImages && n.attachedImages.length > 0);
        if (notesWithImages.length >= 3) {
            insights.push({
                title: 'Concrete Visual Evidence Validates Feedback',
                description: `${notesWithImages.length} feedback items include screenshots, diagrams, or mockups that provide specific, verifiable examples of the issues raised. This visual documentation moves the feedback beyond subjective opinions to concrete, actionable problems that can be directly addressed.`,
                impact: `The visual evidence eliminates ambiguity about what needs to be fixed. Teams can immediately see the exact problems users are experiencing, reducing back-and-forth clarification and accelerating solution development. This level of specificity increases confidence that solutions will address the actual issues.`,
                evidence: this.generateImageEvidence(notesWithImages)
            });
        } else {
            // Alternative insight about urgency or actionability
            const hasUrgency = stickyNotes.some(note => 
                note.text.toLowerCase().includes('urgent') || 
                note.text.toLowerCase().includes('critical') ||
                note.text.toLowerCase().includes('immediately')
            );
            
            if (hasUrgency) {
                insights.push({
                    title: 'Time-Sensitive Issues Demand Immediate Response',
                    description: `Multiple feedback items explicitly flag urgent or critical issues that are actively blocking users or causing significant problems right now. The language used ("urgent," "critical," "immediately") indicates these aren't future concerns but current pain points requiring rapid intervention.`,
                    impact: `Delayed action on urgent issues risks user churn, negative word-of-mouth, and potential business impact. Users who flag items as urgent are often at a breaking point—addressing these quickly demonstrates responsiveness and can prevent escalation.`,
                    evidence: this.generateUrgencyEvidence(stickyNotes)
                });
            } else {
                insights.push({
                    title: 'Consistent Patterns Enable Confident Prioritization',
                    description: this.generateConsistencyInsight(spatialAnalysis, stickyNotes),
                    impact: `The clarity and consistency of feedback reduces uncertainty in decision-making. Product teams can move forward with confidence that these insights reflect genuine user needs rather than outliers or edge cases.`,
                    evidence: `${spatialAnalysis.clusteredNotes} notes were spatially grouped, showing participants independently arrived at similar conclusions. The thematic clustering reveals clear patterns rather than scattered observations.`
                });
            }
        }
        
        return insights.slice(0, 3);
    }
        

    generateActionItems(clusters, insights, serviceContext = null) {
        const immediate = [];
        const shortTerm = [];
        const longTerm = [];
        
        // Immediate actions based on top cluster
        if (clusters[0]) {
            immediate.push({
                title: `Conduct deep-dive on ${clusters[0].title}`,
                description: `Schedule user interviews or usability testing focused specifically on ${clusters[0].title.toLowerCase()} to validate findings and understand root causes. Aim for 5-8 participants within the next 2 weeks.`
            });
            
            immediate.push({
                title: 'Prioritize quick wins',
                description: `Review the ${clusters[0].noteCount} items in ${clusters[0].title} and identify 2-3 issues that can be addressed quickly (within one sprint) to demonstrate responsiveness and build momentum.`
            });
        }
        
        immediate.push({
            title: 'Share findings with stakeholders',
            description: `Present this analysis to product leadership and key stakeholders within 3-5 days. Include the top 3 insights and recommended priorities to align on next steps and secure resources.`
        });
        
        // Short-term actions
        if (clusters[0]) {
            shortTerm.push({
                title: `Develop comprehensive solution for ${clusters[0].title}`,
                description: `Based on deep-dive research, design and prototype solutions that address the root causes identified in ${clusters[0].title.toLowerCase()}. Plan for iterative testing and refinement.`
            });
        }
        
        if (clusters[1]) {
            shortTerm.push({
                title: `Begin discovery work on ${clusters[1].title}`,
                description: `While the primary focus is on ${clusters[0]?.title || 'the top theme'}, initiate research and planning for ${clusters[1].title.toLowerCase()} to prevent it from becoming a larger issue.`
            });
        }
        
        shortTerm.push({
            title: 'Establish feedback loop',
            description: `Create a system for ongoing user feedback collection and analysis. Set up regular check-ins with participants from this session to validate solutions and track progress.`
        });
        
        // Long-term actions
        longTerm.push({
            title: 'Address systemic issues',
            description: `Many of the identified themes likely stem from deeper systemic issues in product architecture, design patterns, or user workflows. Conduct a comprehensive review to identify and address root causes.`
        });
        
        longTerm.push({
            title: 'Build research repository',
            description: `Document these findings in a centralized research repository that tracks themes over time, connects insights across studies, and makes research accessible to the entire organization.`
        });
        
        longTerm.push({
            title: 'Develop success metrics',
            description: `Define measurable success criteria for each theme (e.g., task completion rates, time-on-task, satisfaction scores) and establish baseline measurements to track improvement over time.`
        });
        
        return { immediate, shortTerm, longTerm };
    }

    generateExecutiveSummary(clusters, insights, totalNotes, serviceContext = null) {
        const topCluster = clusters[0];
        const topPercentage = topCluster ? Math.round((topCluster.noteCount / totalNotes) * 100) : 0;
        
        let summary = `This research session captured ${totalNotes} distinct observations organized into ${clusters.length} thematic clusters. `;
        
        if (topPercentage > 50) {
            summary += `**${topCluster.title}** emerged as the dominant theme, representing ${topPercentage}% of all feedback. This strong consensus indicates a critical area requiring immediate attention. `;
        } else {
            summary += `Feedback is distributed across multiple themes, with **${topCluster.title}** leading at ${topPercentage}% of observations. `;
        }
        
        summary += `\n\nThe analysis reveals ${insights.length} key insights that should inform product strategy and prioritization. `;
        
        if (insights[0]) {
            summary += `Most notably: ${insights[0].description.split('.')[0]}. `;
        }
        
        summary += `\n\n**Bottom line**: ${this.generateBottomLine(clusters, insights)}`;
        
        return summary;
    }

    generateBottomLine(clusters, insights) {
        const topCluster = clusters[0];
        
        if (topCluster.title.includes('Pain Points')) {
            return `Users are experiencing significant friction that's impacting satisfaction and retention. Addressing the identified pain points should be the top priority, with quick wins implemented immediately and comprehensive solutions developed over the next 1-2 months.`;
        } else if (topCluster.title.includes('Feature Requests')) {
            return `Users have clear ideas about how to improve the product. These requests should be validated against broader user needs and business goals, then prioritized based on impact and feasibility. Some may address underlying pain points that could be solved differently.`;
        } else if (topCluster.title.includes('Usability')) {
            return `The product has usability barriers that create friction and slow users down. While not necessarily blockers, these issues accumulate to create frustration. Focused usability improvements will significantly enhance the user experience.`;
        } else if (topCluster.title.includes('User Needs')) {
            return `Users have articulated clear needs and goals that should drive product development. Aligning features and workflows with these needs will increase product-market fit and user satisfaction. This feedback provides a roadmap for strategic planning.`;
        } else {
            return `The feedback provides clear direction for product improvement. Prioritize the top theme, address quick wins immediately, and develop comprehensive solutions for systemic issues. Regular follow-up with users will ensure solutions meet their needs.`;
        }
    }

    calculateConfidenceLevel(spatialAnalysis, totalNotes) {
        let score = 0;
        
        // More notes = higher confidence
        if (totalNotes >= 20) score += 2;
        else if (totalNotes >= 10) score += 1;
        
        // Clustering indicates consensus
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes) score += 2;
        else if (spatialAnalysis.clusteredNotes > 0) score += 1;
        
        // Large clusters indicate strong agreement
        if (spatialAnalysis.largestGroup >= 5) score += 2;
        else if (spatialAnalysis.largestGroup >= 3) score += 1;
        
        if (score >= 5) return 'High - findings are reliable and representative';
        if (score >= 3) return 'Moderate - findings are directionally correct but may benefit from validation';
        return 'Preliminary - findings should be validated with additional research';
    }

    generateExecutiveTakeaways(stickyNotes, themes, spatialAnalysis) {
        const totalNotes = stickyNotes.length;
        const topTheme = themes[0];
        const secondTheme = themes[1];
        const thirdTheme = themes[2];
        
        let takeaways = '';
        
        // Opening paragraph - what this research tells us
        const dominancePercentage = topTheme ? Math.round((topTheme.count / totalNotes) * 100) : 0;
        
        if (dominancePercentage > 50) {
            takeaways += `**The research reveals a clear consensus**: ${dominancePercentage}% of feedback centers on ${topTheme.name.toLowerCase()}, indicating this is the most critical area requiring immediate attention. `;
        } else if (dominancePercentage > 30) {
            takeaways += `**The research shows distributed concerns**: While ${topTheme.name.toLowerCase()} leads the discussion at ${dominancePercentage}% of feedback, participants raised issues across ${themes.length} distinct areas, suggesting a complex challenge that requires a multi-faceted approach. `;
        } else {
            takeaways += `**The research reveals diverse perspectives**: Feedback is well-distributed across ${themes.length} categories, with no single dominant theme. This suggests participants are thinking holistically about the problem space. `;
        }
        
        // Add context about collaboration patterns
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes * 2) {
            takeaways += `The spatial organization of notes shows strong collaborative consensus-building, with ${spatialAnalysis.clusteredNotes} notes grouped into discussion clusters. `;
        } else if (spatialAnalysis.isolatedNotes > spatialAnalysis.clusteredNotes) {
            takeaways += `The spatial organization shows individual brainstorming patterns, with ${spatialAnalysis.isolatedNotes} standalone contributions reflecting diverse independent thinking. `;
        }
        
        takeaways += '\n\n';
        
        // Second paragraph - what the top theme tells us with examples
        if (topTheme && topTheme.notes.length > 0) {
            takeaways += `**${topTheme.name}** emerged as the primary concern. `;
            takeaways += this.generateThemeNarrative(topTheme, stickyNotes);
            takeaways += '\n\n';
        }
        
        // Third paragraph - secondary themes if significant
        if (secondTheme && secondTheme.count >= 2) {
            const secondPercentage = Math.round((secondTheme.count / totalNotes) * 100);
            takeaways += `**${secondTheme.name}** also requires attention, representing ${secondPercentage}% of the feedback. `;
            takeaways += this.generateThemeNarrative(secondTheme, stickyNotes);
            takeaways += '\n\n';
        }
        
        // Fourth paragraph - what this means for the business/product
        takeaways += `**What this means for your product**: `;
        takeaways += this.generateBusinessImplication(themes, stickyNotes, spatialAnalysis);
        
        return takeaways;
    }

    generateThemeNarrative(theme, allStickyNotes) {
        const matchingNotes = allStickyNotes.filter(note => theme.notes.includes(note.text));
        
        // Get representative quotes
        const quotes = matchingNotes.slice(0, 2).map(note => `"${note.text}"`);
        
        let narrative = '';
        
        if (theme.name.includes('Pain Points')) {
            narrative += `Participants identified specific frustrations that are blocking their progress. For example, ${quotes[0] || 'users expressed concerns about workflow efficiency'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These pain points are directly impacting user satisfaction and need to be prioritized in the product roadmap.`;
        } else if (theme.name.includes('User Needs')) {
            narrative += `Participants clearly articulated what they're trying to accomplish. ${quotes[0] || 'Users expressed specific goals'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. Understanding these needs provides a clear direction for feature development and user experience improvements.`;
        } else if (theme.name.includes('Usability')) {
            narrative += `Participants struggled with navigation and findability. ${quotes[0] || 'Users reported difficulty completing tasks'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These usability barriers are creating friction in the user experience and should be addressed through interface redesign and improved information architecture.`;
        } else if (theme.name.includes('Feature Requests')) {
            narrative += `Participants suggested specific enhancements. ${quotes[0] || 'Users requested new capabilities'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These requests represent opportunities to expand product value and better serve user workflows.`;
        } else if (theme.name.includes('Positive')) {
            narrative += `Participants highlighted what's working well. ${quotes[0] || 'Users appreciated certain aspects'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These strengths should be preserved and potentially expanded as the product evolves.`;
        } else if (theme.name.includes('Technical')) {
            narrative += `Participants encountered technical problems. ${quotes[0] || 'Users reported system issues'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These technical issues require engineering attention to ensure system reliability and performance.`;
        } else if (theme.name.includes('Accessibility')) {
            narrative += `Participants identified barriers to inclusive access. ${quotes[0] || 'Users noted accessibility concerns'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. Addressing these concerns is essential for ensuring the product serves all users effectively.`;
        } else {
            narrative += `Key observations include ${quotes[0] || 'various insights'}`;
            if (quotes[1]) {
                narrative += ` and ${quotes[1]}`;
            }
            narrative += `. These insights provide valuable context for product decisions.`;
        }
        
        return narrative;
    }

    generateBusinessImplication(themes, stickyNotes, spatialAnalysis) {
        const hasUserFocus = themes.some(t => t.name.includes('User'));
        const hasPainPoints = themes.some(t => t.name.includes('Pain Points'));
        const hasFeatureRequests = themes.some(t => t.name.includes('Feature'));
        const hasBusinessTheme = themes.some(t => t.name.includes('Business'));
        
        let implication = '';
        
        if (hasPainPoints && hasUserFocus) {
            implication += `The feedback reveals clear user pain points that, if left unaddressed, could impact user retention and satisfaction. `;
        }
        
        if (hasFeatureRequests) {
            implication += `The feature requests represent opportunities to increase product value and competitive differentiation. `;
        }
        
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes) {
            implication += `The strong consensus patterns suggest these findings are reliable and should inform strategic planning. `;
        }
        
        if (hasBusinessTheme) {
            implication += `Participants connected their feedback to business outcomes, indicating awareness of organizational goals. `;
        }
        
        if (!implication) {
            implication = `The diverse feedback provides a comprehensive view of user needs and expectations, offering multiple opportunities for product improvement and innovation. `;
        }
        
        implication += `Prioritizing these insights will help align product development with user needs and business objectives.`;
        
        return implication;
    }

    hasUrgencySignals(stickyNotes) {
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        const urgencyWords = ['urgent', 'critical', 'asap', 'immediately', 'now', 'must', 'need', 'required'];
        return urgencyWords.some(word => allText.includes(word));
    }

    hasSolutionFocus(stickyNotes) {
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        const solutionWords = ['solution', 'fix', 'resolve', 'improve', 'change'];
        return solutionWords.some(word => allText.includes(word));
    }

    isUserFocused(stickyNotes) {
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        const userWords = ['user', 'customer', 'client', 'people'];
        return userWords.some(word => allText.includes(word));
    }

    interpretClusterSize(size) {
        if (size >= 5) return 'strong consensus or major pain point';
        if (size >= 3) return 'moderate agreement or shared concern';
        return 'individual perspective or unique insight';
    }

    synthesizeUXThemeInsights(theme) {
        // Generate a single sentence summary for the theme
        const noteCount = theme.count;
        const themeName = theme.name.toLowerCase();
        
        let summary = '';
        
        // Create contextual summaries based on theme type
        if (theme.name.includes('Pain Points')) {
            summary = `Users are experiencing ${noteCount} distinct frustrations and difficulties that are impacting their ability to complete tasks effectively.`;
        } else if (theme.name.includes('User Needs')) {
            summary = `${noteCount} specific user goals and requirements have been identified that represent opportunities to better serve user expectations.`;
        } else if (theme.name.includes('Usability')) {
            summary = `${noteCount} usability barriers are preventing users from navigating and finding what they need efficiently.`;
        } else if (theme.name.includes('Feature Requests')) {
            summary = `Users have suggested ${noteCount} enhancements and new capabilities that could improve their experience and workflow.`;
        } else if (theme.name.includes('Positive Feedback')) {
            summary = `${noteCount} aspects of the current experience are working well and should be preserved or expanded upon.`;
        } else if (theme.name.includes('Technical')) {
            summary = `${noteCount} technical problems are disrupting the user experience and require engineering attention.`;
        } else if (theme.name.includes('Content')) {
            summary = `${noteCount} content and messaging issues are creating confusion and need clearer communication.`;
        } else if (theme.name.includes('Accessibility')) {
            summary = `${noteCount} accessibility barriers are preventing inclusive access for users with different abilities.`;
        } else if (theme.name.includes('Business')) {
            summary = `${noteCount} business-related concerns highlight potential impacts on organizational goals and metrics.`;
        } else {
            summary = `${noteCount} research insights provide valuable observations about user behavior and system performance.`;
        }
        
        return summary;
    }

    assessSessionEffectiveness(spatialAnalysis, reactionAnalysis, themes) {
        let score = 0;
        let factors = [];
        
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes) {
            score += 2;
            factors.push('good collaboration');
        }
        
        if (reactionAnalysis.totalReactions > 0) {
            score += 2;
            factors.push('active engagement');
        }
        
        if (themes.length >= 3 && themes.length <= 7) {
            score += 2;
            factors.push('balanced coverage');
        }
        
        if (score >= 5) return `Highly effective session (${factors.join(', ')})`;
        if (score >= 3) return `Moderately effective session (${factors.join(', ')})`;
        return `Basic effectiveness (${factors.join(', ') || 'limited engagement patterns'})`;
    }

    assessDataQuality(stickyNotes, themes) {
        const avgLength = stickyNotes.reduce((sum, note) => sum + note.text.length, 0) / stickyNotes.length;
        const hasDetailedNotes = stickyNotes.filter(note => note.text.length > 30).length;
        
        if (avgLength > 40 && hasDetailedNotes > stickyNotes.length * 0.5) {
            return 'High quality - detailed, thoughtful contributions';
        } else if (avgLength > 20) {
            return 'Good quality - clear, concise insights';
        } else {
            return 'Basic quality - brief notes may need follow-up clarification';
        }
    }

    assessCollaboration(spatialAnalysis, reactionAnalysis) {
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes * 2 && reactionAnalysis.totalReactions > 0) {
            return 'Strong collaborative dynamics with active discussion and consensus building';
        } else if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes) {
            return 'Moderate collaboration with some group discussion patterns';
        } else {
            return 'Individual contribution style with limited cross-participant interaction';
        }
    }

    assessActionability(themes) {
        const actionableThemes = themes.filter(theme => 
            theme.name.includes('Pain Points') || 
            theme.name.includes('Feature Requests') || 
            theme.name.includes('Usability Issues') ||
            theme.name.includes('Technical Issues')
        ).length;
        
        const percentage = Math.round((actionableThemes / themes.length) * 100);
        
        if (percentage > 70) return `${percentage}% (high actionability)`;
        if (percentage > 40) return `${percentage}% (moderate actionability)`;
        return `${percentage}% (requires further research)`;
    }

    formatThemeNotesWithImages(theme, allStickyNotes) {
        // Find the full sticky note objects that match this theme's notes
        const themeNoteTexts = theme.notes;
        const matchingNotes = allStickyNotes.filter(note => 
            themeNoteTexts.includes(note.text)
        );
        
        return matchingNotes.map(note => {
            let noteText = `• "${note.text}"`;
            
            // Add attached images if any
            if (note.attachedImages && note.attachedImages.length > 0) {
                const imageHtml = note.attachedImages.map(img => {
                    let imageDisplay = '';
                    
                    if (img.imageUrl) {
                        // Display actual image with error handling
                        imageDisplay = `
                            <img src="${img.imageUrl}" alt="${img.description || img.name}" 
                                 style="max-width: 300px; max-height: 200px; border-radius: 4px; margin: 8px 0; display: block; border: 1px solid #e2e8f0; cursor: pointer;" 
                                 onclick="window.open('${img.imageUrl}', '_blank')"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                            <div style="display: none; width: 250px; height: 150px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #d1d5db; border-radius: 4px; align-items: center; justify-content: center; margin: 8px 0; color: #6b7280; font-size: 12px; flex-direction: column; cursor: pointer;" onclick="alert('Image detected: ${img.name}\\n\\nThis image is attached to the feedback but cannot be displayed directly. View the original FigJam board to see the full image.')">
                                <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                                <div style="font-weight: 500;">${img.name}</div>
                                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px; text-align: center;">Image detected but not accessible<br>Click for more info</div>
                            </div>
                        `;
                    } else {
                        // Fallback to informative placeholder
                        imageDisplay = `
                            <div style="width: 250px; height: 150px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 8px 0; color: #6b7280; font-size: 12px; flex-direction: column; cursor: pointer;" onclick="alert('Image detected: ${img.name}\\n\\nThis image is attached to the feedback but cannot be displayed directly. View the original FigJam board to see the full image.')">
                                <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                                <div style="font-weight: 500;">${img.name}</div>
                                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px; text-align: center;">View in FigJam board<br>Click for more info</div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #3742fa;">
                            <div style="font-size: 12px; color: #3742fa; font-weight: 500; margin-bottom: 4px;">
                                📎 ${img.name} (${img.relationship})
                            </div>
                            ${img.description && img.description !== img.name ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${img.description}</div>` : ''}
                            ${imageDisplay}
                        </div>
                    `;
                }).join('');
                
                noteText += imageHtml;
            }
            
            return noteText;
        }).join('\n');
    }

    getCategoryColor(category) {
        const colors = {
            'User Experience': '#ff6b6b',
            'Technical Issues': '#4ecdc4',
            'Feature Requests': '#45b7d1',
            'Business Concerns': '#96ceb4',
            'Accessibility': '#feca57',
            'Design': '#a8e6cf',
            'Content': '#ff8b94',
            'Other': '#c7ceea'
        };
        return colors[category] || '#c7ceea';
    }

    generateThemeInsights(topThemes, totalNotes) {
        if (topThemes.length === 0) return { dominancePattern: 'No clear themes identified' };
        
        const topPercentage = Math.round((topThemes[0].count / totalNotes) * 100);
        
        let dominancePattern;
        if (topPercentage > 50) {
            dominancePattern = `Strong consensus with ${topPercentage}% of feedback focusing on ${topThemes[0].name.toLowerCase()}`;
        } else if (topPercentage > 30) {
            dominancePattern = `${topThemes[0].name} leads discussion but feedback spans multiple areas`;
        } else {
            dominancePattern = `Distributed feedback across ${topThemes.length} primary themes indicates complex challenge`;
        }
        
        return { dominancePattern };
    }

    generateCollaborationInsights(stickyNotes, themes) {
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        const avgNoteLength = stickyNotes.reduce((sum, note) => sum + note.text.length, 0) / stickyNotes.length;
        
        // Determine session type
        const questionWords = ['how', 'what', 'why', 'when', 'where', '?'];
        const solutionWords = ['solution', 'fix', 'resolve', 'improve', 'change'];
        const problemWords = ['problem', 'issue', 'pain', 'difficult', 'challenge'];
        
        const questionCount = questionWords.filter(word => allText.includes(word)).length;
        const solutionCount = solutionWords.filter(word => allText.includes(word)).length;
        const problemCount = problemWords.filter(word => allText.includes(word)).length;
        
        let sessionType, focusType, maturityLevel, consensusLevel, style;
        
        if (questionCount > solutionCount) {
            sessionType = 'Discovery-focused session with emphasis on problem exploration';
            focusType = 'Problem identification and understanding';
            maturityLevel = 'Early-stage exploration';
        } else if (solutionCount > problemCount) {
            sessionType = 'Solution-oriented session moving toward actionable outcomes';
            focusType = 'Solution development and planning';
            maturityLevel = 'Advanced problem-solving phase';
        } else {
            sessionType = 'Balanced discussion covering both problems and potential solutions';
            focusType = 'Comprehensive problem-solution analysis';
            maturityLevel = 'Mid-stage collaborative analysis';
        }
        
        // Determine consensus level
        const topThemePercentage = themes.length > 0 ? Math.round((themes[0].count / stickyNotes.length) * 100) : 0;
        if (topThemePercentage > 50) {
            consensusLevel = 'High consensus around primary theme';
        } else if (topThemePercentage > 30) {
            consensusLevel = 'Moderate consensus with some divergent views';
        } else {
            consensusLevel = 'Diverse perspectives with distributed focus';
        }
        
        // Determine collaboration style
        if (avgNoteLength > 50) {
            style = 'Detailed, thoughtful contributions';
        } else if (avgNoteLength > 20) {
            style = 'Concise, focused input';
        } else {
            style = 'Quick, rapid-fire ideation';
        }
        
        return { sessionType, focusType, maturityLevel, consensusLevel, style };
    }

    getThemeCharacterization(theme, allText) {
        const themeText = theme.notes.join(' ').toLowerCase();
        
        // Analyze sentiment and urgency for this theme
        const urgencyWords = ['urgent', 'critical', 'asap', 'immediately', 'must'];
        const positiveWords = ['good', 'great', 'works', 'helpful', 'easy'];
        const negativeWords = ['bad', 'difficult', 'broken', 'frustrating', 'slow'];
        
        const hasUrgency = urgencyWords.some(word => themeText.includes(word));
        const hasPositive = positiveWords.some(word => themeText.includes(word));
        const hasNegative = negativeWords.some(word => themeText.includes(word));
        
        let characterization = '';
        
        if (hasUrgency) {
            characterization += 'time-sensitive concerns requiring immediate attention';
        } else if (hasNegative && !hasPositive) {
            characterization += 'significant pain points and challenges identified';
        } else if (hasPositive && !hasNegative) {
            characterization += 'positive feedback and working solutions noted';
        } else if (hasPositive && hasNegative) {
            characterization += 'mixed feedback indicating both challenges and opportunities';
        } else {
            characterization += 'neutral observations and general feedback';
        }
        
        return characterization;
    }

    synthesizeThemeContent(theme, allText) {
        const sampleNotes = theme.notes.slice(0, 3);
        const commonPatterns = this.findCommonPatterns(theme.notes);
        
        let synthesis = `**Key patterns identified:**\n`;
        
        if (commonPatterns.length > 0) {
            synthesis += commonPatterns.map(pattern => `• ${pattern}`).join('\n');
        } else {
            synthesis += `• ${theme.count} related observations covering various aspects of ${theme.name.toLowerCase()}`;
        }
        
        synthesis += `\n\n**Representative feedback:**\n`;
        synthesis += sampleNotes.map(note => `• "${note}"`).join('\n');
        
        if (theme.notes.length > 3) {
            synthesis += `\n• *...plus ${theme.notes.length - 3} additional related items*`;
        }
        
        return synthesis;
    }

    findCommonPatterns(notes) {
        const patterns = [];
        const allText = notes.join(' ').toLowerCase();
        
        // Look for common themes within the category
        if (allText.includes('user') || allText.includes('customer')) {
            patterns.push('Strong user/customer focus throughout feedback');
        }
        if (allText.includes('slow') || allText.includes('performance')) {
            patterns.push('Performance and speed concerns highlighted');
        }
        if (allText.includes('confusing') || allText.includes('unclear')) {
            patterns.push('Clarity and understanding issues identified');
        }
        if (allText.includes('missing') || allText.includes('need') || allText.includes('want')) {
            patterns.push('Gap analysis and missing functionality noted');
        }
        if (allText.includes('mobile') || allText.includes('phone')) {
            patterns.push('Mobile experience considerations mentioned');
        }
        
        return patterns;
    }

    generateStrategicRecommendations(themes, hasUrgency, hasSolutions, isUserFocused) {
        const immediate = [];
        const shortTerm = [];
        const longTerm = [];
        let approach = 'targeted intervention';
        
        if (hasUrgency) {
            immediate.push('Triage and address time-sensitive items flagged as critical');
            immediate.push('Establish rapid response team for urgent concerns');
            approach = 'emergency response protocol';
        } else {
            immediate.push('Prioritize top theme based on impact and feasibility analysis');
            immediate.push('Set up stakeholder alignment meetings for next steps');
        }
        
        if (themes.length > 0) {
            const topTheme = themes[0];
            immediate.push(`Deep-dive workshop focused on ${topTheme.name.toLowerCase()} solutions`);
            
            shortTerm.push(`Develop comprehensive strategy for ${topTheme.name.toLowerCase()}`);
            if (themes.length > 1) {
                shortTerm.push(`Begin preliminary work on ${themes[1].name.toLowerCase()}`);
            }
        }
        
        if (isUserFocused) {
            shortTerm.push('Conduct user research to validate findings and gather additional insights');
            longTerm.push('Implement user feedback loops for continuous improvement');
        }
        
        shortTerm.push('Create cross-functional working groups for each major theme');
        shortTerm.push('Establish success metrics and tracking mechanisms');
        
        longTerm.push('Develop integrated solution addressing all identified themes');
        longTerm.push('Build systematic processes to prevent similar issues');
        longTerm.push('Create knowledge sharing and lessons learned documentation');
        
        return { immediate, shortTerm, longTerm, approach };
    }

    generateSuccessMetrics(themes, isUserFocused) {
        const metrics = [];
        
        if (isUserFocused) {
            metrics.push('User satisfaction scores and feedback quality');
        }
        
        if (themes.some(theme => theme.name.includes('Technical'))) {
            metrics.push('System performance and reliability improvements');
        }
        
        if (themes.some(theme => theme.name.includes('Business'))) {
            metrics.push('Business impact and ROI measurements');
        }
        
        metrics.push('Theme resolution rate and implementation progress');
        metrics.push('Stakeholder alignment and engagement levels');
        
        return metrics.join(', ');
    }

    generateKeyInsights(stickyNotes, themes) {
        const insights = [];
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        const totalNotes = stickyNotes.length;
        
        // Analyze theme distribution and patterns
        if (themes.length > 0) {
            const topTheme = themes[0];
            const dominancePercentage = Math.round((topTheme.count / totalNotes) * 100);
            
            if (dominancePercentage > 50) {
                insights.push(`Strong consensus around ${topTheme.name.toLowerCase()} - ${dominancePercentage}% of feedback centers on this area, indicating it's a critical priority`);
            } else if (dominancePercentage > 30) {
                insights.push(`${topTheme.name} emerges as the leading concern, though feedback is distributed across multiple areas suggesting complex, interconnected challenges`);
            } else {
                insights.push(`Feedback is well-distributed across themes, with ${topTheme.name.toLowerCase()} slightly leading - suggests need for holistic approach rather than single-focus solution`);
            }
        }

        // Analyze sentiment and urgency patterns
        const urgencyWords = ['urgent', 'critical', 'asap', 'immediately', 'now', 'must', 'need', 'required', 'essential'];
        const positiveWords = ['good', 'great', 'love', 'like', 'works', 'helpful', 'useful', 'easy'];
        const negativeWords = ['bad', 'hate', 'difficult', 'hard', 'confusing', 'broken', 'slow', 'frustrating', 'annoying'];
        
        const urgencyCount = urgencyWords.filter(word => allText.includes(word)).length;
        const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
        
        if (urgencyCount > 2) {
            insights.push(`High urgency signals detected - multiple items flagged as critical or time-sensitive, suggesting immediate action needed`);
        }
        
        if (negativeCount > positiveCount * 2) {
            insights.push(`Predominantly problem-focused session - heavy emphasis on pain points and issues rather than opportunities`);
        } else if (positiveCount > negativeCount) {
            insights.push(`Balanced or solution-oriented discussion - good mix of challenges and positive feedback suggests constructive collaboration`);
        }

        // Analyze collaboration patterns
        const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', '?'];
        const solutionWords = ['solution', 'fix', 'resolve', 'improve', 'change', 'update', 'add', 'remove'];
        
        const questionCount = questionWords.filter(word => allText.includes(word)).length;
        const solutionCount = solutionWords.filter(word => allText.includes(word)).length;
        
        if (questionCount > solutionCount) {
            insights.push(`Discovery-focused session - more questions than solutions indicates early-stage problem exploration`);
        } else if (solutionCount > questionCount * 1.5) {
            insights.push(`Solution-oriented discussion - team is moving beyond problem identification toward actionable next steps`);
        }

        // Analyze scope and complexity
        if (themes.length > 5) {
            insights.push(`Broad scope identified - ${themes.length} distinct categories suggest complex, multi-faceted challenge requiring coordinated approach`);
        } else if (themes.length <= 2) {
            insights.push(`Focused discussion - limited theme diversity indicates clear, well-defined problem space with concentrated effort needed`);
        }

        return insights.slice(0, 4);
    }

    generateDetailedSummary(stickyNotes, themes, boardInfo) {
        const totalNotes = stickyNotes.length;
        const topThemes = themes.slice(0, 3);
        const allText = stickyNotes.map(note => note.text.toLowerCase()).join(' ');
        
        // Analyze patterns and sentiment
        const urgencyWords = ['urgent', 'critical', 'asap', 'immediately', 'now', 'must', 'need', 'required'];
        const solutionWords = ['solution', 'fix', 'resolve', 'improve', 'change', 'update', 'add'];
        const userWords = ['user', 'customer', 'client', 'people', 'person'];
        
        const hasUrgency = urgencyWords.some(word => allText.includes(word));
        const hasSolutions = solutionWords.some(word => allText.includes(word));
        const isUserFocused = userWords.some(word => allText.includes(word));
        
        // Generate insights based on theme analysis
        const themeInsights = this.generateThemeInsights(topThemes, totalNotes);
        const collaborationInsights = this.generateCollaborationInsights(stickyNotes, themes);
        const strategicRecommendations = this.generateStrategicRecommendations(themes, hasUrgency, hasSolutions, isUserFocused);
        
        return `
## Executive Summary

• This collaborative session captured ${totalNotes} distinct insights from "${boardInfo.name}"
• Analysis reveals ${themes.length} key focus areas with varying levels of consensus and urgency
• ${themeInsights.dominancePattern}
• ${collaborationInsights.sessionType}

## Strategic Insights

### Theme Analysis
${topThemes.map(theme => {
    const percentage = Math.round((theme.count / totalNotes) * 100);
    const intensity = percentage > 40 ? 'high' : percentage > 20 ? 'moderate' : 'emerging';
    return `• **${theme.name}** (${percentage}% of discussion) - ${intensity} priority area with ${this.getThemeCharacterization(theme, allText)}`;
}).join('\n')}

### Collaboration Patterns
• **Session focus**: ${collaborationInsights.focusType}
• **Discussion maturity**: ${collaborationInsights.maturityLevel}
• **Consensus level**: ${collaborationInsights.consensusLevel}
• **Urgency indicators**: ${hasUrgency ? 'Multiple time-sensitive items identified' : 'Standard timeline expectations'}

## Key Findings by Category

${topThemes.map(theme => `
### ${theme.name}
${this.synthesizeThemeContent(theme, allText)}
`).join('')}

## Strategic Recommendations

### Immediate Actions (Next 2 weeks)
${strategicRecommendations.immediate.map(rec => `• ${rec}`).join('\n')}

### Short-term Planning (1-3 months)
${strategicRecommendations.shortTerm.map(rec => `• ${rec}`).join('\n')}

### Long-term Strategy (3+ months)
${strategicRecommendations.longTerm.map(rec => `• ${rec}`).join('\n')}

## Implementation Roadmap

• **Phase 1**: Address ${topThemes[0]?.name || 'primary concerns'} through ${strategicRecommendations.approach}
• **Phase 2**: Develop comprehensive solutions for ${topThemes[1]?.name || 'secondary themes'} 
• **Phase 3**: Integrate learnings across all ${themes.length} identified areas
• **Success metrics**: ${this.generateSuccessMetrics(themes, isUserFocused)}

## Session Metadata

• **Analysis completed**: ${new Date().toLocaleDateString()}
• **Content processed**: ${totalNotes} sticky notes across ${themes.length} categories
• **Primary focus**: ${topThemes[0]?.name || 'Multiple areas'} (${Math.round(((topThemes[0]?.count || 0) / totalNotes) * 100)}% of content)
• **Collaboration style**: ${collaborationInsights.style}
        `.trim();
    }

    displayResults(results) {
        // Board info
        this.boardInfo.innerHTML = `
            <div class="metric">
                <span class="metric-label">Board Name:</span>
                <span class="metric-value">${results.boardName}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Total Sticky Notes:</span>
                <span class="metric-value">${results.totalStickyNotes}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Spatial Groups:</span>
                <span class="metric-value">${results.spatialAnalysis.totalGroups}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Engagement Level:</span>
                <span class="metric-value">${results.reactionAnalysis.engagementLevel}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Last Modified:</span>
                <span class="metric-value">${results.lastModified}</span>
            </div>
        `;

        // Board overview
        this.boardOverview.innerHTML = `
            <p><strong>UX Research Analysis:</strong> This FigJam board contains <strong>${results.totalStickyNotes} sticky notes</strong> organized across <strong>${results.spatialAnalysis.totalGroups} spatial clusters</strong>.</p>
            <p><strong>Collaboration Pattern:</strong> ${results.spatialAnalysis.clusteredNotes} clustered discussions and ${results.spatialAnalysis.isolatedNotes} individual contributions, with ${results.reactionAnalysis.engagementLevel.toLowerCase()}.</p>
            <p><strong>Research Quality:</strong> Content has been analyzed using UX research methodology to identify ${results.themes.length} key insight categories.</p>
        `;

        // Key findings
        this.keyFindings.innerHTML = `
            <ul>
                ${results.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        `;

        // Themes and categories
        this.themesCategories.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${results.themes.map(theme => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: ${theme.color}20; border-radius: 6px; border-left: 3px solid ${theme.color};">
                        <div>
                            <span style="font-weight: 500;">${theme.name}</span>
                            <small style="display: block; color: #64748b; margin-top: 2px;">Confidence: ${Math.round(theme.confidence)}%</small>
                        </div>
                        <span class="tag" style="background: ${theme.color}40; color: ${theme.color};">${theme.count} insights</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Sticky notes analysis with grouping info and inline images
        this.stickyAnalysis.innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                    <strong>Spatial Analysis:</strong> ${results.spatialAnalysis.clusteredNotes} clustered notes, ${results.spatialAnalysis.isolatedNotes} standalone notes
                </div>
                ${results.stickyNotes.map((note, index) => `
                    <div style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; justify-content: between; align-items: start; gap: 8px;">
                            <span style="font-size: 12px; color: #64748b; margin-right: 8px; flex-shrink: 0;">#${index + 1}</span>
                            <div style="flex: 1;">
                                <div style="margin-bottom: 6px;">
                                    <span style="font-weight: 500;">"${note.text}"</span>
                                </div>
                                <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                                    ${note.groupSize > 1 ? `Grouped with ${note.groupSize - 1} others` : 'Standalone note'}
                                    ${note.reactions && note.reactions.length > 0 ? ` • ${note.reactions.length} reactions` : ''}
                                    ${note.color !== '#FFF475' ? ` • Custom color` : ''}
                                    ${note.attachedImages && note.attachedImages.length > 0 ? ` • ${note.attachedImages.length} attached image${note.attachedImages.length > 1 ? 's' : ''}` : ''}
                                </div>
                                ${note.attachedImages && note.attachedImages.length > 0 ? `
                                    <div style="margin-top: 8px;">
                                        ${note.attachedImages.map(img => `
                                            <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #3742fa;">
                                                <div style="font-size: 11px; font-weight: 500; color: #3742fa; margin-bottom: 4px;">
                                                    📎 ${img.name} (${img.relationship})
                                                </div>
                                                ${img.description && img.description !== img.name ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">${img.description}</div>` : ''}
                                                ${img.imageUrl ? `
                                                    <div style="position: relative;">
                                                        <img src="${img.imageUrl}" alt="${img.description || img.name}" 
                                                             style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #e2e8f0; cursor: pointer; display: block;" 
                                                             onclick="window.open('${img.imageUrl}', '_blank')"
                                                             onload="this.nextElementSibling.style.display='none';"
                                                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                                        <div style="display: flex; width: 200px; height: 150px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #d1d5db; border-radius: 4px; align-items: center; justify-content: center; color: #6b7280; font-size: 11px; flex-direction: column;">
                                                            <div style="font-size: 24px; margin-bottom: 4px;">🖼️</div>
                                                            <div style="font-weight: 500; text-align: center;">${img.name}</div>
                                                            <div style="font-size: 9px; color: #9ca3af; margin-top: 2px; text-align: center;">Loading image...</div>
                                                        </div>
                                                    </div>
                                                ` : `
                                                    <div style="width: 200px; height: 150px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 11px; flex-direction: column; cursor: pointer;" onclick="alert('Image detected: ${img.name}\\n\\nThis image is spatially related to the feedback but cannot be displayed directly due to Figma API limitations. The image exists in the original FigJam board.')">
                                                        <div style="font-size: 24px; margin-bottom: 4px;">🖼️</div>
                                                        <div style="font-weight: 500;">${img.name}</div>
                                                        <div style="font-size: 9px; color: #9ca3af; margin-top: 2px; text-align: center;">Image detected<br>View in FigJam</div>
                                                    </div>
                                                `}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Detailed summary
        this.detailedSummary.innerHTML = this.formatMarkdown(results.summary);

        this.showResults();
    }

    formatMarkdown(text) {
        return text
            .replace(/^## (.*$)/gm, '<h3 class="summary-section-title">$1</h3>')
            .replace(/^### (.*$)/gm, '<h4 class="summary-subsection-title">$1</h4>')
            .replace(/^#### (.*$)/gm, '<h5 class="summary-subsubsection-title">$1</h5>')
            .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
            .replace(/^• (.*$)/gm, '<li class="summary-bullet">$1</li>')
            .replace(/^- (.*$)/gm, '<li class="summary-bullet">$1</li>')
            .replace(/\n\n/g, '</div><div class="summary-section">')
            .replace(/^(.*)$/gm, '<p>$1</p>')
            .replace(/<p><h/g, '<h')
            .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
            .replace(/<p><li/g, '<ul class="summary-list"><li')
            .replace(/<\/li><\/p>/g, '</li></ul>')
            .replace(/(<li[^>]*>.*?<\/li>)(?=<li)/g, '$1')
            .replace(/^<p><\/div>/, '<div class="summary-section">')
            .replace(/<div class="summary-section"><p><\/p><\/div>$/, '')
            // Handle HTML content in list items (for images)
            .replace(/<p>(<div style="margin: 8px 0.*?<\/div>)<\/p>/g, '$1')
            .replace(/<li class="summary-bullet">([^<]*?)(<div style="margin: 8px 0.*?<\/div>)/g, '<li class="summary-bullet">$1</li>$2<li class="summary-bullet" style="list-style: none; margin-left: -20px;">')
            .replace(/(<\/div>)\n<li class="summary-bullet">/g, '$1</li><li class="summary-bullet">');
    }

    setLoading(loading) {
        const btnText = this.analyzeBtn.querySelector('.btn-text');
        const spinner = this.analyzeBtn.querySelector('.btn-spinner');
        
        if (loading) {
            btnText.textContent = 'Analyzing...';
            spinner.style.display = 'flex';
            this.analyzeBtn.disabled = true;
        } else {
            btnText.textContent = 'Analyze board';
            spinner.style.display = 'none';
            this.validateInputs(); // Re-validate to set correct disabled state
        }
    }

    showResults() {
        this.resultsSection.style.display = 'block';
        this.errorSection.style.display = 'none';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    async exportToPDF() {
        if (!this.analysisResults) return;
        
        // In a real implementation, this would generate a PDF
        alert('PDF export functionality would be implemented here using a library like jsPDF or Puppeteer');
    }

    exportToMarkdown() {
        if (!this.analysisResults) return;
        
        const markdown = `# FigJam Board Analysis Report

## Board Information
- **Name**: ${this.analysisResults.boardName}
- **Total Sticky Notes**: ${this.analysisResults.totalStickyNotes}
- **Last Modified**: ${this.analysisResults.lastModified}
- **Categories**: ${this.analysisResults.themes.length}

## Key Findings
${this.analysisResults.keyInsights.map(insight => `- ${insight}`).join('\n')}

## Themes & Categories
${this.analysisResults.themes.map(theme => `- **${theme.name}**: ${theme.count} notes`).join('\n')}

## All Sticky Notes
${this.analysisResults.stickyNotes.map((note, i) => `${i + 1}. ${note}`).join('\n')}

## Detailed Analysis
${this.analysisResults.summary}

---
*Generated by FigJam Board Analyzer on ${new Date().toLocaleDateString()}*
`;

        this.downloadFile(markdown, `figjam-analysis-${this.analysisResults.boardId}.md`, 'text/markdown');
    }

    async copyToClipboard() {
        if (!this.analysisResults) return;
        
        const text = `FigJam Board Analysis: ${this.analysisResults.boardName}

Key Findings:
${this.analysisResults.keyInsights.map(insight => `• ${insight}`).join('\n')}

Themes (${this.analysisResults.themes.length} categories):
${this.analysisResults.themes.map(theme => `• ${theme.name}: ${theme.count} notes`).join('\n')}

${this.analysisResults.summary}`;

        try {
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            const originalText = this.copySummaryBtn.textContent;
            this.copySummaryBtn.textContent = 'Copied!';
            this.copySummaryBtn.style.background = '#10b981';
            
            setTimeout(() => {
                this.copySummaryBtn.textContent = originalText;
                this.copySummaryBtn.style.background = '';
            }, 2000);
        } catch (err) {
            alert('Failed to copy to clipboard. Please try again.');
        }
    }

    downloadFile(content, filename, mimeType) {
        let blob;
        
        if (content instanceof Blob) {
            blob = content;
        } else {
            blob = new Blob([content], { type: mimeType });
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    getColumnContextForCluster(notes, columns) {
        if (!columns || columns.length === 0) return null;
        
        const columnIndices = notes.map(n => {
            const avgX = n.position.x;
            let closestIndex = 0;
            let closestDistance = Math.abs(avgX - columns[0].x);
            
            columns.forEach((col, index) => {
                const distance = Math.abs(avgX - col.x);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });
            
            return closestIndex;
        });
        
        const uniqueColumns = [...new Set(columnIndices)];
        
        if (uniqueColumns.length === 1 && columns[uniqueColumns[0]]) {
            const col = columns[uniqueColumns[0]];
            return `All feedback appears in the "${col.label}" column, indicating this is specifically a ${col.label.toLowerCase()} issue`;
        } else if (uniqueColumns.length > 1) {
            return `Feedback spans ${uniqueColumns.length} columns (${uniqueColumns.map(i => columns[i]?.label).filter(Boolean).join(', ')}), showing this affects multiple stages`;
        }
        
        return null;
    }

    generateSpecificImpact(cluster, notes, votedNotes) {
        let impact = '';
        
        const notesWithImages = notes.filter(n => n.attachedImages && n.attachedImages.length > 0);
        
        if (votedNotes.length > 0) {
            impact += `With ${votedNotes.length} items receiving participant votes, this represents validated consensus—not just individual opinions. `;
        }
        
        if (notesWithImages.length > 0) {
            impact += `${notesWithImages.length} items include visual evidence, providing concrete examples that can be directly addressed. `;
        }
        
        if (cluster.title.includes('Pain Points')) {
            impact += `These pain points are actively blocking users and impacting satisfaction. Addressing them will immediately improve user experience and reduce friction.`;
        } else if (cluster.title.includes('Usability')) {
            impact += `These usability issues create cumulative friction that slows users down. Fixing them will improve efficiency and reduce cognitive load.`;
        } else if (cluster.title.includes('Feature')) {
            impact += `These feature requests represent opportunities to expand product value. However, validate against broader needs before committing resources.`;
        } else {
            impact += `Addressing this theme will have measurable impact on user satisfaction and product success.`;
        }
        
        return impact;
    }

    generateSpecificEvidence(cluster, notes, votedNotes, spatialAnalysis) {
        const evidence = [];
        
        evidence.push(`${cluster.noteCount} sticky notes directly relate to this theme`);
        
        if (votedNotes.length > 0) {
            const totalVotes = votedNotes.reduce((sum, n) => {
                return sum + (n.reactions || []).filter(r => 
                    r.content === '+1' || r.content === '👍' || r.content === '⭐'
                ).length;
            }, 0);
            evidence.push(`${votedNotes.length} items received ${totalVotes} votes from participants`);
        }
        
        const notesWithImages = notes.filter(n => n.attachedImages && n.attachedImages.length > 0);
        if (notesWithImages.length > 0) {
            evidence.push(`${notesWithImages.length} items include screenshots or diagrams providing visual proof`);
        }
        
        const groupedNotes = notes.filter(n => n.groupSize > 1);
        if (groupedNotes.length > notes.length * 0.5) {
            evidence.push(`${groupedNotes.length} items were spatially grouped, showing active discussion and consensus-building`);
        }
        
        return evidence.join('. ') + '.';
    }

    analyzeColumnDistribution(stickyNotes, columns) {
        const columnCounts = columns.map(col => ({
            label: col.label,
            count: col.notes.length,
            percentage: Math.round((col.notes.length / stickyNotes.length) * 100)
        })).sort((a, b) => b.count - a.count);
        
        const topColumn = columnCounts[0];
        
        return {
            title: `"${topColumn.label}" Stage Shows Highest Concentration of Issues`,
            description: `${topColumn.percentage}% of all feedback (${topColumn.count} items) appears in the "${topColumn.label}" column, indicating this specific stage or category has the most significant problems.`,
            impact: `This concentration suggests a systemic issue at the "${topColumn.label}" stage rather than scattered problems. Focusing improvement efforts on this specific stage will have outsized impact.`,
            evidence: `${topColumn.count} sticky notes in "${topColumn.label}" vs ${columnCounts.slice(1, 3).map(c => `${c.count} in "${c.label}"`).join(', ')}.`
        };
    }

    generateSecondaryInsightDescription(cluster, notes, totalNotes) {
        const percentage = Math.round((cluster.noteCount / totalNotes) * 100);
        const votedNotes = notes.filter(n => {
            const voteCount = (n.reactions || []).filter(r => 
                r.content === '+1' || r.content === '👍' || r.content === '⭐'
            ).length;
            return voteCount > 0;
        });
        
        let desc = `While not the primary focus, ${cluster.title.toLowerCase()} represents ${percentage}% of feedback with ${cluster.noteCount} distinct observations. `;
        
        if (votedNotes.length > 0) {
            desc += `${votedNotes.length} of these items received participant votes, indicating they shouldn't be dismissed as minor concerns. `;
        }
        
        desc += `This theme deserves attention as a secondary priority to prevent it from escalating into a larger issue.`;
        
        return desc;
    }

    generateImageEvidence(notesWithImages) {
        const examples = notesWithImages.slice(0, 3).map(note => {
            const imageNames = note.attachedImages.map(img => img.name).join(', ');
            return `"${note.text}" (with ${imageNames})`;
        });
        
        return `Examples with visual evidence: ${examples.join('; ')}. These screenshots and diagrams provide specific, verifiable examples that eliminate ambiguity about what needs to be fixed.`;
    }

    generateUrgencyEvidence(stickyNotes) {
        const urgentNotes = stickyNotes.filter(note => {
            const text = note.text.toLowerCase();
            return text.includes('urgent') || text.includes('critical') || text.includes('immediately');
        });
        
        const examples = urgentNotes.slice(0, 2).map(n => `"${n.text}"`).join('; ');
        return `${urgentNotes.length} items flagged as urgent or critical. Examples: ${examples}. The explicit urgency language indicates these are active problems requiring immediate attention.`;
    }

    generateConsistencyInsight(spatialAnalysis, stickyNotes) {
        if (spatialAnalysis.clusteredNotes > spatialAnalysis.isolatedNotes * 2) {
            return `The feedback shows strong spatial clustering with ${spatialAnalysis.clusteredNotes} notes grouped together versus only ${spatialAnalysis.isolatedNotes} isolated items. This clustering indicates participants actively discussed and built consensus around shared observations.`;
        } else {
            return `The feedback includes both clustered discussions (${spatialAnalysis.clusteredNotes} notes) and individual observations (${spatialAnalysis.isolatedNotes} notes), providing a balanced mix of consensus-driven insights and unique perspectives.`;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new FigJamAnalyzer();
    // Make it globally accessible for the clear token button
    document.querySelector('.app').figJamAnalyzer = analyzer;
});


