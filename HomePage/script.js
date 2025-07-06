// Base URL for the TCGdex API
const API_BASE_URL = 'https://api.tcgdex.net/v2/es';

// Global state management
const state = {
    currentPage: 1,
    cardsPerPage: 12,
    currentCards: [],
    searchTerm: '',
    sortOrder: 'number'
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

        return `
            <picture class="${cssClass}">
                ${previewUrl ? `<source srcset="${previewUrl}" type="image/webp" media="(max-width: 600px)">` : ''}
                <source srcset="${imageUrl}" type="image/webp">
                <img src="${fallbackUrl || imageUrl}" 
                    alt="${name}"
                    loading="${loadingType}"
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

// Helper function to create featured card HTML
function createFeaturedCardHtml(card) {
    if (!card.image) {
        return createNoImageCard(card);
    }

    const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
    const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
    const imageUrlFallback = imageUtils.getFallbackImage(card.image);

    return `
        <div class="featured-card" data-card-id="${card.id}">
            <div class="card-image-wrapper">
                ${imageUtils.createPicture(imageUrlHigh, card.name, {
                    previewUrl: imageUrlPreview,
                    fallbackUrl: imageUrlFallback
                })}
                <div class="card-info-overlay">
                    <h3>${card.name || 'Carta desconocida'}</h3>
                    <p>${card.set?.name || 'Expansión desconocida'}</p>
                </div>
            </div>
        </div>
    `;
}

function createNoImageCard(card) {
    return `
        <div class="featured-card" data-card-id="${card.id}">
            <div class="card-image-wrapper no-image">
                <div class="sparkle"></div>
                <div class="sparkle"></div>
                <div class="sparkle"></div>
                <div class="sparkle"></div>
                <div class="no-image-content">
                    <div class="pokeball-placeholder"></div>
                </div>
                <div class="card-info-overlay">
                    <h3>${card.name || 'Carta desconocida'}</h3>
                    <p>${card.set?.name || 'Expansión desconocida'}</p>
                    <p class="no-image-badge">Sin imagen</p>
                </div>
            </div>
        </div>
    `;
}

// Helper function to create expansion card HTML
function createExpansionHtml(set) {
    const logoUrlWebp = set.logo ? `${set.logo}.webp` : null;
    const logoUrlPng = set.logo ? `${set.logo}.png` : null;
    const symbolUrlWebp = set.symbol ? `${set.symbol}.webp` : null;
    const symbolUrlPng = set.symbol ? `${set.symbol}.png` : null;

    return `
        <div class="col-md-6">
            <div class="expansion-card" data-set-id="${set.id}">
                <div class="set-images">
                    ${logoUrlWebp ? `
                        <picture class="logo-image">
                            <source srcset="${logoUrlWebp}" type="image/webp">
                            <img src="${logoUrlPng}" 
                                alt="Logo de ${set.name}"
                                loading="lazy"
                                onerror="this.src='https://placehold.co/300x100/png?text=Logo+no+disponible'">
                        </picture>
                    ` : ''}
                    
                    ${symbolUrlWebp ? `
                        <picture class="symbol-image">
                            <source srcset="${symbolUrlWebp}" type="image/webp">
                            <img src="${symbolUrlPng}" 
                                alt="Símbolo de ${set.name}"
                                loading="lazy"
                                onerror="this.src='https://placehold.co/50x50/png?text=Símbolo+no+disponible'">
                        </picture>
                    ` : ''}
                </div>
                <div class="expansion-content">
                    <h3>${set.name || 'Expansión sin nombre'}</h3>
                    <p class="release-date">Fecha de lanzamiento: ${uiUtils.formatDate(set.releaseDate)}</p>
                    <button class="btn btn-dark">Más información</button>
                </div>
            </div>
        </div>
    `;
}

// Function to update card modal content
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

        // Load related cards (cards with the same name)
        await loadRelatedCards(cardId);

    } catch (error) {
        console.error('Error loading card details:', error);
        alert(`Error al cargar los detalles de la carta: ${error.message}`);
    }
}

// Function to load related cards
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
            
            const cardElement = document.createElement('div');
            cardElement.className = 'related-card';

            // Crear la imagen con manejo de errores
            const imageUrlHigh = imageUtils.buildUrl(relatedCard.image, 'high', 'webp');
            const imageUrlFallback = imageUtils.getFallbackImage(relatedCard.image);

            const img = new Image();
            img.src = imageUrlHigh;
            img.alt = relatedCard.name;
            img.loading = 'lazy';
            img.onerror = () => {
                if (img.src === imageUrlHigh) {
                    img.src = imageUrlFallback;
            } else {
                    img.src = 'https://placehold.co/245x337/png?text=Imagen+no+disponible';
                }
            };

            cardElement.appendChild(img);
            
            // Añadir click handler
            cardElement.addEventListener('click', () => {
                updateCardModalContent(relatedCard.id);
            });

            slide.appendChild(cardElement);
            splideList.appendChild(slide);
        });

        // Inicializar o refrescar Splide con configuración basada en el número de cartas
        if (window.relatedCardsSlider) {
            window.relatedCardsSlider.destroy();
        }

        // Ajustar el número de cartas mostradas según la cantidad disponible
        const totalCards = relatedCards.length;
        const perPage = Math.min(3, totalCards); // Mostrar máximo 3 cartas o menos si hay menos disponibles
        
        window.relatedCardsSlider = new Splide('#relatedCardsCarousel', {
            type: 'slide',
            perPage: perPage,
            perMove: 1,
            gap: '4rem',
            padding: { left: '4rem', right: '4rem' },
            pagination: true,
            arrows: relatedCards.length > perPage, // Mostrar flechas solo si hay más cartas que el perPage
            drag: true,
            snap: true,
            speed: 400,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            focus: 'center',
            trimSpace: false,
            breakpoints: {
                992: {
                    perPage: Math.min(2, totalCards),
                    gap: '3rem',
                    padding: { left: '3rem', right: '3rem' }
                },
                768: {
                    perPage: Math.min(2, totalCards),
                    gap: '2.5rem',
                    padding: { left: '2.5rem', right: '2.5rem' }
                },
                576: {
                    perPage: 1,
                    gap: '2rem',
                    padding: { left: '2rem', right: '2rem' }
                }
            }
        }).mount();

    } catch (error) {
        console.error('Error loading related cards:', error);
        const splideList = document.querySelector('.splide__list');
        if (splideList) {
            splideList.innerHTML = `
                <div class="error-message">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Error al cargar las cartas relacionadas: ${error.message}</p>
                    <button class="retry-button" onclick="loadRelatedCards('${cardId}')">
                        <i class="bi bi-arrow-clockwise"></i> Intentar de nuevo
                    </button>
                </div>
            `;
        }
    }
}

// Function to update expansion modal content
async function updateModalContent(setId) {
    const modal = document.getElementById('expansionModal');
    if (!modal) return;

    try {
        const setResponse = await fetch(`${API_BASE_URL}/sets/${setId}`);
        if (!setResponse.ok) {
            throw new Error(`HTTP error! status: ${setResponse.status}`);
        }
        const set = await setResponse.json();
        
        if (!set) {
            throw new Error('Datos de set inválidos');
        }

        // Update basic set information
        document.getElementById('modalExpansionName').textContent = set.name;
        
        // Update set images
        const logoUrlWebp = set.logo ? `${set.logo}.webp` : null;
        const logoUrlPng = set.logo ? `${set.logo}.png` : null;
        const symbolUrlWebp = set.symbol ? `${set.symbol}.webp` : null;
        const symbolUrlPng = set.symbol ? `${set.symbol}.png` : null;

        const imageContainer = document.getElementById('modalExpansionImage');
        imageContainer.innerHTML = `
            <div class="set-images">
                ${logoUrlWebp ? `
                    <picture class="logo-image">
                        <source srcset="${logoUrlWebp}" type="image/webp">
                        <img src="${logoUrlPng}" 
                            alt="Logo de ${set.name}"
                            loading="lazy"
                            onerror="this.src='https://placehold.co/300x100/png?text=Logo+no+disponible'">
                    </picture>
                ` : ''}
                
                ${symbolUrlWebp ? `
                    <picture class="symbol-image">
                        <source srcset="${symbolUrlWebp}" type="image/webp">
                        <img src="${symbolUrlPng}" 
                            alt="Símbolo de ${set.name}"
                            loading="lazy"
                            onerror="this.src='https://placehold.co/50x50/png?text=Símbolo+no+disponible'">
                    </picture>
                ` : ''}
            </div>
        `;

        document.getElementById('modalExpansionReleaseDate').textContent = `Fecha de lanzamiento: ${uiUtils.formatDate(set.releaseDate)}`;
        document.getElementById('modalExpansionCardCount').textContent = `Número de cartas: ${set.cardCount.official} (Total: ${set.cardCount.total})`;
        
        // Get random cards from this set
        const cardsResponse = await fetch(`${API_BASE_URL}/sets/${setId}`);
        if (!cardsResponse.ok) {
            throw new Error(`HTTP error! status: ${cardsResponse.status}`);
        }
        const setData = await cardsResponse.json();
        
        // Load featured cards
        const featuredCardsContainer = document.getElementById('modalFeaturedCards');
        if (setData.cards && setData.cards.length > 0) {
            // Get 6 random cards
            const randomCards = setData.cards
                .sort(() => 0.5 - Math.random())
                .slice(0, 6);

            featuredCardsContainer.innerHTML = randomCards.map(card => {
                const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
                const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
                const imageUrlFallback = imageUtils.getFallbackImage(card.image);

                return `
                    <div class="col-md-4 col-sm-6">
                        <div class="card">
                            ${imageUtils.createPicture(imageUrlHigh, card.name, {
                                previewUrl: imageUrlPreview,
                                fallbackUrl: imageUrlFallback
                            })}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            featuredCardsContainer.innerHTML = '<p>No se encontraron cartas para esta expansión</p>';
        }
    } catch (error) {
        console.error('Error loading set details:', error);
        uiUtils.showError(document.getElementById('modalFeaturedCards'), 
            `Error al cargar los detalles de la expansión: ${error.message}`);
    }
}

