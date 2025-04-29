// Game Configuration
const GAME_CONFIG = {
    floors: 10,
    floorHeight: 100,
    scenarios: {
        morningRush: { startFloor: 1, targetFloor: 8, crowdLevel: 'high', timeOfDay: 'morning' },
        lunchHour: { startFloor: 8, targetFloor: 5, crowdLevel: 'medium', timeOfDay: 'noon' },
        emergencyDrill: { startFloor: 8, targetFloor: 1, crowdLevel: 'high', timeOfDay: 'afternoon' },
        lateNight: { startFloor: 7, targetFloor: 1, crowdLevel: 'low', timeOfDay: 'night' }
    },
    liftTypes: {
        express: { stopPattern: [1, 5, 10], speed: 5, capacity: 8, color: '#4CAF50' },
        normal: { stopPattern: 'all', speed: 3, capacity: 6, color: '#2196F3' },
        smart: { stopPattern: 'dynamic', speed: 4, capacity: 6, color: '#9C27B0' },
        old: { stopPattern: 'all', speed: 2, capacity: 4, color: '#795548' }
    }
};

// Game State
let gameState = {
    currentScenario: 'morningRush',
    score: 0,
    timeElapsed: 0,
    delaysAvoided: 0,
    switchesMade: 0,
    powerUps: {
        priorityPass: false,
        maintenanceOverride: false,
        speedBoost: false
    }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize game elements
const lifts = [
    { id: 1, type: 'express', x: 80, y: 900, passengers: [], targetFloor: 1, status: 'idle', 
      doorOpen: false, maintenance: false, currentDelay: null },
    { id: 2, type: 'normal', x: 180, y: 900, passengers: [], targetFloor: 1, status: 'idle',
      doorOpen: false, maintenance: false, currentDelay: null },
    { id: 3, type: 'smart', x: 280, y: 900, passengers: [], targetFloor: 1, status: 'idle',
      doorOpen: false, maintenance: false, currentDelay: null },
    { id: 4, type: 'old', x: 380, y: 900, passengers: [], targetFloor: 1, status: 'idle',
      doorOpen: false, maintenance: false, currentDelay: null },
    { id: 5, type: 'express', x: 480, y: 900, passengers: [], targetFloor: 1, status: 'idle',
      doorOpen: false, maintenance: false, currentDelay: null }
];

let people = [];

class Passenger {
    constructor(name, startFloor, targetFloor, type = 'npc') {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.currentFloor = startFloor;
        this.targetFloor = targetFloor;
        this.type = type;
        this.inLift = null;
        this.waitingTime = 0;
        this.hasCart = Math.random() < 0.2;
        this.sprite = {
            hasBriefcase: Math.random() < 0.7,
            hasCoffee: Math.random() < 0.3,
            isSleepy: Math.random() < 0.2
        };
    }
}

// Random Events Generator
const randomEvents = {
    doorHold: () => ({ type: 'doorHold', delay: 10000, message: 'Someone is holding the door!' }),
    heavyCart: () => ({ type: 'heavyCart', delay: 5000, message: 'Heavy cart entering, slow door closing...' }),
    overcapacity: () => ({ type: 'overcapacity', delay: 0, message: 'Lift overcapacity!' }),
    powerFluctuation: () => ({ type: 'powerFluctuation', delay: 15000, message: 'Power fluctuation detected!' }),
    maintenance: () => ({ type: 'maintenance', delay: 0, message: 'Please vacate for maintenance' })
};

function applyRandomEvent(lift) {
    if (Math.random() < 0.1 && !lift.currentDelay) {
        const eventTypes = Object.keys(randomEvents);
        const randomEvent = randomEvents[eventTypes[Math.floor(Math.random() * eventTypes.length)]]();
        lift.currentDelay = randomEvent;
        updateStatus(`Lift ${lift.id}: ${randomEvent.message}`);
        return true;
    }
    return false;
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function calculateScore() {
    const baseScore = 1000 - gameState.timeElapsed;
    const delayBonus = gameState.delaysAvoided * 50;
    const switchPenalty = gameState.switchesMade * -30;
    return Math.max(0, baseScore + delayBonus + switchPenalty);
}

// Draw functions
function drawLiftTypeIndicator(lift) {
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    const typeSymbol = lift.type === 'express' ? '⚡' : 
                      lift.type === 'smart' ? '🧠' :
                      lift.type === 'normal' ? '⚪' : '🔧';
    ctx.fillText(typeSymbol, lift.x + 15, lift.y - 15);
}

function drawLifts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBuilding();
    
    lifts.forEach(lift => {
        // Draw lift shaft
        ctx.strokeStyle = '#333';
        ctx.strokeRect(lift.x - 5, 0, 50, canvas.height);
        
        // Draw lift
        ctx.fillStyle = GAME_CONFIG.liftTypes[lift.type].color;
        ctx.fillRect(lift.x, lift.y, 40, 60);
        
        // Draw lift type indicator
        drawLiftTypeIndicator(lift);
        
        // Draw door animation if door is open
        if (lift.doorOpen) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(lift.x + 5, lift.y + 5, 30, 50);
        }
        
        // Draw passengers
        lift.passengers.forEach((passenger, index) => {
            drawPassenger(passenger, lift.x + 10 + (index % 2) * 15, lift.y + 15 + Math.floor(index / 2) * 15);
        });
        
        // Draw status indicators
        if (lift.maintenance) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('🔧', lift.x + 15, lift.y - 5);
        }
        if (lift.currentDelay) {
            ctx.fillStyle = '#ff9800';
            ctx.fillText('⚠️', lift.x + 30, lift.y - 5);
        }
        
        // Draw capacity indicator
        const capacity = GAME_CONFIG.liftTypes[lift.type].capacity;
        const fillLevel = (lift.passengers.length / capacity) * 100;
        ctx.fillStyle = fillLevel > 80 ? '#ff0000' : fillLevel > 50 ? '#ff9800' : '#4CAF50';
        ctx.fillRect(lift.x, lift.y - 3, (lift.passengers.length / capacity) * 40, 2);
    });
}

