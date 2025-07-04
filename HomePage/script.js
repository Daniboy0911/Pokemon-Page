// Base URL for the Pokemon TCG API
const API_BASE_URL = 'https://api.pokemontcg.io/v2';

// Helper function to fetch data from the API
async function fetchFromApi(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching from API:', error);
        throw error;
    }
}

// Helper function to create featured card HTML
function createFeaturedCardHtml(card) {
    return `
        <div class="col">
            <div class="featured-card" data-card-id="${card.id}">
                <img src="${card.images.small}" 
                    alt="${card.name}" 
                    loading="lazy"
                    onerror="this.src='https://placehold.co/250x350/png?text=Card+Image+Not+Available'">
                <div class="featured-card-overlay">
                    <h3>${card.name || 'Unknown Card'}</h3>
                    <p>${card.set.name || 'Unknown Set'}</p>
                </div>
            </div>
        </div>
    `;
}

// Helper function to create expansion card HTML
function createExpansionHtml(set) {
    return `
        <div class="col-md-6">
            <div class="expansion-card" data-set-id="${set.id}">
                <img src="${set.images.logo}" 
                    alt="${set.name}" 
                    class="expansion-image"
                    loading="lazy"
                    onerror="this.src='${set.images.symbol}'">
                <div class="expansion-content">
                    <p>${set.name || 'Set sin nombre'}</p>
                    <button class="btn btn-dark">Mas información</button>
                </div>
            </div>
        </div>
    `;
}