// Load featured cards
async function loadFeaturedCards(shouldShowLoading = true) {
    const container = document.getElementById('featured-cards-container');
    if (!container) return;

    try {
        if (shouldShowLoading) {
            uiUtils.showLoading(container);
            
            // Disable random button while loading
            const randomBtn = document.getElementById('randomCardsBtn');
            if (randomBtn) {
                randomBtn.disabled = true;
                randomBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Cargando...
                `;
            }
        }
        
        const cards = await getRandomCards(4);
        
        // Obtener detalles completos de cada carta
        const detailedCards = await Promise.all(
            cards.map(async (card) => {
                try {
                    const response = await fetch(`${API_BASE_URL}/cards/${card.id}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return await response.json();
                } catch (error) {
                    console.error(`Error fetching details for card ${card.id}:`, error);
                    return card; // Fallback to original card data if fetch fails
                }
            })
        );
        
        // Crear el HTML para todas las cartas
        const cardsHtml = detailedCards.map(card => createFeaturedCardHtml(card)).join('');
        container.innerHTML = cardsHtml;

        // Add click event listeners to all cards
        const cardElements = container.querySelectorAll('.featured-card');
        cardElements.forEach(cardElement => {
            cardElement.addEventListener('click', async () => {
                const cardId = cardElement.dataset.cardId;
                    const modal = new bootstrap.Modal(document.getElementById('cardDetailModal'));
                await updateCardModalContent(cardId);
                    modal.show();
            });
        });

    } catch (error) {
        console.error('Error en loadFeaturedCards:', error);
        uiUtils.showError(container, `Error al cargar las cartas destacadas: ${error.message}`);
    } finally {
        // Re-enable random button
        const randomBtn = document.getElementById('randomCardsBtn');
        if (randomBtn) {
            randomBtn.disabled = false;
            randomBtn.innerHTML = `<i class="bi bi-shuffle me-2"></i>Random`;
        }
    }
}

