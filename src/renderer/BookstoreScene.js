import * as PIXI from 'pixi.js';
import { getGameState } from '../game/state.js';
import { GAME_CONFIG } from '../game/config.js';

export class BookstoreScene {
  constructor(app) {
    this.app = app;
    this.state = getGameState();
    
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    
    this.zones = {};
    this.decorations = [];
    this.customerSprites = new Map();
    
    this.storeWidth = GAME_CONFIG.STORE_WIDTH;
    this.storeHeight = GAME_CONFIG.STORE_HEIGHT;
    
    this.init();
  }

  init() {
    this.createFloor();
    this.createWalls();
    this.createBookshelves();
    this.createCoffeeArea();
    this.createActivityArea();
    this.createCheckout();
    this.createMemberDesk();
    this.createEntrance();
  }

  createFloor() {
    const floor = new PIXI.Graphics();
    
    const tileSize = 50;
    for (let x = 0; x < this.storeWidth; x += tileSize) {
      for (let y = 0; y < this.storeHeight; y += tileSize) {
        const isAlternate = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        floor.beginFill(isAlternate ? 0xd4b896 : 0xc4a882);
        floor.drawRect(x, y, tileSize, tileSize);
        floor.endFill();
      }
    }
    
    this.container.addChild(floor);
  }

  createWalls() {
    const wallThickness = 20;
    const wallColor = 0x8b7355;
    const wallHighlight = 0x9c8465;
    
    const topWall = new PIXI.Graphics();
    topWall.beginFill(wallColor);
    topWall.drawRect(0, 0, this.storeWidth, wallThickness);
    topWall.endFill();
    
    const topHighlight = new PIXI.Graphics();
    topHighlight.beginFill(wallHighlight);
    topHighlight.drawRect(0, wallThickness - 4, this.storeWidth, 4);
    topHighlight.endFill();
    
    const bottomWall = new PIXI.Graphics();
    bottomWall.beginFill(wallColor);
    bottomWall.drawRect(0, this.storeHeight - wallThickness, this.storeWidth, wallThickness);
    bottomWall.endFill();
    
    const leftWall = new PIXI.Graphics();
    leftWall.beginFill(wallColor);
    leftWall.drawRect(0, 0, wallThickness, this.storeHeight);
    leftWall.endFill();
    
    const rightWall = new PIXI.Graphics();
    rightWall.beginFill(wallColor);
    rightWall.drawRect(this.storeWidth - wallThickness, 0, wallThickness, this.storeHeight);
    rightWall.endFill();
    
    this.container.addChild(topWall, topHighlight, bottomWall, leftWall, rightWall);
  }

  createBookshelves() {
    const shelfGroup = new PIXI.Container();
    
    const shelfConfigs = [
      { x: 60, y: 60, rows: 5, cols: 1, direction: 'horizontal' },
      { x: 60, y: 200, rows: 5, cols: 1, direction: 'horizontal' },
      { x: 60, y: 340, rows: 5, cols: 1, direction: 'horizontal' },
      { x: 60, y: 480, rows: 4, cols: 1, direction: 'horizontal' },
      
      { x: 200, y: 60, rows: 3, cols: 4, direction: 'vertical' },
      
      { x: 400, y: 60, rows: 5, cols: 1, direction: 'horizontal' },
      { x: 400, y: 200, rows: 5, cols: 1, direction: 'horizontal' },
      { x: 400, y: 340, rows: 5, cols: 1, direction: 'horizontal' },
      
      { x: 540, y: 60, rows: 3, cols: 4, direction: 'vertical' },
    ];
    
    shelfConfigs.forEach((config, index) => {
      const shelf = this.createBookshelf(config);
      shelfGroup.addChild(shelf);
    });
    
    this.zones.books = shelfGroup;
    this.container.addChild(shelfGroup);
  }

  createBookshelf(config) {
    const shelf = new PIXI.Container();
    
    const shelfWidth = config.direction === 'horizontal' ? 120 : 40;
    const shelfHeight = config.direction === 'horizontal' ? 40 : 120;
    
    const frame = new PIXI.Graphics();
    frame.beginFill(0x5c3a21);
    frame.drawRoundedRect(0, 0, shelfWidth, shelfHeight, 3);
    frame.endFill();
    
    frame.lineStyle(2, 0x3d2817);
    frame.drawRoundedRect(0, 0, shelfWidth, shelfHeight, 3);
    
    shelf.addChild(frame);
    
    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xf39c12, 0xd35400, 0x16a085];
    
