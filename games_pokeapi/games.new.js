// Base URLs for APIs
const RAWG_API_BASE_URL = 'https://api.rawg.io/api';
const RAWG_API_KEY = '1bb9d39bed0b4eee98daa03f64b8b38a';

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

// Función para obtener los juegos de Pokémon
async function fetchPokemonGames() {
    try {
        const response = await fetch(`${RAWG_API_BASE_URL}/games?key=${RAWG_API_KEY}&search=pokemon&ordering=-released&page_size=40`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Filtrar solo juegos oficiales de Pokémon
        let officialGames = data.results.filter(game => 
            game.name.toLowerCase().includes('pokémon') || 
            game.name.toLowerCase().includes('pokemon')
        );

        // Obtener detalles adicionales para cada juego oficial
        const detailedOfficialGames = await Promise.all(
            officialGames.map(async game => {
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
                        metacritic: detailData.metacritic,
                        type: 'official'
                    };
                } catch (error) {
                    console.error(`Error fetching details for game ${game.id}:`, error);
                    return { ...game, type: 'official' };
                }
            })
        );

        // Actualizar los datos
        gamesData.games = detailedOfficialGames;
        
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

    } catch (error) {
        console.error('Error fetching Pokemon games:', error);
        throw error;
    }
}

// Función para mostrar los juegos
function displayGames() {
    const container = document.getElementById('gamesGrid');
    if (!container) return;

    // Generar HTML para cada juego
    const gamesHtml = gamesData.games.map(game => {
        const imageUrl = game.background_image;
        const releaseDate = game.released || 'Fecha no disponible';
        const platforms = game.platforms?.map(p => p.platform.name).join(', ') || 'Plataformas no especificadas';

        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-image">
                    <img src="${imageUrl}" 
                         alt="${game.name}" 
                         loading="lazy"
                         onerror="this.src='https://placehold.co/600x400/png?text=No+Image'">
                </div>
                <div class="game-content">
                    <h3>${game.name}</h3>
                    <div class="game-info">
                        <p class="release-date">${releaseDate}</p>
                        <p class="platforms">${platforms}</p>
                    </div>
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