// Helper function to display a set in the modal
async function displaySetInModal(set) {
    console.log('Set data for modal:', set);
    
    if (!set) {
        uiUtils.showError(document.getElementById('modalExpansionImage'), 'No se pudo cargar la expansión');
        return;
    }

    // Actualizar el título
    const nameElement = document.getElementById('modalExpansionName');
    if (nameElement) nameElement.textContent = set.name;

    // Actualizar la serie
    const seriesElement = document.getElementById('modalExpansionSeries');
    if (seriesElement) {
        seriesElement.textContent = set.serie ? set.serie.name : 'Serie no especificada';
    }

    // Actualizar la fecha
    const dateElement = document.getElementById('modalExpansionReleaseDate');
    if (dateElement) {
        dateElement.textContent = set.releaseDate ? uiUtils.formatDate(set.releaseDate) : 'Fecha no disponible';
    }

    // Actualizar los contadores de cartas
    const cardCountElement = document.getElementById('modalExpansionCardCount');
    const totalCountElement = document.getElementById('modalExpansionTotalCount');
    if (cardCountElement) cardCountElement.textContent = set.cardCount?.official || '0';
    if (totalCountElement) totalCountElement.textContent = set.cardCount?.total || '0';

    // Actualizar la descripción
    const descElement = document.getElementById('modalExpansionDescription');
    if (descElement) {
        descElement.textContent = getSetDescription(set);
    }

    // Construir URLs para logo y símbolo
    const logoUrlWebp = set.logo ? `${set.logo}.webp` : null;
    const logoUrlPng = set.logo ? `${set.logo}.png` : null;
    const symbolUrlWebp = set.symbol ? `${set.symbol}.webp` : null;
    const symbolUrlPng = set.symbol ? `${set.symbol}.png` : null;

    // Actualizar imágenes
    const imageContainer = document.getElementById('modalExpansionImage');
    if (imageContainer) {
        let visualContent = '';

        if (logoUrlWebp) {
            // Caso 1: Tiene logo
            visualContent = `
                <div class="set-images">
                    <picture class="logo-image">
                        <source srcset="${logoUrlWebp}" type="image/webp">
                        <img src="${logoUrlPng}" 
                            alt="Logo de ${set.name}"
                            loading="lazy"
                            onerror="this.src='https://placehold.co/300x100/png?text=Logo+no+disponible'">
                    </picture>
                    ${symbolUrlWebp ? `
                        <picture class="symbol-image">
                            <source srcset="${symbolUrlWebp}" type="image/webp">
                            <img src="${symbolUrlPng}" 
                                alt="Símbolo de ${set.name}"
                                loading="lazy"
                                onerror="this.src='https://placehold.co/50x50/png?text=Símbolo+no+disponible'">
                        </picture>
                    ` : ''}
                </div>`;
        } else if (symbolUrlWebp) {
            // Caso 2: No tiene logo pero tiene símbolo
            visualContent = `
                <div class="set-images symbol-only">
                    <div class="symbol-container">
                        <div class="symbol-decoration top"></div>
                        <div class="symbol-wrapper">
                            <picture class="symbol-image large">
                                <source srcset="${symbolUrlWebp}" type="image/webp">
                                <img src="${symbolUrlPng}" 
                                    alt="Símbolo de ${set.name}"
                                    loading="lazy"
                                    onerror="this.src='https://placehold.co/150x150/png?text=${encodeURIComponent(set.name[0])}'">
                            </picture>
                        </div>
                        <div class="symbol-decoration bottom"></div>
                    </div>
                </div>`;
        } else {
            // Caso 3: No tiene ni logo ni símbolo
            visualContent = `
                <div class="generated-banner">
                    <div class="banner-pokeball top-left"></div>
                    <div class="banner-pokeball bottom-right"></div>
                    <div class="banner-content">
                        <h3 class="banner-title">${set.name}</h3>
                        <div class="banner-decoration"></div>
                    </div>
                </div>`;
        }

        imageContainer.innerHTML = visualContent;
    }

    // Resetear variables de paginación y filtrado
    state.currentPage = 1;
    state.searchTerm = '';
    state.sortOrder = 'number';
    
    // Obtener y mostrar las cartas
    await loadSetCards(set.id);

    // Configurar event listeners para búsqueda y ordenamiento
    setupCardFilters(set.id);
}