    if (config.direction === 'horizontal') {
      for (let i = 0; i < 8; i++) {
        const bookWidth = 10 + Math.random() * 5;
        const bookHeight = 25 + Math.random() * 10;
        const bookColor = bookColors[Math.floor(Math.random() * bookColors.length)];
        
        const book = new PIXI.Graphics();
        book.beginFill(bookColor);
        book.drawRect(5 + i * 13, 8 + (30 - bookHeight) / 2, bookWidth, bookHeight);
        book.endFill();
        
        book.lineStyle(1, 0x2c1810);
        book.drawRect(5 + i * 13, 8 + (30 - bookHeight) / 2, bookWidth, bookHeight);
        
        shelf.addChild(book);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const bookWidth = 25 + Math.random() * 8;
        const bookHeight = 12;
        const bookColor = bookColors[Math.floor(Math.random() * bookColors.length)];
        
        const book = new PIXI.Graphics();
        book.beginFill(bookColor);
        book.drawRect(5 + (30 - bookWidth) / 2, 5 + i * 18, bookWidth, bookHeight);
        book.endFill();
        
        book.lineStyle(1, 0x2c1810);
        book.drawRect(5 + (30 - bookWidth) / 2, 5 + i * 18, bookWidth, bookHeight);
        
        shelf.addChild(book);
      }
    }
    
    shelf.x = config.x;
    shelf.y = config.y;
    
