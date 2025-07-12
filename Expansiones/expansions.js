// Constants
const API_BASE_URL = 'https://api.tcgdex.net/v2/es';

// Global state management
const state = {
    expansions: [],
    filteredExpansions: [],
    currentPage: 1,
    cardsPerPage: 12,
    currentCards: [],
    searchTerm: '',
    sortOrder: 'name',
    isLoading: false
};

// Image handling utilities
const imageUtils = {
    buildUrl: (baseUrl, quality = 'high', extension = 'webp') => {
        if (!baseUrl) return null;
        baseUrl = baseUrl.replace(/\/$/, '');
        return baseUrl.includes('symbol') || baseUrl.includes('logo') 
            ? `${baseUrl}.${extension}`
            : `${baseUrl}/${quality}.${extension}`;
    },
    
    createPicture: (imageUrl, name, options = {}) => {
        const {
            previewUrl = null,
            fallbackUrl = null,
            loadingType = 'lazy',
            cssClass = ''
        } = options;

        const classes = ['img-fluid', cssClass].filter(Boolean).join(' ');

        return `
            <picture class="${cssClass}">
                ${previewUrl ? `<source srcset="${previewUrl}" type="image/webp" media="(max-width: 600px)">` : ''}
                <source srcset="${imageUrl}" type="image/webp">
                <img src="${fallbackUrl || imageUrl}" 
                    alt="${name}"
                    loading="${loadingType}"
                    class="${classes}"
                    onerror="this.src='https://placehold.co/245x337/png?text=Imagen+no+disponible'">
            </picture>
        `;
    },

    getFallbackImage: (imageUrl, quality = 'high') => {
        return imageUrl ? imageUtils.buildUrl(imageUrl, quality, 'png') : 'https://placehold.co/245x337/png?text=Imagen+no+disponible';
    }
};

