// Base URLs for APIs
const RAWG_API_BASE_URL = 'https://api.rawg.io/api';
const RAWG_API_KEY = '1bb9d39bed0b4eee98daa03f64b8b38a';

// Lista de publishers oficiales de Pokémon
const OFFICIAL_POKEMON_PUBLISHERS = [
    'Nintendo',
    'The Pokémon Company',
    'Game Freak',
    'Creatures Inc.',
    'The Pokemon Company'
];

// Objeto para almacenar datos de los juegos
const gamesData = {
    games: [],
    platforms: [],
    developers: [],
    publishers: []
};

// Función para mostrar mensajes de depuración
function showDebug(message) {
    console.log('Debug:', message);
    const debug = document.getElementById('debug');
    if (debug) {
        debug.textContent = message;
        debug.style.display = 'block';
        setTimeout(() => {
            debug.style.display = 'none';
        }, 5000);
    }
}

// Función para mostrar el estado de carga
function showLoading() {
    console.log('Mostrando loading...');
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    } else {
        console.error('Elemento loading no encontrado');
    }
}

// Función para ocultar el estado de carga
function hideLoading() {
    console.log('Ocultando loading...');
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    } else {
        console.error('Elemento loading no encontrado');
    }
}

// Función para mostrar error
function showError(message) {
    console.error('Mostrando error:', message);
    const error = document.getElementById('error');
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
    } else {
        console.error('Elemento error no encontrado');
    }
}

// Función para verificar si un juego es oficial
function isOfficialPokemonGame(game) {
    // Verificar el nombre del juego (debe contener Pokémon/Pokemon)
    const hasValidName = game.name.toLowerCase().includes('pokémon') || 
                        game.name.toLowerCase().includes('pokemon');

    // Verificar publishers
    const hasOfficialPublisher = game.publishers?.some(pub => 
        OFFICIAL_POKEMON_PUBLISHERS.includes(pub.name)
    );

    // Excluir nombres que sugieren que es un juego no oficial
    const hasUnwantedTerms = game.name.toLowerCase().includes('fan') ||
                            game.name.toLowerCase().includes('hack') ||
                            game.name.toLowerCase().includes('rom') ||
                            game.name.toLowerCase().includes('mod');

    return hasValidName && hasOfficialPublisher && !hasUnwantedTerms;
}

// Función para obtener los juegos de Pokémon
async function fetchPokemonGames() {
    try {
        const response = await fetch(`${RAWG_API_BASE_URL}/games?key=${RAWG_API_KEY}&search=pokemon&ordering=-released&page_size=40`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Obtener todos los juegos que contengan Pokémon en el nombre
        const pokemonGames = data.results.filter(game => 
            game.name.toLowerCase().includes('pokémon') || 
            game.name.toLowerCase().includes('pokemon')
        );

        // Obtener detalles adicionales para cada juego
        const detailedGames = await Promise.all(
            pokemonGames.map(async game => {
                try {
                    const detailResponse = await fetch(`${RAWG_API_BASE_URL}/games/${game.id}?key=${RAWG_API_KEY}`);
                    if (!detailResponse.ok) {
                        throw new Error(`HTTP error! status: ${detailResponse.status}`);
                    }
                    const detailData = await detailResponse.json();
                    return {
                        ...game,
                        description: detailData.description_raw,
                        developers: detailData.developers,
                        publishers: detailData.publishers,
                        platforms: detailData.platforms,
                        screenshots: detailData.screenshots,
                        website: detailData.website,
                        esrb_rating: detailData.esrb_rating,
                        metacritic: detailData.metacritic
                    };
                } catch (error) {
                    console.error(`Error fetching details for game ${game.id}:`, error);
                    return null;
                }
            })
        );

        // Filtrar juegos nulos y sin descripción
        const validGames = detailedGames.filter(game => 
            game !== null && 
            game.description && 
            game.description.trim() !== '' && 
            game.description !== 'No hay descripción disponible'
        );

        // Actualizar los datos
        gamesData.games = validGames;
        
        // Extraer desarrolladores y publishers únicos
        const developers = new Set();
        const publishers = new Set();
        const platforms = new Set();

        gamesData.games.forEach(game => {
            game.developers?.forEach(dev => developers.add(dev.name));
            game.publishers?.forEach(pub => publishers.add(pub.name));
            game.platforms?.forEach(platform => platforms.add(platform.platform.name));
        });

        gamesData.developers = Array.from(developers);
        gamesData.publishers = Array.from(publishers);
        gamesData.platforms = Array.from(platforms);

        // Mostrar mensaje de depuración con la cantidad de juegos
        showDebug(`Se encontraron ${validGames.length} juegos con descripción de un total de ${pokemonGames.length} juegos de Pokémon`);

    } catch (error) {
        console.error('Error fetching Pokemon games:', error);
        throw error;
    }
}

// Función para formatear la puntuación de Metacritic
function formatMetacriticScore(score) {
    if (!score) return 'No disponible';
    const color = score >= 75 ? 'text-success' :
                 score >= 50 ? 'text-warning' :
                 'text-danger';
    return `<span class="${color} fw-bold">${score}</span>`;
}

// Función para formatear la fecha
function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para formatear las plataformas
function formatPlatforms(platforms) {
    if (!platforms || platforms.length === 0) return 'Plataformas no especificadas';
    // Limitar a 3 plataformas y añadir "y más" si hay más
    const platformNames = platforms.map(p => p.platform.name);
    if (platformNames.length > 3) {
        return `${platformNames.slice(0, 3).join(', ')} y ${platformNames.length - 3} más`;
    }
    return platformNames.join(', ');
}

// Función para mostrar los detalles del juego en el modal
async function showGameDetails(gameId) {
    try {
        showLoading();
        const game = gamesData.games.find(g => g.id === gameId);
        
        if (!game) {
            throw new Error('Juego no encontrado');
        }

        // Actualizar el contenido del modal
        document.getElementById('gameTitle').textContent = game.name;
        
        // Imagen principal del juego
        const gameImage = document.getElementById('gameImage');
        if (game.background_image && game.background_image !== 'https://placehold.co/600x400/png?text=No+Image') {
            gameImage.src = game.background_image;
            gameImage.alt = game.name;
        } else {
            gameImage.parentElement.innerHTML = generateNoImageBanner(game);
        }

        // Información básica
        document.getElementById('gameReleaseDate').textContent = formatDate(game.released);
        document.getElementById('gamePlatforms').textContent = formatPlatforms(game.platforms);
        document.getElementById('gameDevelopers').textContent = game.developers?.map(d => d.name).join(', ') || 'No especificado';
        document.getElementById('gamePublishers').textContent = game.publishers?.map(p => p.name).join(', ') || 'No especificado';
        
        // Metacritic con formato y color
        document.getElementById('gameMetacritic').innerHTML = formatMetacriticScore(game.metacritic);

        // Descripción con formato
        const descriptionElement = document.getElementById('gameDescription');
        descriptionElement.innerHTML = game.description || 'No hay descripción disponible';
        
        // Capturas de pantalla
        const screenshotsContainer = document.querySelector('.screenshots-grid');
        if (game.screenshots && game.screenshots.length > 0) {
            screenshotsContainer.innerHTML = game.screenshots
                .map(screenshot => `
                    <div class="screenshot" onclick="showFullscreenImage('${screenshot.image}')">
                        <img src="${screenshot.image}" 
                             alt="Captura de pantalla de ${game.name}"
                             loading="lazy"
                             class="img-fluid"
                             onerror="this.src='https://placehold.co/400x225/png?text=No+Image'">
                    </div>
                `).join('');
        } else {
            screenshotsContainer.innerHTML = '<p class="no-screenshots">No hay capturas de pantalla disponibles</p>';
        }

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('gameDetailsModal'));
        modal.show();
        
        hideLoading();
    } catch (error) {
        console.error('Error showing game details:', error);
        showError('Error al cargar los detalles del juego');
        hideLoading();
    }
}