    return shelf;
  }

  createCoffeeArea() {
    const coffeeGroup = new PIXI.Container();
    
    const counter = new PIXI.Graphics();
    counter.beginFill(0x6b4423);
    counter.drawRoundedRect(0, 0, 150, 50, 5);
    counter.endFill();
    
    counter.lineStyle(2, 0x3d2817);
    counter.drawRoundedRect(0, 0, 150, 50, 5);
    
    const counterTop = new PIXI.Graphics();
    counterTop.beginFill(0x8b6914);
    counterTop.drawRoundedRect(-5, -5, 160, 15, 3);
    counterTop.endFill();
    
    coffeeGroup.addChild(counter, counterTop);
    
    const coffeeMachine = new PIXI.Graphics();
    coffeeMachine.beginFill(0x444444);
    coffeeMachine.drawRect(20, 15, 30, 30);
    coffeeMachine.endFill();
    coffeeMachine.beginFill(0x666666);
    coffeeMachine.drawRect(25, 10, 20, 10);
    coffeeMachine.endFill();
    coffeeGroup.addChild(coffeeMachine);
    
    const seatConfigs = [
      { x: 40, y: 80 },
      { x: 110, y: 80 },
      { x: 40, y: 140 },
      { x: 110, y: 140 },
    ];
    
    seatConfigs.forEach(pos => {
      const table = new PIXI.Graphics();
      table.beginFill(0x8b6914);
      table.drawCircle(pos.x, pos.y, 20);
      table.endFill();
      table.lineStyle(2, 0x5c3a21);
      table.drawCircle(pos.x, pos.y, 20);
      coffeeGroup.addChild(table);
      
      const chair1 = new PIXI.Graphics();
      chair1.beginFill(0x6b4423);
      chair1.drawCircle(pos.x - 25, pos.y, 10);
      chair1.endFill();
      coffeeGroup.addChild(chair1);
      
      const chair2 = new PIXI.Graphics();
      chair2.beginFill(0x6b4423);
      chair2.drawCircle(pos.x + 25, pos.y, 10);
      chair2.endFill();
      coffeeGroup.addChild(chair2);
    });
    
    const sign = new PIXI.Text('咖啡区', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 14,
      fill: 0x654321,
      fontWeight: 'bold',
    });
    sign.anchor.set(0.5);
    sign.x = 75;
    sign.y = -20;
    coffeeGroup.addChild(sign);
    
    coffeeGroup.x = 700;
    coffeeGroup.y = 50;
    
    this.zones.coffee = coffeeGroup;
    this.container.addChild(coffeeGroup);
  }

  createActivityArea() {
    const activityGroup = new PIXI.Container();
    
    const areaBg = new PIXI.Graphics();
    areaBg.beginFill(0xe8d5b5, 0.5);
    areaBg.drawRoundedRect(0, 0, 250, 180, 10);
    areaBg.endFill();
    
    areaBg.lineStyle(3, 0x8b6914, 0.8);
    areaBg.drawRoundedRect(0, 0, 250, 180, 10);
    
    activityGroup.addChild(areaBg);
    
    const stage = new PIXI.Graphics();
    stage.beginFill(0xd4a574);
    stage.drawRect(90, 10, 70, 40);
    stage.endFill();
    stage.lineStyle(2, 0x8b6914);
    stage.drawRect(90, 10, 70, 40);
    activityGroup.addChild(stage);
    
    const seatRows = 3;
    const seatsPerRow = 5;
    for (let row = 0; row < seatRows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        const seat = new PIXI.Graphics();
        seat.beginFill(0x6b4423);
        seat.drawRect(25 + col * 42, 70 + row * 35, 32, 25);
        seat.endFill();
        seat.lineStyle(1, 0x3d2817);
        seat.drawRect(25 + col * 42, 70 + row * 35, 32, 25);
        activityGroup.addChild(seat);
      }
    }
    
    const sign = new PIXI.Text('活动区', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 14,
      fill: 0x654321,
      fontWeight: 'bold',
    });
    sign.anchor.set(0.5);
    sign.x = 125;
    sign.y = -20;
    activityGroup.addChild(sign);
    
    activityGroup.x = 700;
    activityGroup.y = 280;
    
    this.zones.activity = activityGroup;
    this.container.addChild(activityGroup);
  }

  createCheckout() {
    const checkoutGroup = new PIXI.Container();
    
    const counter = new PIXI.Graphics();
    counter.beginFill(0x6b4423);
    counter.drawRoundedRect(0, 0, 120, 60, 5);
    counter.endFill();
    counter.lineStyle(2, 0x3d2817);
    counter.drawRoundedRect(0, 0, 120, 60, 5);
    
    const counterTop = new PIXI.Graphics();
    counterTop.beginFill(0x8b6914);
    counterTop.drawRoundedRect(-5, -5, 130, 15, 3);
    counterTop.endFill();
    
    checkoutGroup.addChild(counter, counterTop);
    
    const register = new PIXI.Graphics();
    register.beginFill(0x333333);
    register.drawRect(20, 15, 35, 30);
    register.endFill();
    register.beginFill(0x4a90d9);
    register.drawRect(25, 20, 25, 15);
    register.endFill();
    checkoutGroup.addChild(register);
    
    const scanGun = new PIXI.Graphics();
    scanGun.beginFill(0xcc0000);
    scanGun.drawRoundedRect(65, 20, 25, 15, 3);
    scanGun.endFill();
    checkoutGroup.addChild(scanGun);
    
    const sign = new PIXI.Text('收银台', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 14,
      fill: 0x654321,
      fontWeight: 'bold',
    });
    sign.anchor.set(0.5);
    sign.x = 60;
    sign.y = -20;
    checkoutGroup.addChild(sign);
    
    checkoutGroup.x = 200;
    checkoutGroup.y = 580;
    
    this.zones.checkout = checkoutGroup;
    this.container.addChild(checkoutGroup);
  }

  createMemberDesk() {
    const memberGroup = new PIXI.Container();
    
    const desk = new PIXI.Graphics();
    desk.beginFill(0x5c3a21);
    desk.drawRoundedRect(0, 0, 100, 50, 5);
    desk.endFill();
    desk.lineStyle(2, 0x3d2817);
    desk.drawRoundedRect(0, 0, 100, 50, 5);
    
    const deskTop = new PIXI.Graphics();
    deskTop.beginFill(0x8b6914);
    deskTop.drawRoundedRect(-5, -5, 110, 12, 3);
    deskTop.endFill();
    
    memberGroup.addChild(desk, deskTop);
    
    const computer = new PIXI.Graphics();
    computer.beginFill(0x222222);
    computer.drawRect(15, 10, 30, 25);
    computer.endFill();
    computer.beginFill(0x4a90d9);
    computer.drawRect(18, 13, 24, 19);
    computer.endFill();
    memberGroup.addChild(computer);
    
    const cardReader = new PIXI.Graphics();
    cardReader.beginFill(0x888888);
    cardReader.drawRect(55, 20, 25, 15);
    cardReader.endFill();
    cardReader.beginFill(0xffd700);
    cardReader.drawRect(58, 24, 19, 5);
    cardReader.endFill();
    memberGroup.addChild(cardReader);
    
    const sign = new PIXI.Text('会员服务台', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 14,
      fill: 0x654321,
      fontWeight: 'bold',
    });
    sign.anchor.set(0.5);
    sign.x = 50;
    sign.y = -20;
    memberGroup.addChild(sign);
    
    const vipBadge = new PIXI.Graphics();
    vipBadge.beginFill(0xffd700);
    vipBadge.drawRoundedRect(-20, -5, 25, 25, 5);
    vipBadge.endFill();
    memberGroup.addChild(vipBadge);
    
    const vipText = new PIXI.Text('VIP', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 10,
      fill: 0x8b6914,
      fontWeight: 'bold',
    });
    vipText.anchor.set(0.5);
    vipText.x = -7.5;
    vipText.y = 7.5;
    memberGroup.addChild(vipText);
    
    memberGroup.x = 400;
    memberGroup.y = 585;
    
    this.zones.member = memberGroup;
    this.container.addChild(memberGroup);
  }

  createEntrance() {
    const entranceGroup = new PIXI.Container();
    
    const doorFrame = new PIXI.Graphics();
    doorFrame.beginFill(0x3d2817);
    doorFrame.drawRect(0, 0, 100, 20);
    doorFrame.endFill();
    entranceGroup.addChild(doorFrame);
    
    const doorLeft = new PIXI.Graphics();
    doorLeft.beginFill(0x654321);
    doorLeft.drawRect(0, 20, 45, 60);
    doorLeft.endFill();
    doorLeft.lineStyle(2, 0x3d2817);
    doorLeft.drawRect(0, 20, 45, 60);
    
    const doorRight = new PIXI.Graphics();
    doorRight.beginFill(0x654321);
    doorRight.drawRect(55, 20, 45, 60);
    doorRight.endFill();
    doorRight.lineStyle(2, 0x3d2817);
    doorRight.drawRect(55, 20, 45, 60);
    
    entranceGroup.addChild(doorLeft, doorRight);
    
    const handleLeft = new PIXI.Graphics();
    handleLeft.beginFill(0xffd700);
    handleLeft.drawCircle(40, 50, 4);
    handleLeft.endFill();
    
    const handleRight = new PIXI.Graphics();
    handleRight.beginFill(0xffd700);
    handleRight.drawCircle(60, 50, 4);
    handleRight.endFill();
    
    entranceGroup.addChild(handleLeft, handleRight);
    
    const sign = new PIXI.Graphics();
    sign.beginFill(0x8b0000);
    sign.drawRoundedRect(15, -35, 70, 30, 5);
    sign.endFill();
    sign.lineStyle(2, 0xffd700);
    sign.drawRoundedRect(15, -35, 70, 30, 5);
    entranceGroup.addChild(sign);
    
    const signText = new PIXI.Text('书香阁', {
      fontFamily: 'Microsoft YaHei',
      fontSize: 16,
      fill: 0xffd700,
      fontWeight: 'bold',
    });
    signText.anchor.set(0.5);
    signText.x = 50;
    signText.y = -20;
    entranceGroup.addChild(signText);
    
    entranceGroup.x = 700;
    entranceGroup.y = 620;
    
    this.zones.entrance = entranceGroup;
    this.container.addChild(entranceGroup);
  }

  addCustomerSprite(customer) {
    const sprite = new PIXI.Container();
    
    const body = new PIXI.Graphics();
    const bodyColor = this.getCustomerColor(customer);
    body.beginFill(bodyColor);
    body.drawCircle(0, 0, 12);
    body.endFill();
    body.lineStyle(2, 0x333333);
    body.drawCircle(0, 0, 12);
    
    const head = new PIXI.Graphics();
    head.beginFill(0xffdbac);
    head.drawCircle(0, -15, 8);
    head.endFill();
    head.lineStyle(1, 0xccaa88);
    head.drawCircle(0, -15, 8);
    
    sprite.addChild(body, head);
    
    if (customer.isMember) {
      const badge = new PIXI.Graphics();
      const badgeColors = {
        bronze: 0xcd7f32,
        silver: 0xc0c0c0,
        gold: 0xffd700,
        platinum: 0xe5e4e2,
      };
      badge.beginFill(badgeColors[customer.memberLevel] || 0xcd7f32);
      badge.drawCircle(10, -20, 5);
      badge.endFill();
      badge.lineStyle(1, 0x8b6914);
      badge.drawCircle(10, -20, 5);
      sprite.addChild(badge);
    }
    
    sprite.x = this.getEntrancePosition().x;
    sprite.y = this.getEntrancePosition().y;
    sprite.customerId = customer.id;
    
    this.customerSprites.set(customer.id, sprite);
    this.container.addChild(sprite);
    
    return sprite;
  }

  getCustomerColor(customer) {
    const colors = {
      casual: 0x3498db,
      reader: 0x9b59b6,
      student: 0x2ecc71,
      professional: 0xe74c3c,
      family: 0xf39c12,
    };
    return colors[customer.type] || 0x3498db;
  }

  getEntrancePosition() {
    return { x: 750, y: 650 };
  }

  removeCustomerSprite(customerId) {
    const sprite = this.customerSprites.get(customerId);
    if (sprite) {
      this.container.removeChild(sprite);
      this.customerSprites.delete(customerId);
    }
  }

  updateCustomerPosition(customerId, x, y) {
    const sprite = this.customerSprites.get(customerId);
    if (sprite) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  update(delta) {
    const state = this.state;
    
    for (const customer of state.customers) {
      const sprite = this.customerSprites.get(customer.id);
      if (sprite) {
        this.animateCustomer(customer, sprite, delta);
      }
    }
    
    this.updateActivityVisual();
  }

  animateCustomer(customer, sprite, delta) {
    if (!customer.targetX || !customer.targetY) {
      this.setCustomerTarget(customer);
    }
    
    const dx = customer.targetX - sprite.x;
    const dy = customer.targetY - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = 50 * delta;
      const ratio = Math.min(speed / dist, 1);
      sprite.x += dx * ratio;
      sprite.y += dy * ratio;
      
      customer.x = sprite.x;
      customer.y = sprite.y;
    } else {
      if (Math.random() < 0.01) {
        this.setCustomerTarget(customer);
      }
    }
  }

  setCustomerTarget(customer) {
    const zones = this.getCustomerZones();
    const zoneKeys = Object.keys(zones);
    const randomZone = zoneKeys[Math.floor(Math.random() * zoneKeys.length)];
    const zone = zones[randomZone];
    
    customer.targetX = zone.x + (Math.random() - 0.5) * zone.width;
    customer.targetY = zone.y + (Math.random() - 0.5) * zone.height;
    customer.currentZone = randomZone;
  }

  getCustomerZones() {
    return {
      books: { x: 250, y: 250, width: 300, height: 400 },
      coffee: { x: 775, y: 130, width: 100, height: 100 },
      activity: { x: 825, y: 350, width: 150, height: 100 },
      checkout: { x: 260, y: 610, width: 80, height: 40 },
      member: { x: 450, y: 610, width: 60, height: 40 },
    };
  }

  updateActivityVisual() {
    const state = this.state;
    const activityZone = this.zones.activity;
    
    if (!activityZone) return;
    
    if (state.currentActivity) {
      if (!this.activityIndicator) {
        this.activityIndicator = new PIXI.Container();
        
        const glow = new PIXI.Graphics();
        glow.beginFill(state.currentActivity.color || 0xffd700, 0.3);
        glow.drawRoundedRect(10, 10, 230, 160, 10);
        glow.endFill();
        this.activityIndicator.addChild(glow);
        
        const banner = new PIXI.Graphics();
        banner.beginFill(state.currentActivity.color || 0xffd700);
        banner.drawRect(0, 0, 250, 30);
        banner.endFill();
        this.activityIndicator.addChild(banner);
        
        const text = new PIXI.Text(state.currentActivity.name || '活动进行中', {
          fontFamily: 'Microsoft YaHei',
          fontSize: 14,
          fill: 0xffffff,
          fontWeight: 'bold',
        });
        text.anchor.set(0.5);
        text.x = 125;
        text.y = 15;
        this.activityIndicator.addChild(text);
        
        activityZone.addChild(this.activityIndicator);
      }
    } else if (this.activityIndicator) {
      activityZone.removeChild(this.activityIndicator);
      this.activityIndicator = null;
    }
  }

  resize(scale) {
    this.container.scale.set(scale);
  }
}
