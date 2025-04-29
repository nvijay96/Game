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
        player.inLift = selectedLift;
        document.getElementById('status').textContent = `Player entered Lift ${selectedLift.id}. Use Arrow keys to move.`;
    }
});

document.addEventListener('keydown', (event) => {
    if (!selectedLift) {
        document.getElementById('status').textContent = 'Please select a lift first!';
        return;
    }

    const speed = selectedLift.speed;
    let delay = 0;

    if (speed === 'medium') delay = 500;
    if (speed === 'slow') delay = 1000;

    if (event.key === 'ArrowUp') {
        moveLift(-100, delay);
    } else if (event.key === 'ArrowDown') {
        moveLift(100, delay);
    }
});

function moveLift(deltaY, delay) {
    setTimeout(() => {
        const newY = selectedLift.y + deltaY;

        if (newY >= 0 && newY <= 500) {
            selectedLift.y = newY;
            drawLifts();

            const floor = 5 - Math.floor(newY / 100);
            document.getElementById('status').textContent = `Lift ${selectedLift.id} is on floor ${floor}`;

            // Check if people need to get off
            people.forEach(person => {
                if (person.inLift === selectedLift && person.targetFloor === floor) {
                    person.inLift = null;
                    document.getElementById('status').textContent += ` ${person.name} got off at floor ${floor}.`;
                    if (person.name === 'Player') {
                        updateScore(100); // Bonus for reaching the target floor
                    } else {
                        updateScore(50); // Points for helping others reach their floor
                    }
                }
            });

            checkGameEnd();
        } else {
            document.getElementById('status').textContent = `Lift ${selectedLift.id} cannot move further in that direction.`;
        }

        drawPeople();
    }, delay);
}

let timer = 0;
let timerInterval;
let score = 0;

function startTimer() {
    timer = 0;
    timerInterval = setInterval(() => {
        timer++;
        document.getElementById('timer').textContent = `Time: ${timer}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = `Score: ${score}`;
}

function checkGameEnd() {
    const player = people.find(person => person.name === 'Player');
    if (player && player.inLift === null && player.targetFloor === 5) {
        stopTimer();
        document.getElementById('status').textContent = `You reached your destination in ${timer} seconds! Your final score is ${score}.`;
    }
}

startTimer();