// State Management
const API_BASE_URL = 'https://api.tcgdex.net/v2/es';

const state = {
    cards: [],
    currentPage: 1,
    cardsPerPage: 20,
    loading: false,
    error: null,
    searchTerm: '',
    sortBy: 'name',
    filters: {}
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
        
        // Fetch cards from TCGdex API
        const response = await fetch(`${API_BASE_URL}/cards`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const cards = await response.json();
        
        // Apply pagination
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedCards = cards.slice(start, end);
        
        // Si shouldAppend es true, añadir a las cartas existentes
        // Si es false, reemplazar las cartas
        state.cards = shouldAppend ? [...state.cards, ...paginatedCards] : paginatedCards;
        state.loading = false;
        updateUI(shouldAppend);

        // Actualizar visibilidad del botón "Cargar más"
        const loadMoreBtn = document.getElementById('loadMoreCards');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = end >= cards.length ? 'none' : 'block';
        }
    } catch (error) {
        state.error = 'Error al cargar las cartas. Por favor, intenta de nuevo.';
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

// UI Functions
function displayCards(cards, shouldAppend = false) {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    const cardsHtml = cards.map(card => {
        const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
        const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
        const imageUrlFallback = imageUtils.getFallbackImage(card.image);

        if (!card.image) {
            return `
                <div class="card" data-card-id="${card.id}">
                    <div class="card-wrapper no-image">
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="sparkle"></div>
                        <div class="no-image-content">
                            <div class="pokeball-placeholder"></div>
                            <div class="missing-image-text">¿Quién es este Pokémon?</div>
                            <div class="question-mark">?</div>
                        </div>
                        <div class="card-info">
                            <h3>${card.name}</h3>
                            <p>${card.category || 'Desconocido'}</p>
                            <p class="no-image-badge">Sin imagen</p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card" data-card-id="${card.id}">
                <div class="card-wrapper">
                    ${imageUtils.createPicture(imageUrlHigh, card.name, {
                        previewUrl: imageUrlPreview,
                        fallbackUrl: imageUrlFallback,
                        cssClass: 'card-image'
                    })}
                    <div class="card-info">
                        <div class="card-name">${card.name}</div>
                        <div class="card-number">${card.localId || '?'}</div>
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
        ? container.querySelectorAll('.card:not([data-initialized])')
        : container.querySelectorAll('.card');

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

        // Get the primary type of the card
        const primaryType = card.types && card.types.length > 0 ? card.types[0] : 'Colorless';
        
        // Update info container background color based on type
        const infoContainer = document.querySelector('.info-container');
        if (infoContainer) {
            // Remove any previous type classes
            infoContainer.classList.forEach(className => {
                if (className.startsWith('type-bg-')) {
                    infoContainer.classList.remove(className);
                }
            });
            // Add new type class
            infoContainer.classList.add(`type-bg-${primaryType}`);
        }

        // Update card ID
        const cardIdElement = document.getElementById('modalCardId');
        if (cardIdElement) cardIdElement.textContent = card.id;

        // Update card image
        const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
        const imageUrlFallback = imageUtils.getFallbackImage(card.image);

        const modalCardImage = document.getElementById('modalCardImage');
        if (modalCardImage) {
            modalCardImage.innerHTML = imageUtils.createPicture(imageUrlHigh, card.name, {
                fallbackUrl: imageUrlFallback
            });
        }

        // Update card name
        const nameElement = document.getElementById('modalCardName');
        if (nameElement) nameElement.textContent = card.name;

        // Update rarity
        const rarityElement = document.getElementById('modalCardRarity');
        if (rarityElement) rarityElement.textContent = card.rarity || 'Rareza desconocida';

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

            // Update card number
            const cardNumberElement = document.getElementById('modalCardNumber');
            if (cardNumberElement) {
                cardNumberElement.textContent = `${card.localId || '?'}/${card.set.cardCount?.official || '?'}`;
            }
        }

        // Update artist
        const artistElement = document.getElementById('modalCardArtist');
        if (artistElement) artistElement.textContent = card.illustrator || 'Desconocido';

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

    displayCards(state.cards, shouldAppend);
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
            state.currentPage++;
            fetchCards(state.currentPage, state.cardsPerPage, true);
        });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            state.searchTerm = e.target.value;
            state.currentPage = 1;
            state.cards = [];
            fetchCards();
        }, 300));
    }

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            state.sortBy = sortSelect.value;
            state.currentPage = 1;
            state.cards = [];
            fetchCards();
        });
    }
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