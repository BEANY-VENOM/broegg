const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 400,
  y: 250,
  radius: 12,
  speed: 3.5,
  hp: 100,
  maxHp: 100,
  damage: 25,
  fireRate: 500,
  lastShot: 0,
  lastHit: 0,
  xp: 0,
  xpNeeded: 10,
  level: 1,
  pickupRange: 35,
  bulletSpeed: 7,
  bulletSize: 4
};

const enemies = [];
const bullets = [];
const gems = [];
const keys = {};

let score = 0;
let gameOver = false;
let levelUp = false;
let upgradeChoices = [];

let wave = 1;
let waveKills = 0;
let waveTarget = 15;
let waveTimer = 0;
let waveDuration = 30;

let spawnTimer = 0;

const upgrades = [
  {
    name: "More Damage",
    description: "+10 damage",
    apply: () => player.damage += 10
  },
  {
    name: "Faster Attack",
    description: "20% faster attacks",
    apply: () => player.fireRate *= 0.8
  },
  {
    name: "Move Faster",
    description: "+0.5 movement speed",
    apply: () => player.speed += 0.5
  },
  {
    name: "Maximum Health",
    description: "+25 max HP and heal",
    apply: () => {
      player.maxHp += 25;
      player.hp += 25;
    }
  },
  {
    name: "Bigger Bullets",
    description: "+2 bullet size",
    apply: () => player.bulletSize += 2
  },
  {
    name: "Longer Pickup",
    description: "+25 pickup range",
    apply: () => player.pickupRange += 25
  }
];

document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (levelUp) {
    if (e.key === "1") chooseUpgrade(0);
    if (e.key === "2") chooseUpgrade(1);
    if (e.key === "3") chooseUpgrade(2);
  }

  if (gameOver && e.key.toLowerCase() === "r") {
    restartGame();
  }
});

document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

function spawnEnemy() {
  if (gameOver || levelUp) return;

  const side = Math.floor(Math.random() * 4);

  let x;
  let y;

  if (side === 0) {
    x = -20;
    y = Math.random() * canvas.height;
  } else if (side === 1) {
    x = canvas.width + 20;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = -20;
  } else {
    x = Math.random() * canvas.width;
    y = canvas.height + 20;
  }

  const difficulty = 1 + (wave - 1) * 0.15;

  enemies.push({
    x,
    y,
    radius: 10 + Math.random() * 3,
    speed: (0.8 + Math.random() * 0.5) * difficulty,
    hp: 40 * difficulty
  });
}

function updateSpawner(delta) {
  spawnTimer += delta;

  const spawnRate = Math.max(250, 900 - wave * 35);

  if (spawnTimer >= spawnRate) {
    spawnTimer = 0;

    const amount =
      wave >= 8 && Math.random() < 0.25 ? 2 : 1;

    for (let i = 0; i < amount; i++) {
      spawnEnemy();
    }
  }
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys["w"] || keys["arrowup"]) dy--;
  if (keys["s"] || keys["arrowdown"]) dy++;
  if (keys["a"] || keys["arrowleft"]) dx--;
  if (keys["d"] || keys["arrowright"]) dx++;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);

    dx /= length;
    dy /= length;

    player.x += dx * player.speed;
    player.y += dy * player.speed;
  }

  player.x = Math.max(
    player.radius,
    Math.min(canvas.width - player.radius, player.x)
  );

  player.y = Math.max(
    player.radius,
    Math.min(canvas.height - player.radius, player.y)
  );
}

function findNearestEnemy() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const enemy of enemies) {
    const distance = Math.hypot(
      enemy.x - player.x,
      enemy.y - player.y
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }

  return nearest;
}

function shoot() {
  const now = Date.now();

  if (now - player.lastShot < player.fireRate) return;

  const target = findNearestEnemy();

  if (!target) return;

  player.lastShot = now;

  const angle = Math.atan2(
    target.y - player.y,
    target.x - player.x
  );

  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * player.bulletSpeed,
    vy: Math.sin(angle) * player.bulletSpeed,
    radius: player.bulletSize,
    damage: player.damage
  });
}

function updateEnemies() {
  const now = Date.now();

  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0) {
      enemy.x += dx / distance * enemy.speed;
      enemy.y += dy / distance * enemy.speed;
    }

    if (
      distance < player.radius + enemy.radius &&
      now - player.lastHit > 500
    ) {
      player.hp -= 10;
      player.lastHit = now;

      if (player.hp <= 0) {
        player.hp = 0;
        gameOver = true;
      }
    }
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (
      bullet.x < -30 ||
      bullet.x > canvas.width + 30 ||
      bullet.y < -30 ||
      bullet.y > canvas.height + 30
    ) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      const distance = Math.hypot(
        bullet.x - enemy.x,
        bullet.y - enemy.y
      );

      if (distance < bullet.radius + enemy.radius) {
        enemy.hp -= bullet.damage;
        bullets.splice(i, 1);

        if (enemy.hp <= 0) {
          enemies.splice(j, 1);

          score++;
          waveKills++;

          gems.push({
            x: enemy.x,
            y: enemy.y,
            value: 1
          });
        }

        break;
      }
    }
  }
}