// UI utilities
const uiUtils = {
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    showLoading: (element) => {
        element.innerHTML = `
            <div class="loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>
        `;
    },

    showError: (element, message) => {
        element.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Error</h4>
                <p>${message}</p>
                <hr>
                <p class="mb-0">
                    <button class="btn btn-outline-danger btn-sm" onclick="retryLoading(this)">
                        Intentar de nuevo
                    </button>
                </p>
            </div>
        `;
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Helper function to create expansion card HTML
function createExpansionCardHtml(expansion) {
    const hasLogo = !!expansion.logo;
    const hasSymbol = !!expansion.symbol;
    
    let visualElement;
    
    if (hasLogo) {
        visualElement = `
            <div class="image-container">
                <picture class="logo-image">
                    <source srcset="${expansion.logo}.webp" type="image/webp">
                    <img src="${expansion.logo}.png" 
                         alt="Logo de ${expansion.name}"
                         loading="lazy"
                         class="img-fluid hover-brightness shadow-sm"
                         onerror="this.src='https://placehold.co/300x100/png?text=${encodeURIComponent(expansion.name)}'">
                </picture>
            </div>`;
    } else if (hasSymbol) {
        visualElement = `
            <div class="symbol-container">
                <div class="symbol-decoration top"></div>
                <div class="symbol-wrapper">
                    <picture class="symbol-image">
                        <source srcset="${expansion.symbol}.webp" type="image/webp">
                        <img src="${expansion.symbol}.png" 
                             alt="Símbolo de ${expansion.name}"
                             loading="lazy"
                             class="img-contain hover-rotate shadow-sm"
                             onerror="this.src='https://placehold.co/80x80/png?text=${encodeURIComponent(expansion.name[0])}'">
                    </picture>
                </div>
                <div class="symbol-decoration bottom"></div>
            </div>`;
    } else {
        visualElement = `
            <div class="generated-banner">
                <div class="banner-pokeball top-left"></div>
                <div class="banner-pokeball bottom-right"></div>
                <div class="banner-content">
                    <h3 class="banner-title">${expansion.name}</h3>
                    <div class="banner-decoration"></div>
                </div>
            </div>`;
    }

    return `
        <div class="expansion-card hover-lift" data-expansion-id="${expansion.id}">
            ${visualElement}
            <div class="expansion-info">
                <h3 class="expansion-name">${expansion.name}</h3>
                <div class="expansion-details">
                    ${expansion.releaseDate ? `
                        <div>Lanzamiento: ${uiUtils.formatDate(expansion.releaseDate)}</div>
                    ` : ''}
                    ${expansion.cardCount ? `
                        <div>Cartas: ${expansion.cardCount.official} oficiales</div>
                    ` : ''}
                    ${expansion.serie ? `
                        <div>Serie: ${expansion.serie.name}</div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Function to update expansion modal content
async function updateExpansionModalContent(expansionId) {
    try {
        console.log('Fetching expansion details for modal:', expansionId);
        const response = await fetch(`${API_BASE_URL}/sets/${expansionId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const expansion = await response.json();
        console.log('Expansion details received:', expansion);

        if (!expansion) {
            throw new Error('No se pudo cargar la información de la expansión');
        }

        // Update expansion name
        const nameElement = document.getElementById('modalExpansionName');
        if (nameElement) nameElement.textContent = expansion.name;

        // Update expansion series
        const seriesElement = document.getElementById('modalExpansionSeries');
        if (seriesElement) {
            seriesElement.textContent = expansion.serie ? expansion.serie.name : 'Serie no especificada';
        }

        // Update release date
        const dateElement = document.getElementById('modalExpansionReleaseDate');
        if (dateElement) {
            dateElement.textContent = expansion.releaseDate ? uiUtils.formatDate(expansion.releaseDate) : 'Fecha no disponible';
        }

        // Update card counts
        const cardCountElement = document.getElementById('modalExpansionCardCount');
        const totalCountElement = document.getElementById('modalExpansionTotalCount');
        if (cardCountElement) cardCountElement.textContent = expansion.cardCount?.official || '0';
        if (totalCountElement) totalCountElement.textContent = expansion.cardCount?.total || '0';

        // Update description
        const descElement = document.getElementById('modalExpansionDescription');
        if (descElement) {
            descElement.textContent = getExpansionDescription(expansion);
        }

        // Update expansion images
        const logoUrlWebp = expansion.logo ? `${expansion.logo}.webp` : null;
        const logoUrlPng = expansion.logo ? `${expansion.logo}.png` : null;
        const symbolUrlWebp = expansion.symbol ? `${expansion.symbol}.webp` : null;
        const symbolUrlPng = expansion.symbol ? `${expansion.symbol}.png` : null;

        const imageContainer = document.getElementById('modalExpansionImage');
        if (imageContainer) {
            let visualContent = '';

            if (logoUrlWebp) {
                visualContent = `
                    <div class="set-images">
                        <picture class="logo-image">
                            <source srcset="${logoUrlWebp}" type="image/webp">
                            <img src="${logoUrlPng}" 
                                alt="Logo de ${expansion.name}"
                                loading="lazy"
                                onerror="this.src='https://placehold.co/300x100/png?text=Logo+no+disponible'">
                        </picture>
                        ${symbolUrlWebp ? `
                            <picture class="symbol-image">
                                <source srcset="${symbolUrlWebp}" type="image/webp">
                                <img src="${symbolUrlPng}" 
                                    alt="Símbolo de ${expansion.name}"
                                    loading="lazy"
                                    onerror="this.src='https://placehold.co/50x50/png?text=Símbolo+no+disponible'">
                            </picture>
                        ` : ''}
                    </div>`;
            } else if (symbolUrlWebp) {
                visualContent = `
                    <div class="set-images symbol-only">
                        <div class="symbol-container">
                            <div class="symbol-decoration top"></div>
                            <div class="symbol-wrapper">
                                <picture class="symbol-image large">
                                    <source srcset="${symbolUrlWebp}" type="image/webp">
                                    <img src="${symbolUrlPng}" 
                                        alt="Símbolo de ${expansion.name}"
                                        loading="lazy"
                                        onerror="this.src='https://placehold.co/150x150/png?text=${encodeURIComponent(expansion.name[0])}'">
                                </picture>
                            </div>
                            <div class="symbol-decoration bottom"></div>
                        </div>
                    </div>`;
            } else {
                visualContent = `
                    <div class="generated-banner">
                        <div class="banner-pokeball top-left"></div>
                        <div class="banner-pokeball bottom-right"></div>
                        <div class="banner-content">
                            <h3 class="banner-title">${expansion.name}</h3>
                            <div class="banner-decoration"></div>
                        </div>
                    </div>`;
            }

            imageContainer.innerHTML = visualContent;
        }

        // Reset pagination and filtering
        state.currentPage = 1;
        state.searchTerm = '';
        state.sortOrder = 'number';
        
        // Load and display cards
        await loadExpansionCards(expansion.id);

        // Setup card filters
        setupCardFilters(expansion.id);

    } catch (error) {
        console.error('Error loading expansion details:', error);
        alert(`Error al cargar los detalles de la expansión: ${error.message}`);
    }
}

// Function to load expansion cards
async function loadExpansionCards(expansionId) {
    const container = document.getElementById('expansionCardsList');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="loading-cards">
                <div class="spinner"></div>
                <p>Cargando cartas...</p>
            </div>
        `;

        const response = await fetch(`${API_BASE_URL}/sets/${expansionId}`);
        if (!response.ok) {
            throw new Error(`Error al cargar las cartas: ${response.status}`);
        }
        const expansionData = await response.json();

        if (!expansionData.cards || expansionData.cards.length === 0) {
            container.innerHTML = `
                <div class="no-cards-message">
                    <i class="bi bi-info-circle"></i>
                    <p>No hay cartas disponibles para esta expansión</p>
                </div>
            `;
            return;
        }

        state.currentCards = expansionData.cards;
        const filteredCards = filterAndSortCards();
        displayCards(filteredCards);
        updateLoadMoreButton(filteredCards);

    } catch (error) {
        console.error('Error loading expansion cards:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Error al cargar las cartas: ${error.message}</p>
                <button class="retry-button" onclick="loadExpansionCards('${expansionId}')">
                    <i class="bi bi-arrow-clockwise"></i> Intentar de nuevo
                </button>
            </div>
        `;
    }
}

// Function to filter and sort cards
function filterAndSortCards() {
    let filtered = [...state.currentCards];

    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(card => 
            card.name.toLowerCase().includes(term) ||
            card.id.toLowerCase().includes(term)
        );
    }

    filtered.sort((a, b) => {
        switch (state.sortOrder) {
            case 'number':
                return (a.localId || 0) - (b.localId || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rarity':
                return (a.rarity || '').localeCompare(b.rarity || '');
            default:
                return 0;
        }
    });

    return filtered;
}

// Function to display cards
function displayCards(cards) {
    const container = document.getElementById('expansionCardsList');
    if (!container) return;

    const start = 0;
    const end = state.currentPage * state.cardsPerPage;
    const cardsToShow = cards.slice(start, end);

    container.innerHTML = cardsToShow.map(card => {
        const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
        const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
        const imageUrlFallback = imageUtils.getFallbackImage(card.image);

        return `
            <div class="card" data-card-id="${card.id}">
                ${imageUtils.createPicture(imageUrlHigh, card.name, {
                    previewUrl: imageUrlPreview,
                    fallbackUrl: imageUrlFallback
                })}
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    <div class="card-number">${card.localId || '?'}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click event listeners
    container.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', async () => {
            const cardId = card.dataset.cardId;
            // Here you could open a card detail modal if needed
            console.log('Card clicked:', cardId);
        });
    });
}

// Function to update load more button
function updateLoadMoreButton(filteredCards) {
    const button = document.getElementById('loadMoreCards');
    if (!button) return;

    const hasMoreCards = state.currentPage * state.cardsPerPage < filteredCards.length;
    button.style.display = hasMoreCards ? 'inline-block' : 'none';
}

// Function to setup card filters
function setupCardFilters(expansionId) {
    const searchInput = document.getElementById('cardSearchInput');
    if (searchInput) {
        searchInput.value = state.searchTerm;
        searchInput.addEventListener('input', uiUtils.debounce(function() {
            state.searchTerm = this.value;
            state.currentPage = 1;
            const filteredCards = filterAndSortCards();
            displayCards(filteredCards);
            updateLoadMoreButton(filteredCards);
        }, 300));
    }

    const sortSelect = document.getElementById('cardSortSelect');
    if (sortSelect) {
        sortSelect.value = state.sortOrder;
        sortSelect.addEventListener('change', function() {
            state.sortOrder = this.value;
            state.currentPage = 1;
            const filteredCards = filterAndSortCards();
            displayCards(filteredCards);
            updateLoadMoreButton(filteredCards);
        });
    }

    const loadMoreBtn = document.getElementById('loadMoreCards');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            state.currentPage++;
            const filteredCards = filterAndSortCards();
            displayCards(filteredCards);
            updateLoadMoreButton(filteredCards);
        });
    }
}

// Function to get expansion description
function getExpansionDescription(expansion) {
    let description = '';
    
    if (expansion.name) {
        description += `La expansión ${expansion.name}`;
    }
    
    if (expansion.serie?.name) {
        description += ` forma parte de la serie ${expansion.serie.name}`;
    }
    
    if (expansion.releaseDate) {
        description += ` y fue lanzada el ${uiUtils.formatDate(expansion.releaseDate)}`;
    }
    
    if (expansion.cardCount?.official) {
        description += `. Contiene ${expansion.cardCount.official} cartas oficiales`;
        
        if (expansion.cardCount.total && expansion.cardCount.total > expansion.cardCount.official) {
            description += ` y un total de ${expansion.cardCount.total} cartas incluyendo variantes`;
        }
    }
    
    description += '.';
    
    return description || 'No hay información disponible para esta expansión.';
}

// Function to filter and sort expansions
function filterAndSortExpansions() {
    let filtered = [...state.expansions];

    // Solo buscar por nombre de expansión
    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(expansion => 
            expansion.name && expansion.name.toLowerCase().includes(term)
        );
    }

    // Ordenar
    filtered.sort((a, b) => {
        switch (state.sortOrder) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'date':
                const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
                const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
                return dateB - dateA;
            case 'cards':
                const cardsA = a.cardCount?.official || 0;
                const cardsB = b.cardCount?.official || 0;
                return cardsB - cardsA;
            default:
                return 0;
        }
    });

    state.filteredExpansions = filtered;
    return filtered;
}

// Function to display expansions
function displayExpansions(expansions) {
    const container = document.getElementById('expansionsGrid');
    if (!container) return;

    if (expansions.length === 0) {
        container.innerHTML = `
            <div class="no-expansions-message">
                <i class="bi bi-info-circle"></i>
                <p>No se encontraron expansiones que coincidan con los filtros aplicados.</p>
            </div>
        `;
        return;
    }

    const expansionsHtml = expansions.map(expansion => createExpansionCardHtml(expansion)).join('');
    container.innerHTML = expansionsHtml;

    // Add click event listeners
    container.querySelectorAll('.expansion-card').forEach(card => {
        card.addEventListener('click', async () => {
            try {
                const expansionId = card.dataset.expansionId;
                console.log('Clicked expansion ID:', expansionId);
                
                const originalContent = card.innerHTML;
                card.innerHTML = `
                    <div class="loading-overlay">
                        <div class="spinner-border text-light" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                    </div>
                    ${originalContent}
                `;
                
                const expansionModal = new bootstrap.Modal(document.getElementById('expansionModal'));
                expansionModal.show();
                
                await updateExpansionModalContent(expansionId);
                
                card.innerHTML = originalContent;
                
            } catch (error) {
                console.error('Error loading expansion details:', error);
                alert(`Error al cargar los detalles de la expansión: ${error.message}`);
            }
        });
    });
}

// Function to update statistics
function updateStatistics() {
    const totalExpansions = document.getElementById('totalExpansions');
    const totalCards = document.getElementById('totalCards');

    if (totalExpansions) {
        totalExpansions.textContent = state.expansions.length;
    }

    if (totalCards) {
        const cardsCount = state.expansions.reduce((total, expansion) => {
            return total + (expansion.cardCount?.official || 0);
        }, 0);
        totalCards.textContent = cardsCount.toLocaleString();
    }
}

// Main function to load expansions
async function loadExpansions() {
    const container = document.getElementById('expansionsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const refreshBtn = document.getElementById('refreshBtn');

    try {
        state.isLoading = true;
        
        // Show loading state
        if (container) container.style.display = 'none';
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';
        
        // Disable refresh button
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cargando...
            `;
        }

        // Fetch all expansions
        const response = await fetch(`${API_BASE_URL}/sets`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const expansions = await response.json();
        
        state.expansions = expansions;
        
        // Update statistics
        updateStatistics();
        
        // Filter and display expansions
        const filteredExpansions = filterAndSortExpansions();
        displayExpansions(filteredExpansions);

    } catch (error) {
        console.error('Error loading expansions:', error);
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.querySelector('p').textContent = `Error al cargar las expansiones: ${error.message}`;
        }
    } finally {
        state.isLoading = false;
        
        // Hide loading state
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (container) container.style.display = 'grid';
        
        // Re-enable refresh button
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `<i class="bi bi-shuffle me-2"></i>Actualizar`;
        }
    }
}

// Retry loading function
async function retryLoading(button) {
    const container = button.closest('.alert').parentElement;
    if (container.id === 'expansionsGrid') {
        await loadExpansions();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', uiUtils.debounce(function() {
            state.searchTerm = this.value;
            const filteredExpansions = filterAndSortExpansions();
            displayExpansions(filteredExpansions);
        }, 300));
    }

    // Sort filter
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function() {
            state.sortOrder = this.value;
            const filteredExpansions = filterAndSortExpansions();
            displayExpansions(filteredExpansions);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadExpansions);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        setupEventListeners();
        const params = new URLSearchParams(window.location.search);
        const expansionId = params.get('id');
        await loadExpansions();
        if (expansionId) {
            setTimeout(() => {
                const card = document.querySelector(`.expansion-card[data-expansion-id='${expansionId}']`);
                if (card) card.click();
            }, 500);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        const container = document.getElementById('expansionsGrid');
        if (container) {
            uiUtils.showError(container, `Error al inicializar la aplicación: ${error.message}`);
        }
    }
}); 