// Función para cargar las cartas de un set
async function loadSetCards(setId) {
    const container = document.getElementById('expansionCardsList');
    if (!container) return;

    try {
        // Mostrar estado de carga
        container.innerHTML = `
            <div class="loading-cards">
                <div class="spinner"></div>
                <p>Cargando cartas...</p>
            </div>
        `;

        // Obtener los datos del set
        const response = await fetch(`${API_BASE_URL}/sets/${setId}`);
        if (!response.ok) {
            throw new Error(`Error al cargar las cartas: ${response.status}`);
        }
        const setData = await response.json();

        if (!setData.cards || setData.cards.length === 0) {
            container.innerHTML = `
                <div class="no-cards-message">
                    <i class="bi bi-info-circle"></i>
                    <p>No hay cartas disponibles para esta expansión</p>
                </div>
            `;
            return;
        }

        // Guardar las cartas en la variable global
        state.currentCards = setData.cards;

        // Aplicar filtros y ordenamiento
        const filteredCards = filterAndSortCards();

        // Mostrar las primeras cartas
        displayCards(filteredCards);

        // Actualizar visibilidad del botón "Cargar más"
        updateLoadMoreButton(filteredCards);

    } catch (error) {
        console.error('Error loading set cards:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Error al cargar las cartas: ${error.message}</p>
                <button class="retry-button" onclick="loadSetCards('${setId}')">
                    <i class="bi bi-arrow-clockwise"></i> Intentar de nuevo
                </button>
            </div>
        `;
    }
}

// Función para filtrar y ordenar las cartas
function filterAndSortCards() {
    let filtered = [...state.currentCards];

    // Aplicar filtro de búsqueda
    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(card => 
            card.name.toLowerCase().includes(term) ||
            card.id.toLowerCase().includes(term)
        );
    }

    // Aplicar ordenamiento
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

// Function to show card modal and hide expansion modal
async function showCardModal(cardId) {
    // Ocultar el modal de expansión sin destruirlo
    const expansionModal = document.getElementById('expansionModal');
    expansionModal.style.display = 'none';

    // Mostrar el modal de carta
    const cardModal = new bootstrap.Modal(document.getElementById('cardDetailModal'));
    await updateCardModalContent(cardId);
    cardModal.show();

    // Configurar el evento para cuando se cierre el modal de carta
    const cardModalElement = document.getElementById('cardDetailModal');
    cardModalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
        // Mostrar el modal de expansión nuevamente
        expansionModal.style.display = 'block';
        // Remover este event listener para evitar duplicados
        cardModalElement.removeEventListener('hidden.bs.modal', onModalHidden);
    }, { once: true }); // once: true asegura que el evento se elimine después de ejecutarse
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

    // Añadir event listeners para abrir el modal de cartas
    container.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', async () => {
            const cardId = card.dataset.cardId;
            await showCardModal(cardId);
        });
    });
}

// Función para actualizar el botón de "Cargar más"
function updateLoadMoreButton(filteredCards) {
    const button = document.getElementById('loadMoreCards');
    if (!button) return;

    const hasMoreCards = state.currentPage * state.cardsPerPage < filteredCards.length;
    button.style.display = hasMoreCards ? 'inline-block' : 'none';
}

// Función para configurar los filtros de cartas
function setupCardFilters(setId) {
    // Event listener para búsqueda
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

    // Event listener para ordenamiento
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

    // Event listener para "Cargar más"
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

// Load expansions
async function loadExpansions() {
    const container = document.getElementById('expansions-container');
    if (!container) return;

    try {
        uiUtils.showLoading(container);
        
        // Disable refresh button while loading
        const refreshBtn = document.getElementById('refreshExpansionsBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cargando...
            `;
        }

        // Obtener todos los sets
        const response = await fetch('https://api.tcgdex.net/v2/es/sets');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sets = await response.json();
        
        // Seleccionar 3 sets aleatorios
        const randomSets = sets
            .sort(() => Math.random() - 0.5) // Mezclar el array
            .slice(0, 3); // Tomar los primeros 3

        const setsHtml = await Promise.all(randomSets.map(async (setPreview) => {
            // Obtener detalles completos del set
            const setResponse = await fetch(`https://api.tcgdex.net/v2/es/sets/${setPreview.id}`);
            const set = await setResponse.json();

            const hasLogo = !!set.logo;
            const hasSymbol = !!set.symbol;
            
            let visualElement;
            
            if (hasLogo) {
                visualElement = `
                    <picture>
                        <source srcset="${set.logo}.webp" type="image/webp">
                        <img class="logo-image" 
                             src="${set.logo}.png" 
                             alt="Logo de ${set.name}"
                             loading="lazy"
                             onerror="this.src='https://placehold.co/300x100/png?text=${encodeURIComponent(set.name)}'">
                    </picture>`;
            } else if (hasSymbol) {
                visualElement = `
                    <div class="symbol-container">
                        <div class="symbol-decoration top"></div>
                        <div class="symbol-wrapper">
                            <picture>
                                <source srcset="${set.symbol}.webp" type="image/webp">
                                <img class="symbol-image" 
                                     src="${set.symbol}.png" 
                                     alt="Símbolo de ${set.name}"
                                     loading="lazy"
                                     onerror="this.src='https://placehold.co/80x80/png?text=${encodeURIComponent(set.name[0])}'">
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
                            <h3 class="banner-title">${set.name}</h3>
                            <div class="banner-decoration"></div>
                        </div>
                    </div>`;
            }

            return `
                <div class="expansion-card" data-set-id="${set.id}">
                    <div class="image-container">
                        ${visualElement}
                    </div>
                    <div class="expansion-info">
                        <h3 class="expansion-name">${set.name}</h3>
                        <div class="expansion-details">
                            ${set.releaseDate ? `
                                <div>Lanzamiento: ${uiUtils.formatDate(set.releaseDate)}</div>
                            ` : ''}
                            ${set.cardCount ? `
                                <div>Cartas: ${set.cardCount.official} oficiales</div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }));

        container.innerHTML = setsHtml.join('');

        // Add click event listeners to the expansion cards
        const cards = container.querySelectorAll('.expansion-card');
        cards.forEach(card => {
            card.addEventListener('click', async () => {
                try {
                const setId = card.dataset.setId;
                    console.log('Clicked set ID:', setId); // Debug log
                    
                    // Mostrar un indicador de carga en la tarjeta
                    const originalContent = card.innerHTML;
                    card.innerHTML = `
                        <div class="loading-overlay">
                            <div class="spinner-border text-light" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                        ${originalContent}
                    `;
                    
                    const setResponse = await fetch(`${API_BASE_URL}/sets/${setId}`);
                    if (!setResponse.ok) {
                        throw new Error(`HTTP error! status: ${setResponse.status}`);
                    }
                    const setData = await setResponse.json();
                    
                    // Restaurar el contenido original de la tarjeta
                    card.innerHTML = originalContent;
                    
                    // Mostrar modal
                    const expansionModal = new bootstrap.Modal(document.getElementById('expansionModal'));
                    
                    // Primero mostrar el modal
                    expansionModal.show();
                    
                    // Luego cargar los datos
                    await displaySetInModal(setData);
                    
                } catch (error) {
                    console.error('Error loading set details:', error);
                    // Restaurar el contenido original si hay error
                    if (originalContent) {
                        card.innerHTML = originalContent;
                    }
                    alert(`Error al cargar los detalles de la expansión: ${error.message}`);
                }
            });
        });

    } catch (error) {
        console.error('Error loading sets:', error);
        uiUtils.showError(container, `Error al cargar las expansiones: ${error.message}`);
    } finally {
        // Re-enable refresh button
        const refreshBtn = document.getElementById('refreshExpansionsBtn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `<i class="bi bi-shuffle me-2"></i>Cambiar Expansiones`;
        }
    }
}