function drawPassenger(passenger, x, y) {
    ctx.fillStyle = passenger.type === 'player' ? '#ff0000' : '#333';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    if (passenger.sprite.hasBriefcase) {
        ctx.fillStyle = '#795548';
        ctx.fillRect(x - 3, y + 6, 6, 4);
    }
    if (passenger.sprite.hasCoffee) {
        ctx.fillStyle = '#795548';
        ctx.fillText('☕', x + 6, y - 2);
    }
    if (passenger.sprite.isSleepy) {
        ctx.fillText('💤', x + 6, y - 6);
    }
}

function drawBuilding() {
    // Draw background elements based on time of day
    const timeOfDay = GAME_CONFIG.scenarios[gameState.currentScenario].timeOfDay;
    ctx.fillStyle = timeOfDay === 'night' ? '#1a237e' : 
                   timeOfDay === 'morning' ? '#bbdefb' :
                   timeOfDay === 'noon' ? '#03a9f4' : '#5c6bc0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw floors
    for (let i = 0; i < GAME_CONFIG.floors; i++) {
        const y = i * GAME_CONFIG.floorHeight;
        
        // Draw floor line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        
        // Draw floor number and special indicators
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        const floorNum = GAME_CONFIG.floors - i;
        let floorLabel = `Floor ${floorNum}`;
        
        // Add special floor indicators
        if (gameState.currentScenario === 'lunchHour' && floorNum === 5) {
            floorLabel += ' 🍽️ Cafeteria';
        } else if (floorNum === 1) {
            floorLabel += ' 🚪 Lobby';
        }
        
        ctx.fillText(floorLabel, 10, y + 20);
        
        // Highlight player's target floor
        const player = people.find(p => p.type === 'player');
        if (player && player.targetFloor === floorNum) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fillRect(0, y, canvas.width, GAME_CONFIG.floorHeight);
        }
        
        // Draw waiting NPCs on each floor
        const waitingNPCs = people.filter(p => 
            p.type === 'npc' && 
            !p.inLift && 
            p.currentFloor === floorNum
        );
        
        waitingNPCs.forEach((npc, index) => {
            drawPassenger(npc, 40 + (index * 20), y + GAME_CONFIG.floorHeight - 20);
        });
    }
}

