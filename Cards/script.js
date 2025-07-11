// State management
const API_BASE_URL = 'https://api.tcgdex.net/v2/es';

const state = {
    cards: [],
    filteredCards: [],
    currentPage: 1,
    loading: false,
    error: null,
    searchTerm: '',
    filters: {
        nameSort: '',
        rarity: '',
        type: ''
    }
};

// Image Utils
const imageUtils = {
    buildUrl: (baseUrl, quality = 'high', format = 'webp') => {
        if (!baseUrl) return null;
        baseUrl = baseUrl.replace(/\/$/, '');
        return baseUrl.includes('symbol') || baseUrl.includes('logo') 
            ? `${baseUrl}.${format}`
            : `${baseUrl}/${quality}.${format}`;
    },
    getFallbackImage: (imageUrl, quality = 'high') => {
        return imageUrl ? imageUtils.buildUrl(imageUrl, quality, 'png') : 'https://placehold.co/245x337/png?text=Imagen+no+disponible';
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
    }
};

// API Functions
async function fetchCards(page = 1, limit = 20, shouldAppend = false) {
    try {
        state.loading = true;
        updateUI(shouldAppend);
        
        // Only fetch if we don't have cards yet
        if (state.cards.length === 0) {
            const response = await fetch(`${API_BASE_URL}/cards`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            state.cards = await response.json();
        }

        // Apply filters and get the current page of cards
        applyFiltersAndSort();
        
        state.loading = false;
        updateUI(shouldAppend);
    } catch (error) {
        console.error('Error fetching cards:', error);
        state.error = error.message;
        state.loading = false;
        updateUI(shouldAppend);
    }
}

async function fetchCardDetails(cardId) {
    try {
        // Implement API call to fetch card details
        const response = await fetch(`YOUR_API_ENDPOINT/cards/${cardId}`);
        const card = await response.json();
        return card;
    } catch (error) {
        console.error('Error fetching card details:', error);
        return null;
    }
}

async function fetchRelatedCards(cardId) {
    try {
        // Implement API call to fetch related cards
        const response = await fetch(`YOUR_API_ENDPOINT/cards/${cardId}/related`);
        const data = await response.json();
        return data.cards;
    } catch (error) {
        console.error('Error fetching related cards:', error);
        return [];
    }
}

// Function to sort cards based on different criteria
function sortCards(cards, sortBy) {
    return [...cards].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'number':
                const numA = parseInt(a.localId) || 0;
                const numB = parseInt(b.localId) || 0;
                return numA - numB;
            case 'rarity':
                return (a.rarity || '').localeCompare(b.rarity || '');
            case 'set':
                return (a.set?.name || '').localeCompare(b.set?.name || '');
            default:
                return 0;
        }
    });
}