// Add click handler for refresh button
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshExpansionsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadExpansions());
    }
});

// Retry loading function
async function retryLoading(button) {
    const container = button.closest('.alert').parentElement;
    if (container.id === 'featured-cards-container') {
        await loadFeaturedCards();
    } else if (container.id === 'expansions-container') {
        await loadExpansions();
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize carousel
        const mainCarousel = document.getElementById('mainCarousel');
        if (mainCarousel) {
            const carousel = new bootstrap.Carousel(mainCarousel, {
                interval: 5000,
                touch: true,
                pause: 'hover'
            });
        }

        // Add click handler for random button
        const randomBtn = document.getElementById('randomCardsBtn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => loadFeaturedCards(true));
        }

        // Load featured cards and expansions
        await Promise.all([
            loadFeaturedCards(true),
            loadExpansions()
        ]);

    } catch (error) {
        console.error('Initialization error:', error);
        const container = document.getElementById('featured-cards-container');
        if (container) {
            uiUtils.showError(container, `Error al inicializar la aplicación: ${error.message}`);
        }
    }
});

// Helper function to display a card
function displayCard(card, container) {
    console.log('Card data:', card);

    if (!card) {
        container.innerHTML = '<p class="error">No se pudo cargar la carta</p>';
        return;
    }

    const imageUrlPreview = imageUtils.buildUrl(card.image, 'low', 'webp');
    const imageUrlHigh = imageUtils.buildUrl(card.image, 'high', 'webp');
    const imageUrlFallback = imageUtils.getFallbackImage(card.image);

    let typesHtml = '';
    if (card.types && Array.isArray(card.types)) {
        typesHtml = '<div class="types">' +
            card.types.map(type =>
                `<span class="type type-${type}">${type}</span>`
            ).join('') + '</div>';
    }

    let attacksHtml = '';
    if (card.attacks && Array.isArray(card.attacks)) {
        attacksHtml = '<div class="attacks"><h4>Ataques:</h4>' +
            card.attacks.map(attack => `
                <div class="attack">
                    <strong>${attack.name}</strong>
                    ${attack.damage ? ` - ${attack.damage}` : ''}
                    ${attack.effect ? `<br><small>${attack.effect}</small>` : ''}
                    ${attack.cost ? `<br><small>Coste: ${attack.cost.join(', ')}</small>` : ''}
                </div>
            `).join('') + '</div>';
    }

    const cardHtml = `
        <div class="card">
            ${imageUtils.createPicture(imageUrlHigh, card.name, {
                fallbackUrl: imageUrlFallback
            })}
            <div class="card-details">
                <h3>${card.name}</h3>
                ${typesHtml}
                <div class="card-stats">
                    ${card.hp ? `<span class="stat">PS: ${card.hp}</span>` : ''}
                    ${card.rarity ? `<span class="stat">Rareza: ${card.rarity}</span>` : ''}
                    ${card.category ? `<span class="stat">Categoría: ${card.category}</span>` : ''}
                </div>
                ${attacksHtml}
                ${card.description ? `<p><small>${card.description}</small></p>` : ''}
                <p><small>Expansión: ${card.set.name}</small></p>
                ${card.illustrator ? `<p><small>Ilustrador: ${card.illustrator}</small></p>` : ''}
                <p><small>ID: ${card.id}</small></p>
            </div>
        </div>
    `;

    container.innerHTML = cardHtml;
}