function updateLifts() {
    lifts.forEach(lift => {
        // Reset stuck lifts (specifically for lifts 2 and 3)
        if ((lift.id === 2 || lift.id === 3) && 
            Math.abs(lift.y - (600 - 4 * 100)) < 5 && 
            !lift.passengers.length) {
            
            lift.maintenance = false;
            lift.currentDelay = null;
            lift.doorOpen = false;
            
            // Assign new random target floor
            lift.targetFloor = Math.floor(Math.random() * 10) + 1;
            if (lift.targetFloor === 4) { // Avoid same floor
                lift.targetFloor = lift.targetFloor === 10 ? 1 : lift.targetFloor + 1;
            }
        }

        const liftConfig = GAME_CONFIG.liftTypes[lift.type];
        const currentFloor = 10 - Math.floor(lift.y / 100);
        
        // Skip if maintenance or delay
        if (lift.maintenance || lift.currentDelay) {
            return;
        }

        // Move lift if it has passengers or a target floor
        if (lift.passengers.length > 0 || lift.targetFloor !== currentFloor) {
            const targetY = 1000 - (lift.targetFloor * 100);
            const speed = liftConfig.speed * (gameState.powerUps.speedBoost ? 1.5 : 1);
            
            // Move towards target floor
            if (Math.abs(lift.y - targetY) > speed) {
                lift.y += lift.y > targetY ? -speed : speed;
            } else {
                lift.y = targetY;
                
                // Open doors at destination
                if (!lift.doorOpen) {
                    lift.doorOpen = true;
                    setTimeout(() => {
                        lift.doorOpen = false;
                        
                        // Drop off passengers at current floor
                        const droppedPassengers = lift.passengers.filter(p => p.targetFloor === currentFloor);
                        lift.passengers = lift.passengers.filter(p => p.targetFloor !== currentFloor);
                        
                        droppedPassengers.forEach(passenger => {
                            if (passenger.type === 'player') {
                                updateStatus(`Player arrived at floor ${currentFloor}`);
                                if (currentFloor === GAME_CONFIG.scenarios[gameState.currentScenario].targetFloor) {
                                    gameState.gameOver = true;
                                    updateStatus(`Level Complete! Score: ${calculateScore()}`);
                                }
                            }
                        });
                    }, lift.type === 'old' ? 3000 : 1500);
                }
            }
        } else {
            // Idle behavior based on lift type
            if (lift.type === 'smart') {
                // Smart lifts patrol near floors with waiting passengers
                const waitingPassengers = people.filter(p => !p.inLift);
                if (waitingPassengers.length > 0) {
                    const nearestPassenger = waitingPassengers.reduce((nearest, p) => {
                        const distance = Math.abs(p.currentFloor - currentFloor);
                        return (!nearest || distance < Math.abs(nearest.currentFloor - currentFloor)) ? p : nearest;
                    });
                    lift.targetFloor = nearestPassenger.currentFloor;
                }
            } else if (lift.type === 'express') {
                // Express lifts move between express floors
                lift.targetFloor = currentFloor >= 5 ? 1 : 10;
            }
        }
    });
    
    drawLifts();
}

function handleLiftSelection(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    const clickedLift = lifts.find(lift =>
        clickX >= lift.x && clickX <= lift.x + 40 &&
        clickY >= lift.y && clickY <= lift.y + 40
    );

    if (clickedLift) {
        if (clickedLift.maintenance) {
            updateStatus(`Lift ${clickedLift.id} is under maintenance!`);
            return;
        }

        const player = people.find(p => p.type === 'player');
        const currentFloor = 10 - Math.floor(clickedLift.y / 100);

        if (!player.inLift) {
            // Player entering lift
            if (clickedLift.passengers.length >= GAME_CONFIG.liftTypes[clickedLift.type].capacity) {
                updateStatus('Lift is at full capacity!');
                return;
            }

            if (currentFloor === player.currentFloor) {
                player.inLift = clickedLift;
                clickedLift.passengers.push(player);
                clickedLift.targetFloor = player.targetFloor;
                updateStatus(`Entered ${clickedLift.type} lift ${clickedLift.id}`);
            }
        } else if (player.inLift === clickedLift && clickedLift.doorOpen) {
            // Player exiting lift
            player.inLift = null;
            player.currentFloor = currentFloor;
            clickedLift.passengers = clickedLift.passengers.filter(p => p !== player);
            updateStatus(`Exited lift at floor ${currentFloor}`);
            gameState.switchesMade++;
        }
    }
}

