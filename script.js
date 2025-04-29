const lifts = [
    { id: 1, x: 50, y: 500, color: 'green', speed: 'fast', passengers: [] },
    { id: 2, x: 150, y: 500, color: 'orange', speed: 'medium', passengers: [] },
    { id: 3, x: 250, y: 500, color: 'red', speed: 'slow', passengers: [] }
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const liftTypes = {
    express: { stops: [0, 5], speed: 'fast' },
    normal: { stops: [0, 1, 2, 3, 4, 5], speed: 'medium' },
    smart: { stops: [], speed: 'fast', algorithm: true },
    slow: { stops: [0, 1, 2, 3, 4, 5], speed: 'slow' }
};

const events = [
    { name: 'Door Held', delay: 10000 },
    { name: 'Heavy Cart', delay: 5000 },
    { name: 'Overcapacity', delay: 0, condition: (lift) => lift.passengers.length > 4 },
    { name: 'Power Fluctuation', delay: 15000 },
    { name: 'Maintenance', delay: 0, action: (lift) => lift.maintenance = true }
];

function simulateLiftBehavior(lift) {
    if (lift.maintenance) {
        document.getElementById('status').textContent = `Lift ${lift.id} is under maintenance. Please switch.`;
        return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    if (randomEvent.condition && randomEvent.condition(lift)) {
        document.getElementById('status').textContent = `Event: ${randomEvent.name}. Lift ${lift.id} cannot move.`;
        return;
    }

    if (randomEvent.delay > 0) {
        document.getElementById('status').textContent = `Event: ${randomEvent.name}. Lift ${lift.id} delayed by ${randomEvent.delay / 1000} seconds.`;
        setTimeout(() => {
            moveLift(lift);
        }, randomEvent.delay);
    } else {
        moveLift(lift);
    }
}

function moveLift(lift) {
    const targetFloor = people.find(person => person.inLift === lift)?.targetFloor;
    if (targetFloor !== undefined) {
        const targetY = 500 - targetFloor * 100;
        lift.y = targetY;
        drawLifts();
        document.getElementById('status').textContent = `Lift ${lift.id} reached floor ${targetFloor}.`;
    }
}

function drawLifts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lifts.forEach(lift => {
        ctx.fillStyle = lift.color;
        ctx.fillRect(lift.x, lift.y, 40, 40);
        ctx.fillStyle = 'black';
        ctx.fillText(`Lift ${lift.id}`, lift.x, lift.y - 10);
    });
}

function drawPeople() {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = 'People in the building:<br>';
    people.forEach(person => {
        const liftInfo = person.inLift ? `in Lift ${person.inLift.id}` : 'waiting';
        statusDiv.innerHTML += `${person.name} (Target Floor: ${person.targetFloor}) - ${liftInfo}<br>`;
    });
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    selectedLift = lifts.find(lift =>
        clickX >= lift.x && clickX <= lift.x + 40 &&
        clickY >= lift.y && clickY <= lift.y + 40
    );

    if (selectedLift) {
        const player = people.find(person => person.name === 'Player');
        if (player.inLift === null) {
            player.inLift = selectedLift;
            document.getElementById('status').textContent = `Player entered Lift ${selectedLift.id}.`;
        } else {
            const currentFloor = 5 - Math.floor(selectedLift.y / 100);
            if (currentFloor === player.targetFloor) {
                player.inLift = null;
                document.getElementById('status').textContent = `Player exited Lift ${selectedLift.id} at floor ${currentFloor}.`;
            } else {
                document.getElementById('status').textContent = `Player cannot exit. Target floor is ${player.targetFloor}.`;
            }
        }
    }
});

function simulateLiftMovement() {
    lifts.forEach(lift => {
        if (lift.passengers && lift.passengers.length > 0) {
            const targetFloor = lift.passengers[0].targetFloor;
            const targetY = 500 - targetFloor * 100;

            if (lift.y > targetY) {
                lift.y -= 2; // Move up
            } else if (lift.y < targetY) {
                lift.y += 2; // Move down
            } else {
                // Drop off passengers
                lift.passengers = lift.passengers.filter(p => p.targetFloor !== targetFloor);
            }
        }
    });
    drawLifts();
    requestAnimationFrame(simulateLiftMovement);
}

lifts.forEach(lift => lift.passengers = []); // Initialize passengers array for each lift
simulateLiftMovement();