// UI Functions
function displayCards(cards, shouldAppend = false) {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    const cardsHtml = cards.map(card => {
        if (!card.image) {
            return `
                <div class="featured-card hover-slide-up" data-card-id="${card.id}">
                    <div class="card-image-wrapper img-container no-image">
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="no-image-content">
                            <div class="pokeball-placeholder hover-rotate"></div>
                        </div>
                        <div class="card-info-overlay">
                            <h3>${card.name}</h3>
                            <p>${card.set?.name || 'Expansión desconocida'}</p>
                            <p class="no-image-badge">Sin imagen</p>
                        </div>
                    </div>
                </div>
            `;
        }

        const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
        const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
        const imageUrlFallback = imageUtils.getFallbackImage(card.image);

        return `
            <div class="featured-card hover-slide-up" data-card-id="${card.id}">
                <div class="card-image-wrapper img-container">
                    ${imageUtils.createPicture(imageUrlHigh, card.name, {
                        previewUrl: imageUrlPreview,
                        fallbackUrl: imageUrlFallback,
                        cssClass: 'hover-scale'
                    })}
                    <div class="card-info-overlay">
                        <h3>${card.name}</h3>
                        <p>${card.set?.name || 'Expansión desconocida'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Si shouldAppend es true, añadir al contenido existente
    // Si es false, reemplazar el contenido
    if (shouldAppend) {
        container.insertAdjacentHTML('beforeend', cardsHtml);
    } else {
        container.innerHTML = cardsHtml;
    }

    // Add click listeners solo a las nuevas cartas
    const newCards = shouldAppend 
        ? container.querySelectorAll('.featured-card:not([data-initialized])')
        : container.querySelectorAll('.featured-card');

    newCards.forEach(card => {
        card.addEventListener('click', async () => {
            const cardId = card.dataset.cardId;
            await showCardModal(cardId);
        });
        // Marcar la carta como inicializada
        card.setAttribute('data-initialized', 'true');
    });
}

// Modal Functions
async function showCardModal(cardId) {
    try {
        const cardModalElement = document.getElementById('cardDetailModal');
        const cardModal = new bootstrap.Modal(cardModalElement);
        
        // Show modal first for better UX
        cardModal.show();
        
        // Then load the content
        await updateCardModalContent(cardId);
        
        // Initialize Splide carousel after content is loaded
        const splide = new Splide('.splide', {
            type: 'slide',
            perPage: 4,
            perMove: 1,
            gap: '1rem',
            pagination: false,
            breakpoints: {
                1200: { perPage: 3 },
                992: { perPage: 2 },
                576: { perPage: 1 }
            }
        });
        
        splide.mount();
        
        // Clean up when modal is hidden
        cardModalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
            splide.destroy();
            cardModalElement.removeEventListener('hidden.bs.modal', onModalHidden);
        });
        
    } catch (error) {
        console.error('Error showing card modal:', error);
        alert('Error al mostrar los detalles de la carta');
    }
}

async function updateCardModalContent(cardId) {
    try {
        console.log('Fetching card details for modal:', cardId);
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const card = await response.json();
        console.log('Card details received:', card);

        if (!card) {
            throw new Error('No se pudo cargar la información de la carta');
        }

        // Update card image
        const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
        const imageUrlFallback = imageUtils.getFallbackImage(card.image);

        const modalCardImage = document.getElementById('modalCardImage');
        if (modalCardImage) {
            modalCardImage.innerHTML = imageUtils.createPicture(imageUrlHigh, card.name, {
                fallbackUrl: imageUrlFallback
            });
        }

        // Update card name and number
        const nameElement = document.getElementById('modalCardName');
        if (nameElement) nameElement.textContent = card.name;

        const cardNumberElement = document.getElementById('modalCardNumber');
        if (cardNumberElement && card.set) {
            cardNumberElement.textContent = `${card.localId || '?'}/${card.set.cardCount?.official || '?'}`;
        }

        // Update rarity badge
        const rarityElement = document.getElementById('modalCardRarity');
        if (rarityElement) rarityElement.textContent = card.rarity || 'Rareza desconocida';

        // Update artist
        const artistElement = document.getElementById('modalCardArtist');
        if (artistElement) artistElement.textContent = card.illustrator || 'Desconocido';

        // Update set information
        if (card.set) {
            const setInfoContainer = document.getElementById('modalSetInfo');
            if (setInfoContainer) {
                // Si tiene logo, mostrar solo el logo
                if (card.set.logo) {
                    setInfoContainer.innerHTML = `
                        <div class="set-logo-view">
                            <picture>
                                <source srcset="${card.set.logo}.webp" type="image/webp">
                                <img src="${card.set.logo}.png" 
                                    alt="Logo de ${card.set.name}"
                                    loading="eager"
                                    onerror="this.src='https://placehold.co/200x60/png?text=Logo+no+disponible'">
                            </picture>
                        </div>
                    `;
                }
                // Si tiene símbolo pero no logo, mostrar nombre y símbolo
                else if (card.set.symbol) {
                    setInfoContainer.innerHTML = `
                        <div class="set-name-symbol-view">
                            <h4 class="set-name">${card.set.name}</h4>
                            <div class="set-symbol">
                                <picture>
                                    <source srcset="${card.set.symbol}.webp" type="image/webp">
                                    <img src="${card.set.symbol}.png" 
                                        alt="Símbolo de ${card.set.name}"
                                        loading="eager"
                                        onerror="this.src='https://placehold.co/30x30/png?text=S'">
                                </picture>
                            </div>
                        </div>
                    `;
                }
                // Si no tiene ni logo ni símbolo, mostrar solo el nombre
                else {
                    setInfoContainer.innerHTML = `
                        <div class="set-name-only-view">
                            <h4 class="set-name">${card.set.name}</h4>
                        </div>
                    `;
                }
            }
        }

        // Load related cards
        await loadRelatedCards(cardId);

    } catch (error) {
        console.error('Error loading card details:', error);
        alert(`Error al cargar los detalles de la carta: ${error.message}`);
    }
}

async function loadRelatedCards(cardId) {
    try {
        const splideList = document.querySelector('.splide__list');
        if (!splideList) return;

        // Mostrar estado de carga
        splideList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Cargando cartas relacionadas...</p>
            </div>
        `;

        // Obtener la carta principal
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}`);
        if (!response.ok) {
            throw new Error(`Error al cargar la carta: ${response.status}`);
        }
        const card = await response.json();

        if (!card || !card.name) {
            throw new Error('Datos de carta inválidos');
        }

        // Buscar todas las cartas
        const allCardsResponse = await fetch(`${API_BASE_URL}/cards`);
        if (!allCardsResponse.ok) {
            throw new Error(`Error al buscar cartas relacionadas: ${allCardsResponse.status}`);
        }
        const allCards = await allCardsResponse.json();
        
        // Filtrar para obtener solo las cartas con el nombre exactamente igual
        let relatedCards = allCards.filter(c => 
            c.id !== cardId && // No incluir la carta actual
            c.image && // Asegurarse de que tiene imagen
            c.name.toLowerCase() === card.name.toLowerCase() // Nombre exactamente igual (ignorando mayúsculas/minúsculas)
        );

        // Si no hay cartas relacionadas, mostrar mensaje
        if (relatedCards.length === 0) {
            splideList.innerHTML = `
                <div class="no-related-cards">
                    <i class="bi bi-info-circle"></i>
                    <p>No se encontraron otras versiones de esta carta</p>
                </div>
            `;
            return;
        }

        // Ordenar por fecha de lanzamiento (más recientes primero)
        relatedCards = relatedCards.sort((a, b) => {
            const dateA = a.set?.releaseDate ? new Date(a.set.releaseDate) : new Date(0);
            const dateB = b.set?.releaseDate ? new Date(b.set.releaseDate) : new Date(0);
            return dateB - dateA;
        });

        // Limpiar y poblar el carrusel
        splideList.innerHTML = '';

        // Añadir slides
        relatedCards.forEach(relatedCard => {
            const slide = document.createElement('div');
            slide.className = 'splide__slide';
            
            const imageUrlHigh = imageUtils.buildUrl(relatedCard.image, 'high', 'webp');
            const imageUrlFallback = imageUtils.getFallbackImage(relatedCard.image);

            slide.innerHTML = `
                <div class="card-image-container">
                    ${imageUtils.createPicture(imageUrlHigh, relatedCard.name, {
                        fallbackUrl: imageUrlFallback,
                        cssClass: 'card-image'
                    })}
                </div>
            `;

            // Add click handler
            slide.addEventListener('click', () => {
                showCardModal(relatedCard.id);
            });

            splideList.appendChild(slide);
        });

    } catch (error) {
        console.error('Error loading related cards:', error);
        const splideList = document.querySelector('.splide__list');
        if (splideList) {
            splideList.innerHTML = `
                <div class="error-message">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Error al cargar las cartas relacionadas: ${error.message}</p>
                </div>
            `;
        }
    }
}

function displayRelatedCards(cards) {
    const container = document.querySelector('#relatedCardsCarousel .splide__list');
    if (!container) return;

    container.innerHTML = cards.map(card => `
        <div class="splide__slide">
            <div class="card-image-container">
                ${imageUtils.createPicture(
                    imageUtils.buildUrl(card.image, 'high', 'webp'),
                    card.name,
                    {
                        previewUrl: imageUtils.buildUrl(card.image, 'low', 'webp'),
                        fallbackUrl: imageUtils.getFallbackImage(card.image)
                    }
                )}
            </div>
        </div>
    `).join('');

    // Initialize or refresh Splide
    if (window.relatedCardsSlider) {
        window.relatedCardsSlider.refresh();
    } else {
        window.relatedCardsSlider = new Splide('#relatedCardsCarousel', {
            perPage: 4,
            gap: 10,
            pagination: false,
            arrows: true,
            breakpoints: {
                992: { perPage: 3 },
                768: { perPage: 2 },
                576: { perPage: 2 }
            }
        }).mount();
    }
}

function updateUI(shouldAppend = false) {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    if (state.loading && !shouldAppend) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Cargando cartas...</p>
            </div>
        `;
        return;
    }

    if (state.error && !shouldAppend) {
        container.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle"></i>
                <p>${state.error}</p>
            </div>
        `;
        return;
    }

    displayCards(state.filteredCards.slice(0, 20), false);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize first load
    fetchCards();

    // Load More button
    const loadMoreBtn = document.getElementById('loadMoreCards');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir el comportamiento por defecto
            handleLoadMore();
        });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            handleSearch(e);
        }, 300));
    }

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            state.filters.nameSort = sortSelect.value;
            applyFiltersAndSort();
        });
    }

    // Event listeners for filters
    document.getElementById('nameSort')?.addEventListener('change', handleFilters);
    document.getElementById('rarityFilter')?.addEventListener('change', handleFilters);
    document.getElementById('typeFilter')?.addEventListener('change', handleFilters);
});

// Utility Functions
function debounce(func, wait) {
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

// Apply all filters and sorting
function applyFiltersAndSort() {
    console.log('Applying filters with state:', state.filters);
    let filtered = [...state.cards];
    console.log('Initial cards count:', filtered.length);

    // Apply search filter
    if (state.searchTerm) {
        const searchTermLower = state.searchTerm.toLowerCase();
        filtered = filtered.filter(card => 
            card.name.toLowerCase().includes(searchTermLower)
        );
        console.log('After search filter:', filtered.length);
    }

    // Apply rarity filter
    if (state.filters.rarity) {
        console.log('Filtering by rarity:', state.filters.rarity);
        filtered = filtered.filter(card => {
            console.log(`Card ${card.id} rarity:`, card.rarity);
            return card.rarity && card.rarity.includes(state.filters.rarity);
        });
        console.log('After rarity filter:', filtered.length);
    }

    // Apply type filter
    if (state.filters.type) {
        console.log('Filtering by type:', state.filters.type);
        filtered = filtered.filter(card => {
            if (!card.types || !Array.isArray(card.types)) {
                console.log(`Card ${card.id} has no valid types`);
                return false;
            }
            console.log(`Card ${card.id} types:`, card.types);
            return card.types.includes(state.filters.type);
        });
        console.log('After type filter:', filtered.length);
    }

    // Apply name sorting
    if (state.filters.nameSort) {
        filtered.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return state.filters.nameSort === 'asc' ? comparison : -comparison;
        });
        console.log('After sorting:', filtered.length);
    }

    // Update state and UI
    state.filteredCards = filtered;
    state.currentPage = 1;
    displayCards(filtered.slice(0, 20), false);
    updateLoadMoreButton();
}

// Update the load more functionality
function handleLoadMore() {
    const nextPage = state.currentPage + 1;
    const start = (nextPage - 1) * 20;
    const end = start + 20;
    const nextCards = state.filteredCards.slice(start, end);
    
    if (nextCards.length > 0) {
        state.currentPage = nextPage;
        displayCards(nextCards, true);
    }
    
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreCards');
    if (loadMoreBtn) {
        const hasMoreCards = state.currentPage * 20 < state.filteredCards.length;
        loadMoreBtn.style.display = hasMoreCards ? 'block' : 'none';
    }
}

// Handle search input
function handleSearch(event) {
    state.searchTerm = event.target.value.trim();
    applyFiltersAndSort();
}

// Handle filter changes
function handleFilters(event) {
    const { id, value } = event.target;
    const filterType = id.replace('Filter', '');
    state.filters[filterType] = value;
    console.log(`Filter changed: ${filterType} = ${value}`);
    applyFiltersAndSort();
} 