function handleKeyPress(event) {
    if (gameState.gameOver) return;

    const player = people.find(p => p.type === 'player');
    
    switch(event.key) {
        case 'p':
            usePowerUp('priorityPass');
            break;
        case 'm':
            usePowerUp('maintenanceOverride');
            break;
        case 's':
            usePowerUp('speedBoost');
            break;
        case 'Escape':
            if (player.inLift) {
                // Try to exit current lift if at a floor
                const currentLift = player.inLift;
                const currentFloor = 10 - Math.floor(currentLift.y / 100);
                if (currentLift.doorOpen) {
                    player.inLift = null;
                    player.currentFloor = currentFloor;
                    currentLift.passengers = currentLift.passengers.filter(p => p !== player);
                    updateStatus(`Emergency exit at floor ${currentFloor}`);
                    gameState.switchesMade++;
                }
            }
            break;
    }
}

function usePowerUp(type) {
    if (!gameState.powerUps[type]) {
        updateStatus(`${type} not available!`);
        return;
    }

    switch (type) {
        case 'priorityPass':
            const player = people.find(p => p.type === 'player');
            if (player.inLift) {
                player.inLift.targetFloor = player.targetFloor;
                player.inLift.passengers = player.inLift.passengers
                    .filter(p => p.type === 'player' || p.targetFloor === player.targetFloor);
                updateStatus('Priority Pass: Express route to destination!');
            }
            break;

        case 'maintenanceOverride':
            lifts.forEach(lift => {
                if (lift.maintenance) {
                    lift.maintenance = false;
                    lift.currentDelay = null;
                }
            });
            updateStatus('Maintenance Override: All lifts operational!');
            break;

        case 'speedBoost':
            const originalSpeeds = {};
            lifts.forEach(lift => {
                originalSpeeds[lift.id] = GAME_CONFIG.liftTypes[lift.type].speed;
                GAME_CONFIG.liftTypes[lift.type].speed *= 1.5;
            });
            updateStatus('Speed Boost: All lifts moving faster!');
            
            setTimeout(() => {
                lifts.forEach(lift => {
                    GAME_CONFIG.liftTypes[lift.type].speed = originalSpeeds[lift.id];
                });
                updateStatus('Speed Boost wore off');
            }, 10000);
            break;
    }

    // Consume the power-up
    gameState.powerUps[type] = false;
    const element = document.getElementById(type);
    if (element) {
        element.classList.remove('available');
    }
}

function generateNPCs() {
    if (gameState.gameOver) return;
    
    const scenarioConfig = GAME_CONFIG.scenarios[gameState.currentScenario];
    const maxNPCs = scenarioConfig.crowdLevel === 'high' ? 8 : 
                    scenarioConfig.crowdLevel === 'medium' ? 5 : 2;
    
    const currentNPCs = people.filter(p => p.type === 'npc').length;
    
    if (currentNPCs < maxNPCs && Math.random() < 0.3) {
        const startFloor = Math.floor(Math.random() * 10) + 1;
        let targetFloor;
        do {
            targetFloor = Math.floor(Math.random() * 10) + 1;
        } while (targetFloor === startFloor);
        
        const npc = new Passenger(
            `NPC${Math.floor(Math.random() * 1000)}`,
            startFloor,
            targetFloor,
            'npc'
        );
        people.push(npc);
        
        // Try to assign NPC to an appropriate lift
        const availableLifts = lifts.filter(l => 
            l.passengers.length < GAME_CONFIG.liftTypes[l.type].capacity &&
            !l.maintenance &&
            !l.currentDelay
        );
        
        if (availableLifts.length > 0) {
            const bestLift = availableLifts.reduce((best, lift) => {
                const liftFloor = 10 - Math.floor(lift.y / 100);
                const distance = Math.abs(liftFloor - startFloor);
                return (!best || distance < Math.abs(10 - Math.floor(best.y / 100) - startFloor)) ? lift : best;
            });
            
            if (bestLift) {
                npc.inLift = bestLift;
                bestLift.passengers.push(npc);
                if (bestLift.passengers.length === 1) {
                    bestLift.targetFloor = startFloor;
                }
            }
        }
    }
}

// Game loop
function gameLoop() {
    updateLifts();
    updateGameState();
    requestAnimationFrame(gameLoop);
}