// Helper function to display a set
function displaySet(set) {
    console.log('Set data:', set);
    const container = document.getElementById('expansions-container');

    if (!set) {
        container.innerHTML = '<p class="error">No se pudo cargar la expansión</p>';
        return;
    }

    const setHtml = `
        <div class="expansion-card">
            <div class="expansion-image">
                <img src="${set.logo}.png" 
                     alt="${set.name}"
                     style="width: 100%; height: 100%; object-fit: contain;"
                     onerror="this.src='https://placehold.co/600x200/png?text=Imagen+no+disponible'">
            </div>
            <div class="expansion-content">
                <p>${getSetDescription(set)}</p>
                <button class="btn">Mas información</button>
            </div>
        </div>
    `;

    container.innerHTML = setHtml;
}

// Helper function to get set description
function getSetDescription(set) {
    // Aquí podemos agregar descripciones personalizadas basadas en el nombre del set
    const descriptions = {
        'Scarlet & Violet—Paradox Rift': 'El rugido feroz de los Pokémon tipo Dragón resuena en toda la nueva expansión.',
        'Scarlet & Violet': 'Eevee y su gama de evoluciones brillan en cartas raras con ilustraciones especiales.',
        'Crown Zenith': 'Una colección especial que celebra el final de la era Sword & Shield.',
        'Astral Radiance': 'Explora la región de Hisui con nuevos Pokémon y mecánicas.',
        'Brilliant Stars': 'Las estrellas brillan con la introducción de los Pokémon VSTAR.',
        'Fusion Strike': 'Nuevas estrategias emergen con el estilo de combate Fusion Strike.',
        'Evolving Skies': 'Los dragones dominan los cielos en esta expansión épica.',
        'Chilling Reign': 'El frío poder de los Pokémon legendarios se desata.',
        'Battle Styles': 'Domina los estilos de combate Single Strike y Rapid Strike.',
        'Shining Fates': 'Descubre versiones brillantes de tus Pokémon favoritos.',
        'Vivid Voltage': 'La electricidad cobra vida con Pikachu VMAX.',
        'Champions Path': 'Sigue el camino de los campeones en esta colección especial.',
        'Rebel Clash': 'La rebelión comienza con nuevos Pokémon V y VMAX.',
        'Sword & Shield': 'La nueva era comienza con los Pokémon V.',
        'Hidden Fates': 'Encuentra tesoros ocultos y Pokémon brillantes.',
        'Team Up': 'Une fuerzas con tus Pokémon favoritos.',
        'Lost Origin': 'Explora el misterioso origen de los Pokémon perdidos.',
        'Paldea Evolved': 'La región de Paldea evoluciona con nuevas cartas y estrategias.',
        '151': 'Celebra los 151 Pokémon originales en esta colección especial.',
        'Temporal Forces': 'Las fuerzas del tiempo y el espacio convergen.',
        'Obsidian Flames': 'El poder del fuego oscuro emerge en esta expansión.',
        'Pokemon GO': 'La experiencia de Pokemon GO llega al juego de cartas.',
        'Silver Tempest': 'Una tormenta plateada trae nuevos desafíos.',
        // Añade más descripciones según sea necesario
    };

    return descriptions[set.name] || 
           `Descubre las nuevas cartas y estrategias en ${set.name}, una emocionante expansión con ${set.cardCount?.official || '?'} cartas oficiales.`;
}

