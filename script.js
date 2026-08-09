* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #050505;
  color: #fff;
  font-family: Arial, sans-serif;

  display: flex;
  justify-content: center;
  align-items: center;

  min-height: 100vh;
}

#game {
  width: 900px;
  max-width: 95vw;
}

#hud {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 10px 4px;

  font-size: 13px;
  letter-spacing: 1px;
  color: #ddd;
}

canvas {
  display: block;

  width: 100%;
  height: auto;

  background: #0b0b0b;

  border: 1px solid #2a2a2a;

  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
}
