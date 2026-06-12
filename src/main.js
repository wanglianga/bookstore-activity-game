import * as PIXI from 'pixi.js';
import { initGameState, getGameState } from './game/state.js';
import { getGameEngine } from './game/engine.js';
import { getActivityManager } from './game/activity.js';
import { BookstoreScene } from './renderer/BookstoreScene.js';
import { initUIManager, getUIManager } from './ui/UIManager.js';
import { GAME_CONFIG } from './game/config.js';

class Game {
  constructor() {
    this.app = null;
    this.scene = null;
    this.engine = null;
    this.ui = null;
    this.state = null;
    
    this.lastTime = 0;
  }

  async init() {
    initGameState();
    this.state = getGameState();
    
    this.engine = getGameEngine();
    this.activityManager = getActivityManager();
    
    await this.initPixi();
    
    this.scene = new BookstoreScene(this.app);
    
    this.ui = initUIManager();
    
    this.setupEngineCallbacks();
    
    this.engine.init();
    
    this.setupResize();
    
    this.startGameLoop();
    
    console.log('书店经营游戏初始化完成！');
  }

  async initPixi() {
    const canvas = document.getElementById('game-canvas');
    
    this.app = new PIXI.Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2c1810,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
  }

  setupEngineCallbacks() {
    this.engine.onCustomerSpawn = (customer) => {
      this.scene.addCustomerSprite(customer);
    };
    
    this.engine.onCustomerLeave = (customer) => {
      this.scene.removeCustomerSprite(customer.id);
    };
    
    this.engine.onDayEnd = (result) => {
      this.ui.showDayEndSummary(result);
    };
    
    this.engine.onMoneyChange = (money) => {
    };
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.onResize();
    });
    
    this.onResize();
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.app.renderer.resize(width, height);
    
    const scaleX = width / GAME_CONFIG.STORE_WIDTH;
    const scaleY = height / GAME_CONFIG.STORE_HEIGHT;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    
    this.scene.resize(scale);
    
    const offsetX = (width - GAME_CONFIG.STORE_WIDTH * scale) / 2;
    const offsetY = (height - GAME_CONFIG.STORE_HEIGHT * scale) / 2;
    
    this.scene.container.x = offsetX;
    this.scene.container.y = offsetY;
  }

  startGameLoop() {
    this.lastTime = performance.now();
    
    const tick = (currentTime) => {
      const deltaSeconds = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      
      this.update(deltaSeconds);
      
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }

  update(deltaSeconds) {
    this.engine.update(deltaSeconds);
    
    this.scene.update(deltaSeconds);
    
    this.ui.update();
    
    if (this.state.gameOver && !this.gameOverShown) {
      this.gameOverShown = true;
      this.ui.showGameOver();
    }
  }
}

const game = new Game();
game.init().catch(console.error);

window.game = game;