// Function to get random cards
async function getRandomCards(count = 5) {
    try {
        // Primero obtenemos todas las cartas
        const response = await fetch(`${API_BASE_URL}/cards`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cards = await response.json();

        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error('No se encontraron cartas');
        }

        // Mezclamos el array de cartas
        const shuffledCards = cards.sort(() => Math.random() - 0.5);

        // Tomamos las primeras 'count' cartas
        const selectedCards = shuffledCards.slice(0, count);

        // No necesitamos hacer una segunda llamada para cada carta
        // ya que la API nos devuelve toda la información necesaria
        console.log('Cartas seleccionadas:', selectedCards);
        return selectedCards;
    } catch (error) {
        console.error('Error en getRandomCards:', error);
        throw error;
    }
}

// Function to get a random set
async function getRandomSet() {
    try {
        const response = await fetch(`${API_BASE_URL}/sets`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sets = await response.json();
        console.log('Sets disponibles:', sets);

        if (!Array.isArray(sets) || sets.length === 0) {
            throw new Error('No se encontraron expansiones');
        }

        const randomIndex = Math.floor(Math.random() * sets.length);
        const randomSetId = sets[randomIndex].id;

        const setResponse = await fetch(`${API_BASE_URL}/sets/${randomSetId}`);
        if (!setResponse.ok) {
            throw new Error(`HTTP error! status: ${setResponse.status}`);
        }
        const setData = await setResponse.json();
        console.log('Set seleccionado:', setData);
        return setData;
    } catch (error) {
        console.error('Error en getRandomSet:', error);
        throw error;
    }
}

// Función para mostrar los juegos aleatorios
function displayRandomGames(games) {
    const container = document.getElementById('random-games-container');
    container.innerHTML = '';
    
    games.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'col-md-4 mb-4';
        gameCard.innerHTML = `
            <div class="random-game-card">
                <img src="${game.image}" class="random-game-image" 
                     alt="Portada de ${game.name}" 
                     onerror="this.src='../games_sinapi/images/placeholder.svg'">
                <div class="random-game-body">
                    <h3 class="random-game-title">${game.name}</h3>
                    <div class="random-game-info">${game.generation} Generación - ${game.year}</div>
                    <div class="random-game-region">${game.region}</div>
                </div>
            </div>
        `;
        container.appendChild(gameCard);
    });
}