function updateGems() {
  for (let i = gems.length - 1; i >= 0; i--) {
    const gem = gems[i];

    const dx = player.x - gem.x;
    const dy = player.y - gem.y;
    const distance = Math.hypot(dx, dy);

    if (distance < player.pickupRange) {
      gems.splice(i, 1);

      player.xp += gem.value;

      if (player.xp >= player.xpNeeded) {
        player.xp -= player.xpNeeded;
        player.level++;
        player.xpNeeded =
          Math.floor(player.xpNeeded * 1.35);

        startLevelUp();
        break;
      }
    }
  }
}

function startLevelUp() {
  levelUp = true;

  upgradeChoices = [...upgrades]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

function chooseUpgrade(index) {
  if (!levelUp || !upgradeChoices[index]) return;

  upgradeChoices[index].apply();

  player.hp = Math.min(
    player.hp,
    player.maxHp
  );

  levelUp = false;
  upgradeChoices = [];
}

function updateWave(delta) {
  if (levelUp || gameOver) return;

  waveTimer += delta;

  if (
    waveTimer >= waveDuration * 1000 ||
    waveKills >= waveTarget
  ) {
    wave++;

    waveKills = 0;
    waveTarget = Math.floor(15 + wave * 4);

    waveTimer = 0;

    player.hp = Math.min(
      player.maxHp,
      player.hp + player.maxHp * 0.08
    );
  }
}

function updateHUD() {
  const secondsLeft = Math.max(
    0,
    waveDuration - Math.floor(waveTimer / 1000)
  );

  document.querySelector("#hud").innerHTML = `
    <span>HP: ${Math.round(player.hp)}/${player.maxHp}</span>
    <span>LVL: ${player.level}</span>
    <span>XP: ${player.xp}/${player.xpNeeded}</span>
    <span>WAVE: ${wave}</span>
    <span>KILLS: ${score}</span>
    <span>${secondsLeft}s</span>
  `;
}

function draw() {
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle = "#101010";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.strokeStyle = "#191919";

  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // XP gems
  ctx.fillStyle = "#aaa";

  for (const gem of gems) {
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 5);
    ctx.lineTo(gem.x + 5, gem.y);
    ctx.lineTo(gem.x, gem.y + 5);
    ctx.lineTo(gem.x - 5, gem.y);
    ctx.closePath();
    ctx.fill();
  }

  // Bullets
  ctx.fillStyle = "#fff";

  for (const bullet of bullets) {
    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // Enemies
  ctx.fillStyle = "#777";

  for (const enemy of enemies) {
    ctx.beginPath();

    ctx.arc(
      enemy.x,
      enemy.y,
      enemy.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // Player
  ctx.fillStyle = "#fff";

  ctx.beginPath();

  ctx.arc(
    player.x,
    player.y,
    player.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Level-up screen
  if (levelUp) {
    ctx.fillStyle = "rgba(0,0,0,0.86)";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.textAlign = "center";

    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";

    ctx.fillText(
      "LEVEL UP",
      canvas.width / 2,
      90
    );

    ctx.font = "15px Arial";
    ctx.fillStyle = "#aaa";

    ctx.fillText(
      "Press 1, 2, or 3",
      canvas.width / 2,
      120
    );

    upgradeChoices.forEach(
      (upgrade, index) => {
        const x = 160 + index * 240;

        ctx.strokeStyle = "#444";

        ctx.strokeRect(
          x - 90,
          170,
          180,
          150
        );

        ctx.fillStyle = "#fff";
        ctx.font = "22px Arial";

        ctx.fillText(
          `${index + 1}`,
          x,
          205
        );

        ctx.font = "17px Arial";

        ctx.fillText(
          upgrade.name,
          x,
          245
        );

        ctx.font = "13px Arial";
        ctx.fillStyle = "#aaa";

        ctx.fillText(
          upgrade.description,
          x,
          275
        );
      }
    );
  }

  // Game over
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.82)";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.textAlign = "center";

    ctx.fillStyle = "#fff";
    ctx.font = "32px Arial";

    ctx.fillText(
      "YOU DIED",
      canvas.width / 2,
      canvas.height / 2 - 30
    );

    ctx.font = "16px Arial";

    ctx.fillText(
      `Wave ${wave} • Level ${player.level} • ${score} kills`,
      canvas.width / 2,
      canvas.height / 2 + 5
    );

    ctx.fillText(
      "Press R to restart",
      canvas.width / 2,
      canvas.height / 2 + 40
    );
  }
}

let lastTime = performance.now();

function gameLoop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (!gameOver && !levelUp) {
    movePlayer();
    shoot();
    updateEnemies();
    updateBullets();
    updateGems();
    updateSpawner(delta);
    updateWave(delta);
  }

  updateHUD();
  draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