// Función para mostrar imagen en pantalla completa
function showFullscreenImage(imageUrl) {
    const fullscreenImage = document.getElementById('fullscreenImage');
    fullscreenImage.src = imageUrl;
    const fullscreenModal = new bootstrap.Modal(document.getElementById('fullscreenImageModal'));
    fullscreenModal.show();
}

// Función para generar el HTML del banner sin imagen
function generateNoImageBanner(game) {
    return `
        <div class="no-image-banner">
            <div class="main-pokeball">
                <div class="pokeball-top"></div>
                <div class="pokeball-bottom"></div>
                <div class="pokeball-line"></div>
                <div class="pokeball-center"></div>
            </div>
            <div class="pokemon-items">
                <div class="pokemon-item item-pokeball"></div>
                <div class="pokemon-item item-pikachu"></div>
                <div class="pokemon-item item-star"></div>
                <div class="pokemon-item item-badge"></div>
            </div>
            <div class="sparkle"></div>
            <div class="sparkle"></div>
            <div class="sparkle"></div>
            <div class="sparkle"></div>
        </div>
    `;
}

// Función para manejar errores de carga de imagen
function handleImageError(img, game) {
    img.parentElement.innerHTML = generateNoImageBanner(game);
}

// Función para mostrar los juegos
function displayGames() {
    const container = document.getElementById('gamesGrid');
    if (!container) return;

    // Generar HTML para cada juego
    const gamesHtml = gamesData.games.map(game => {
        const hasImage = game.background_image && game.background_image !== 'https://placehold.co/600x400/png?text=No+Image';

        return `
            <div class="game-card" onclick="showGameDetails(${game.id})">
                <div class="game-image">
                    ${hasImage ? 
                        `<img src="${game.background_image}" 
                             alt="${game.name}" 
                             loading="lazy"
                             data-game-id="${game.id}"
                             onerror="handleImageError(this, ${JSON.stringify(game)})">`
                        : generateNoImageBanner(game)}
                </div>
                <div class="game-details">
                    <h3 class="game-title" title="${game.name}">${game.name}</h3>
                    <div class="game-metadata">
                        <div class="metadata-item">
                            <i class="bi bi-calendar3"></i>
                            <span>${formatDate(game.released)}</span>
                        </div>
                        <div class="metadata-item">
                            <i class="bi bi-controller"></i>
                            <span>${formatPlatforms(game.platforms)}</span>
                        </div>
                    </div>
                    ${game.metacritic ? `
                        <div class="metacritic-badge ${
                            game.metacritic >= 75 ? 'high' : 
                            game.metacritic >= 50 ? 'medium' : 
                            'low'
                        }">
                            <span class="metacritic-score">${game.metacritic}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Actualizar el contenedor
    container.innerHTML = gamesHtml || '<p class="no-results">No se encontraron juegos.</p>';
}

// Función para inicializar la página
async function initGamesPage() {
    try {
        showDebug('Iniciando la página de juegos...');
        showLoading();
        await fetchPokemonGames();
        displayGames();
        hideLoading();
        showDebug('Inicialización completada');
    } catch (error) {
        console.error('Error initializing games page:', error);
        showError('Error al cargar los datos de los juegos');
        hideLoading();
    }
}

// Inicializar la página cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    showDebug('DOM cargado, inicializando página...');
    initGamesPage();
}); 