// Generic function to handle random loading
async function handleRandomLoad(type, count = 3) {
    const loaders = {
        'cards': getRandomCards,
        'expansions': getRandomSet,
        'games': async () => {
            const response = await fetch('../games_sinapi/data/games.json');
            const data = await response.json();
            const games = data.mainGames;
            const randomGames = [];
            const usedIndexes = new Set();
            
            while (randomGames.length < count && usedIndexes.size < games.length) {
                const randomIndex = Math.floor(Math.random() * games.length);
                if (!usedIndexes.has(randomIndex)) {
                    usedIndexes.add(randomIndex);
                    randomGames.push(games[randomIndex]);
                }
            }
            return randomGames;
        }
    };

    const displayers = {
        'cards': (items) => {
            const container = document.getElementById('featured-cards-container');
            container.innerHTML = items.map(card => createFeaturedCardHtml(card)).join('');
        },
        'expansions': (items) => {
            const container = document.getElementById('expansions-container');
            container.innerHTML = items.map(set => createExpansionHtml(set)).join('');
        },
        'games': displayRandomGames
    };

    try {
        const items = await loaders[type](count);
        displayers[type](items);
    } catch (error) {
        console.error(`Error loading random ${type}:`, error);
        const containerId = type === 'cards' ? 'featured-cards-container' : 
                          type === 'expansions' ? 'expansions-container' : 
                          'random-games-container';
        document.getElementById(containerId).innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    Error al cargar los ${type}. Por favor, intenta de nuevo.
                </div>
            </div>
        `;
    }
}

// Event listeners for random loading buttons
document.addEventListener('DOMContentLoaded', () => {
    // Initialize random content
    handleRandomLoad('cards', 4);
    handleRandomLoad('expansions');
    handleRandomLoad('games', 3);

    // Add click event listeners
    document.getElementById('randomCardsBtn')?.addEventListener('click', () => handleRandomLoad('cards', 4));
    document.getElementById('refreshExpansionsBtn')?.addEventListener('click', () => handleRandomLoad('expansions'));
    document.getElementById('refreshGamesBtn')?.addEventListener('click', () => handleRandomLoad('games', 3));
});