// Helper function to show loading state
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
    `;
}

// Helper function to show error state
function showError(element, message) {
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
}

// Helper function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Function to get random items from array
function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Helper function to format card types
function formatCardTypes(types) {
    if (!types) return '';
    return types.map(type => `<span class="badge bg-${type.toLowerCase()} me-1">${type}</span>`).join('');
}

// Helper function to format attacks
function formatAttacks(attacks) {
    if (!attacks) return '';
    return attacks.map(attack => `
        <div class="card mb-2">
            <div class="card-body">
                <h6 class="card-title">${attack.name}</h6>
                <p class="card-text">
                    <small class="text-muted">Daño: ${attack.damage || '-'}</small>
                </p>
                <p class="card-text">${attack.effect || ''}</p>
                <p class="card-text">
                    <small class="text-muted">Coste: ${attack.cost ? attack.cost.join(', ') : '-'}</small>
                </p>
            </div>
        </div>
    `).join('');
}

// Helper function to format weaknesses and resistances
function formatMultipliers(multipliers) {
    if (!multipliers) return '';
    return multipliers.map(m => `
        <span class="badge bg-${m.type.toLowerCase()} me-1">
            ${m.type} (${m.value})
        </span>
    `).join('');
}

// Function to create type-specific background
function createTypeBackground(types) {
    if (!types || types.length === 0) return '';
    
    if (types.length === 1) {
        return `type-bg-${types[0]}`;
    } else {
        // Create gradient for dual types
        const [type1, type2] = types;
        const gradient = `linear-gradient(135deg, 
            var(--type-${type1}) 0%, 
            var(--type-${type1}) 40%, 
            var(--type-${type2}) 60%, 
            var(--type-${type2}) 100%)`;
        return `type-bg-dual`;
    }
}

// Function to update card modal content
async function updateCardModalContent(cardId) {
    try {
        console.log('Fetching card details for modal:', cardId);
        const response = await fetchFromApi(`/cards/${cardId}`);
        const card = response.data;
        console.log('Card details received:', card);

        if (!card) {
            throw new Error('No se pudo cargar la información de la carta');
        }

        // Update modal title and background
        document.getElementById('cardDetailModalLabel').textContent = card.name || 'Unknown Card';
        
        // Update type background
        const typeBg = document.querySelector('#cardDetailModal .type-bg');
        if (typeBg && card.types) {
            typeBg.className = 'type-bg ' + createTypeBackground(card.types);
            if (card.types.length > 1) {
                typeBg.style.background = `linear-gradient(135deg, 
                    var(--type-${card.types[0].toLowerCase()}) 0%, 
                    var(--type-${card.types[0].toLowerCase()}) 40%, 
                    var(--type-${card.types[1].toLowerCase()}) 60%, 
                    var(--type-${card.types[1].toLowerCase()}) 100%)`;
            } else {
                typeBg.style.background = '';
            }
        }

        // Update card image
        const modalCardImage = document.getElementById('modalCardImage');
        modalCardImage.src = card.images.large || card.images.small;
        modalCardImage.alt = card.name;

        // Update basic card info
        document.getElementById('modalCardName').textContent = card.name;
        document.getElementById('modalCardTypes').innerHTML = card.types ? 
            `<span class="info-label">Tipos:</span> ${formatCardTypes(card.types)}` : '';
        document.getElementById('modalCardRarity').textContent = card.rarity || 'N/A';
        document.getElementById('modalCardSet').textContent = card.set.name;
        document.getElementById('modalCardNumber').textContent = `${card.number}/${card.set.printedTotal}`;
        document.getElementById('modalCardArtist').textContent = card.artist || 'Desconocido';

        // Pokemon-specific stats
        const pokemonStats = document.getElementById('pokemonStats');
        if (card.supertype === 'Pokémon') {
            pokemonStats.style.display = 'block';
            document.getElementById('modalCardHP').textContent = card.hp || '0';
            
            // Format attacks
            const attacksHtml = card.attacks ? formatAttacks(card.attacks) : '';
            document.getElementById('modalCardAttacks').innerHTML = attacksHtml || 'No attacks available';
            
            // Format weaknesses and resistances
            document.getElementById('modalCardWeaknesses').innerHTML = formatMultipliers(card.weaknesses) || 'None';
            document.getElementById('modalCardResistances').innerHTML = formatMultipliers(card.resistances) || 'None';
            document.getElementById('modalCardRetreatCost').textContent = card.convertedRetreatCost?.toString() || '0';

            // Add evolution info if available
            const evolutionElement = document.getElementById('modalCardEvolution');
            if (card.evolvesFrom) {
                evolutionElement.innerHTML = `
                    <div class="mb-2">
                        <span class="info-label">Evoluciona de:</span> ${card.evolvesFrom}
                    </div>
                `;
                evolutionElement.style.display = 'block';
            } else {
                evolutionElement.style.display = 'none';
            }
        } else {
            pokemonStats.style.display = 'none';
        }

        // Rules text if available
        const descriptionElement = document.getElementById('modalCardDescription');
        if (descriptionElement) {
            if (card.rules || card.text) {
                descriptionElement.innerHTML = `
                    <div class="mt-3">
                        <h6 class="info-label">Descripción:</h6>
                        <p>${card.rules?.join('<br>') || card.text || ''}</p>
                    </div>
                `;
                descriptionElement.style.display = 'block';
            } else {
                descriptionElement.style.display = 'none';
            }
        }

        // Legal status if available
        const legalElement = document.getElementById('modalCardLegal');
        if (legalElement && card.legalities) {
            legalElement.innerHTML = `
                <div class="mt-3">
                    <h6 class="info-label">Estado Legal:</h6>
                    <p>
                        Standard: ${card.legalities.standard || 'No legal'}<br>
                        Expanded: ${card.legalities.expanded || 'No legal'}
                    </p>
                </div>
            `;
            legalElement.style.display = 'block';
        } else if (legalElement) {
            legalElement.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading card details:', error);
        alert(`Error al cargar los detalles de la carta: ${error.message}`);
    }
}

// Load featured cards
async function loadFeaturedCards(shouldShowLoading = true) {
    const container = document.getElementById('featured-cards-container');
    if (!container) return;

    try {
        if (shouldShowLoading) {
            showLoading(container);
            
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
        
        // Get random cards
        const response = await fetchFromApi('/cards', { 
            pageSize: '100',
            orderBy: 'random',
            q: 'supertype:pokemon' // Only get Pokemon cards
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No se encontraron cartas');
        }

        // Get 5 random cards
        const randomCards = response.data.slice(0, 5);
        
        // Create HTML for cards
        const cardsHtml = randomCards.map(card => createFeaturedCardHtml(card)).join('');

        container.innerHTML = `
            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4">
                ${cardsHtml}
            </div>
        `;

        // Add click event listeners to featured cards
        document.querySelectorAll('.featured-card').forEach((cardElement) => {
            cardElement.addEventListener('click', async () => {
                const cardId = cardElement.dataset.cardId;
                if (cardId) {
                    await updateCardModalContent(cardId);
                    const modal = new bootstrap.Modal(document.getElementById('cardDetailModal'));
                    modal.show();
                }
            });
        });

    } catch (error) {
        console.error('Error en loadFeaturedCards:', error);
        showError(container, `Error al cargar las cartas destacadas: ${error.message}`);
    } finally {
        // Re-enable random button
        const randomBtn = document.getElementById('randomCardsBtn');
        if (randomBtn) {
            randomBtn.disabled = false;
            randomBtn.innerHTML = `<i class="bi bi-shuffle me-2"></i>Random`;
        }
    }
}

// Function to update expansion modal content
async function updateModalContent(setId) {
    const modal = document.getElementById('expansionModal');
    if (!modal) return;

    try {
        // Get set details
        const setResponse = await fetchFromApi(`/sets/${setId}`);
        const set = setResponse.data;
        
        if (!set) {
            throw new Error('Datos de set inválidos');
        }

        // Update basic set information
        document.getElementById('modalExpansionName').textContent = set.name;
        document.getElementById('modalExpansionImage').src = set.images.logo || set.images.symbol;
        document.getElementById('modalExpansionImage').alt = set.name;
        document.getElementById('modalExpansionReleaseDate').textContent = `Fecha de lanzamiento: ${formatDate(set.releaseDate)}`;
        document.getElementById('modalExpansionCardCount').textContent = `Número de cartas: ${set.printedTotal}`;
        document.getElementById('modalExpansionDescription').textContent = set.description || 'Información no disponible';

        // Get cards from this set
        const cardsResponse = await fetchFromApi('/cards', {
            q: `set.id:${setId}`,
            orderBy: 'random',
            pageSize: '6'
        });
        
        // Load featured cards
        const featuredCardsContainer = document.getElementById('modalFeaturedCards');
        if (cardsResponse.data && cardsResponse.data.length > 0) {
            featuredCardsContainer.innerHTML = cardsResponse.data.map(card => `
                <div class="col-md-4 col-sm-6">
                    <div class="card">
                        <img src="${card.images.small}" 
                            class="card-img-top" 
                            alt="${card.name}"
                            loading="lazy">
                    </div>
                </div>
            `).join('');
        } else {
            featuredCardsContainer.innerHTML = '<p>No se encontraron cartas para esta expansión</p>';
        }
    } catch (error) {
        console.error('Error loading set details:', error);
        showError(document.getElementById('modalFeaturedCards'), `Error al cargar los detalles de la expansión: ${error.message}`);
    }
}

// Retry loading function
async function retryLoading(button) {
    const container = button.closest('.alert').parentElement;
    if (container.id === 'featured-cards-container') {
        await loadFeaturedCards();
    } else if (container.id === 'expansions-container') {
        await loadExpansions();
    }
}

// Load expansions
async function loadExpansions() {
    const container = document.getElementById('expansions-container');
    if (!container) return;

    try {
        showLoading(container);
        
        // Get latest sets
        const response = await fetchFromApi('/sets', {
            orderBy: '-releaseDate',
            pageSize: '2'
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No se encontraron sets');
        }

        // Create HTML for sets
        container.innerHTML = response.data.map(set => createExpansionHtml(set)).join('');

        // Add click event listeners to expansion cards
        document.querySelectorAll('.expansion-card').forEach(card => {
            card.addEventListener('click', async () => {
                const setId = card.dataset.setId;
                if (setId) {
                    await updateModalContent(setId);
                    const modal = new bootstrap.Modal(document.getElementById('expansionModal'));
                    modal.show();
                }
            });
        });

    } catch (error) {
        console.error('Error loading sets:', error);
        showError(container, `Error al cargar las expansiones: ${error.message}`);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize carousel and other features
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
            showError(container, `Error al inicializar la aplicación: ${error.message}`);
        }
    }
});