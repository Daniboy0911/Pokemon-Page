// Estado de la aplicación
const state = {
    games: [],
    filters: {
    generation: 'all',
    year: 'all',
    region: 'all'
    }
};

// Funciones de utilidad
const createNode = (type, className, content = '') => {
    const node = document.createElement(type);
    if (className) node.className = className;
    if (content) node.innerHTML = content;
    return node;
};

const createOption = (value, text) => {
    const option = document.createElement('option');
    option.value = value.toLowerCase();
    option.textContent = text;
    return option;
};

// Funciones de filtrado
const applyFilters = (game) => {
    const { generation, year, region } = state.filters;
    return (generation === 'all' || game.generation.toLowerCase().includes(generation)) &&
           (year === 'all' || game.year === year) &&
           (region === 'all' || game.region.toLowerCase() === region.toLowerCase());
};

// Funciones de renderizado
const createGameCard = (game) => {
    const card = createNode('div', 'col-md-4 col-lg-3 mb-4');
        card.innerHTML = `
        <div class="game-card card h-100" role="button" onclick="showGameDetails('${game.id}')">
            <img src="${game.image}" class="card-img-top game-cover" 
                 alt="Portada de ${game.name}" 
                 onerror="this.src='images/placeholder.svg'">
                <div class="card-body">
                    <h5 class="card-title">${game.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${game.generation} Generación - ${game.year}</h6>
                <div class="region-badge">${game.region}</div>
            </div>
        </div>
    `;
    return card;
};

const createGameModal = (game) => {
    return `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${game.name}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <img src="${game.image}" class="game-details-image" 
                         alt="Portada de ${game.name}" 
                         onerror="this.src='images/placeholder.svg'">
                    <div class="game-info">
                        <div class="badges mb-3">
                            <span class="badge badge-generation">${game.generation} Generación</span>
                            <span class="badge badge-version">${game.year}</span>
                            <span class="region-badge">Región: ${game.region}</span>
                        </div>
                        <p class="game-description">${game.description}</p>
                    </div>
                    <div class="features-list mt-4">
                        <h6>Características principales:</h6>
                        <ul>${game.features.map(feature => `<li>${feature}</li>`).join('')}</ul>
                    </div>
                    <div class="innovation-box mt-4">
                        <h6>Innovaciones:</h6>
                        <p>${game.innovations}</p>
                    </div>
                    ${game.legendary ? `
                    <div class="legendary-box mt-4">
                        <h6>Pokémon Legendario:</h6>
                        <p>${game.legendary}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    `;
};

// Funciones de inicialización de filtros
const initializeFilters = () => {
    const uniqueValues = {
        generation: new Set(),
        year: new Set(),
        region: new Set()
    };

    state.games.forEach(game => {
        uniqueValues.generation.add(game.generation);
        uniqueValues.year.add(game.year);
        uniqueValues.region.add(game.region);
    });

    Object.entries(uniqueValues).forEach(([filterType, values]) => {
        populateFilter(filterType + 'Filter', Array.from(values).sort());
    });
};

const populateFilter = (filterId, options) => {
    const select = document.getElementById(filterId);
    select.innerHTML = '<option value="all">Todos</option>';
    options.forEach(option => select.appendChild(createOption(option, option)));
};

// Funciones principales
const updateFilter = (filterType, value) => {
    state.filters[filterType] = value;
    displayGames();
};

const displayGames = () => {
    const container = document.getElementById('gamesContainer');
    const filteredGames = state.games.filter(applyFilters);
    
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    filteredGames.forEach(game => fragment.appendChild(createGameCard(game)));
    container.appendChild(fragment);
};

const showGameDetails = (gameId) => {
    const game = state.games.find(g => g.id === gameId);
    if (!game) return;

    const modalElement = document.getElementById('gameDetailsModal');
    modalElement.innerHTML = createGameModal(game);
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
};

// Inicialización
const initializeApp = async () => {
    try {
        const response = await fetch('data/games.json');
        const data = await response.json();
        state.games = data.mainGames;
        initializeFilters();
    displayGames();
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        document.getElementById('gamesContainer').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Error al cargar los datos de los juegos. Por favor, recarga la página.
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', initializeApp); 