function updateGameState() {
    if (!gameState.gameOver) {
        gameState.timeElapsed += 1/60; // Assuming 60 FPS
        
        // Update UI elements
        document.getElementById('timer').textContent = `Time: ${Math.floor(gameState.timeElapsed)}s`;
        document.getElementById('score').textContent = `Score: ${calculateScore()}`;
        
        // Update power-up UI
        Object.keys(gameState.powerUps).forEach(powerUp => {
            const element = document.getElementById(powerUp);
            if (element) {
                element.classList.toggle('available', gameState.powerUps[powerUp]);
            }
        });
        
        // Check win condition
        const player = people.find(p => p.type === 'player');
        if (player && !player.inLift && 
            player.currentFloor === GAME_CONFIG.scenarios[gameState.currentScenario].targetFloor) {
            gameState.gameOver = true;
            const finalScore = calculateScore();
            updateStatus(`Level Complete! Final Score: ${finalScore}`);
            
            // Unlock power-up based on score
            if (finalScore > 800) {
                const availablePowerUps = ['priorityPass', 'maintenanceOverride', 'speedBoost'];
                const unlockedPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
                gameState.powerUps[unlockedPowerUp] = true;
                updateStatus(`Bonus: Unlocked ${unlockedPowerUp}!`);
            }
        }
    }
}

// Start the game
function initGame(scenario = 'morningRush') {
    gameState = {
        currentScenario: scenario,
        score: 0,
        timeElapsed: 0,
        delaysAvoided: 0,
        switchesMade: 0,
        powerUps: {
            priorityPass: false,
            maintenanceOverride: false,
            speedBoost: false
        }
    };
    
    // Initialize people array with player and NPCs based on scenario
    const scenarioConfig = GAME_CONFIG.scenarios[scenario];
    const player = new Passenger('Player', scenarioConfig.startFloor, scenarioConfig.targetFloor, 'player');
    
    // Clear existing people and add new ones
    people = [player];
    
    // Add NPCs based on crowd level
    const npcCount = scenarioConfig.crowdLevel === 'high' ? 8 : 
                    scenarioConfig.crowdLevel === 'medium' ? 5 : 2;
                    
    for (let i = 0; i < npcCount; i++) {
        const startFloor = Math.floor(Math.random() * 10) + 1;
        const targetFloor = Math.floor(Math.random() * 10) + 1;
        if (startFloor !== targetFloor) {
            const npc = new Passenger(`NPC${i}`, startFloor, targetFloor, 'npc');
            people.push(npc);
        }
    }
    
    // Reset lifts
    lifts.forEach(lift => {
        lift.passengers = [];
        lift.targetFloor = 1;
        lift.status = 'idle';
        lift.doorOpen = false;
        lift.maintenance = false;
        lift.currentDelay = null;
        lift.y = 900;
    });
    
    // Distribute NPCs among lifts to ensure parallel movement
    const npcs = people.filter(p => p.type === 'npc');
    lifts.forEach((lift, index) => {
        // Assign 1-2 NPCs to each lift initially
        const liftNPCs = npcs.slice(index * 2, index * 2 + 2);
        liftNPCs.forEach(npc => {
            if (lift.passengers.length < GAME_CONFIG.liftTypes[lift.type].capacity) {
                npc.inLift = lift;
                lift.passengers.push(npc);
            }
        });
        
        // Set initial target floor based on passengers or random floor
        if (lift.passengers.length > 0) {
            lift.targetFloor = lift.passengers[0].targetFloor;
        } else {
            lift.targetFloor = Math.floor(Math.random() * 10) + 1;
        }
        
        lift.status = 'moving';
    });
    
    // Start the game loop if not already running
    if (!gameLoop.isRunning) {
        gameLoop.isRunning = true;
        gameLoop();
    }
    
    // Start NPC generation if not already started
    if (!window.npcGenerator) {
        window.npcGenerator = setInterval(generateNPCs, 5000);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    canvas.addEventListener('click', handleLiftSelection);
    document.addEventListener('keydown', handleKeyPress);
    
    // Power-up buttons
    const powerUps = document.querySelectorAll('.power-up');
    powerUps.forEach(powerUp => {
        powerUp.addEventListener('click', (e) => {
            const powerUpType = e.target.id;
            usePowerUp(powerUpType);
        });
    });
    
    // Scenario selector
    const scenarioSelector = document.getElementById('scenario-selector');
    if (scenarioSelector) {
        scenarioSelector.addEventListener('change', (e) => {
            initGame(e.target.value);
        });
    }
    
    // Start the initial game
    initGame('morningRush');
});

// Initialize NPCs generation
const npcGenerator = setInterval(generateNPCs, 5000);

// Make sure the game loop starts
gameLoop();
gameLoop.isRunning = true;