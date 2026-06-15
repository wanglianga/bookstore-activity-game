import { getGameState } from './state.js';
import { generateRandomCustomer, calculateDailyCustomerCount } from './customer.js';
import { getActivityManager } from './activity.js';
import { GAME_CONFIG, BOOK_CATEGORIES } from './config.js';

export class GameEngine {
  constructor() {
    this.state = null;
    this.activityManager = null;
    this.dayCustomersRemaining = 0;
    this.customerSpawnTimer = 0;
    this.customerSpawnInterval = 0;
    
    this.onCustomerSpawn = null;
    this.onCustomerLeave = null;
    this.onDayEnd = null;
    this.onMoneyChange = null;
    this.onActivityStart = null;
    this.onActivityEnd = null;
    
    this.todayCustomersSpawned = 0;
  }

  init() {
    this.state = getGameState();
    this.activityManager = getActivityManager();
    this.prepareDay();
  }

  prepareDay() {
    this.dayCustomersRemaining = calculateDailyCustomerCount();
    this.todayCustomersSpawned = 0;
    
    const openHours = GAME_CONFIG.CLOSE_HOUR - GAME_CONFIG.OPEN_HOUR;
    this.customerSpawnInterval = (openHours * 60) / this.dayCustomersRemaining;
    this.customerSpawnTimer = 0;
  }

  update(deltaSeconds) {
    if (!this.state.isRunning || this.state.isPaused || this.state.gameOver) {
      return;
    }

    const minutesPerSecond = 10;
    const deltaMinutes = deltaSeconds * minutesPerSecond;
    const deltaHours = deltaMinutes / 60;

    this.state.minute += deltaMinutes;
    while (this.state.minute >= 60) {
      this.state.minute -= 60;
      this.state.hour++;
    }

    this.updateCustomers(deltaMinutes);
    this.spawnCustomers(deltaMinutes);
    this.activityManager.update(deltaHours);

    if (this.state.hour >= GAME_CONFIG.CLOSE_HOUR) {
      this.endDay();
    }
  }

  updateCustomers(deltaMinutes) {
    const state = this.state;
    const customersToRemove = [];

    for (const customer of state.customers) {
      customer.update(deltaMinutes);

      if (customer.state === 'browsing' && !customer.hasBought && customer.willBuy) {
        const buyResult = customer.tryBuy();
        if (buyResult) {
          this.processPurchase(customer, buyResult);
        }
      }

      if (customer.state === 'leaving' && customer.remainingTime <= -5) {
        this.processLeaving(customer);
        customersToRemove.push(customer);
      }
    }

    for (const customer of customersToRemove) {
      state.removeCustomer(customer);
      if (this.onCustomerLeave) {
        this.onCustomerLeave(customer);
      }
    }
  }

  spawnCustomers(deltaMinutes) {
    const state = this.state;
    
    if (this.todayCustomersSpawned >= this.dayCustomersRemaining) return;
    if (state.customers.length >= 30) return;
    
    if (!state.isOpen) return;

    this.customerSpawnTimer += deltaMinutes;

    let spawnInterval = this.customerSpawnInterval;
    
    const hourFactor = this.getHourFactor();
    spawnInterval /= hourFactor;
    
    if (state.currentActivity) {
      spawnInterval /= state.currentActivity.customerBoost || 1.2;
    }

    while (this.customerSpawnTimer >= spawnInterval && 
           this.todayCustomersSpawned < this.dayCustomersRemaining) {
      this.customerSpawnTimer -= spawnInterval;
      this.spawnCustomer();
    }
  }

  getHourFactor() {
    const hour = this.state.hour;
    if (hour >= 9 && hour < 11) return 0.7;
    if (hour >= 11 && hour < 14) return 1.2;
    if (hour >= 14 && hour < 17) return 0.9;
    if (hour >= 17 && hour < 20) return 1.5;
    return 0.8;
  }

  spawnCustomer() {
    const state = this.state;
    const customer = generateRandomCustomer();
    
    customer.state = 'entering';
    state.addCustomer(customer);
    this.todayCustomersSpawned++;
    
    if (this.onCustomerSpawn) {
      this.onCustomerSpawn(customer);
    }

    setTimeout(() => {
      if (customer.state === 'entering') {
        customer.state = 'browsing';
      }
    }, 1000);
  }

  processPurchase(customer, purchase) {
    const state = this.state;
    
    state.inventory[purchase.category] -= purchase.quantity;
    state.addMoney(purchase.price);
    
    if (customer.isMember) {
      const memberIndex = state.members.findIndex(m => m.name === customer.name);
      if (memberIndex > -1) {
        state.members[memberIndex].totalSpend += purchase.price;
        const newLevel = state.getMemberLevel(state.members[memberIndex].totalSpend);
        if (newLevel !== state.members[memberIndex].level) {
          state.members[memberIndex].level = newLevel;
          customer.memberLevel = newLevel;
        }
      }
    }
    
    if (this.onMoneyChange) {
      this.onMoneyChange(state.money);
    }
  }

  processLeaving(customer) {
    const state = this.state;
    
    if (!customer.isMember && customer.hasBought && customer.mood > 0.6) {
      const memberResult = customer.tryBecomeMember();
      if (memberResult) {
        state.addMember(memberResult);
      }
    }
    
    if (customer.mood < 0.3) {
      state.addReputation(-1);
    } else if (customer.mood > 0.8) {
      state.addReputation(0.5);
    }
  }

  endDay() {
    const state = this.state;
    state.isRunning = false;
    
    while (state.customers.length > 0) {
      const customer = state.customers[0];
      this.processLeaving(customer);
      state.removeCustomer(customer);
      if (this.onCustomerLeave) {
        this.onCustomerLeave(customer);
      }
    }
    
    if (state.currentActivity) {
      this.activityManager.endActivity();
    }
    
    const { expenses, dayRecord } = state.endDay();
    
    if (this.onDayEnd) {
      this.onDayEnd({ expenses, dayRecord });
    }
  }

  startDay() {
    const state = this.state;
    if (state.gameOver) return false;
    
    state.isRunning = true;
    state.isPaused = false;
    this.prepareDay();
    
    return true;
  }

  pause() {
    this.state.isPaused = true;
  }

  resume() {
    this.state.isPaused = false;
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    return this.state.isPaused;
  }

  buyBooks(category, quantity) {
    const state = this.state;
    const catConfig = BOOK_CATEGORIES[category];
    
    if (!catConfig) {
      return { success: false, reason: '图书分类不存在' };
    }
    
    const cost = catConfig.basePrice * quantity * GAME_CONFIG.BOOK_COST_RATIO;
    
    if (!state.canAfford(cost)) {
      return { success: false, reason: '资金不足' };
    }
    
    state.subtractMoney(cost);
    state.inventory[category] += quantity;
    
    if (this.onMoneyChange) {
      this.onMoneyChange(state.money);
    }
    
    return { success: true, cost };
  }

  hireStaff() {
    const state = this.state;
    const cost = 200;
    
    if (!state.canAfford(cost)) {
      return { success: false, reason: '资金不足' };
    }
    if (state.staffCount >= 8) {
      return { success: false, reason: '员工已达上限' };
    }
    
    state.subtractMoney(cost);
    state.staffCount++;
    
    if (this.onMoneyChange) {
      this.onMoneyChange(state.money);
    }
    
    return { success: true };
  }

  fireStaff() {
    const state = this.state;
    
    if (state.staffCount <= 1) {
      return { success: false, reason: '至少需要1名员工' };
    }
    
    state.staffCount--;
    return { success: true };
  }

  addSeats() {
    const state = this.state;
    const cost = 100;
    
    if (!state.canAfford(cost)) {
      return { success: false, reason: '资金不足' };
    }
    if (state.seatCount >= 30) {
      return { success: false, reason: '座位已达上限' };
    }
    
    state.subtractMoney(cost);
    state.seatCount += 2;
    
    if (this.onMoneyChange) {
      this.onMoneyChange(state.money);
    }
    
    return { success: true };
  }

  removeSeats() {
    const state = this.state;
    
    if (state.seatCount <= 4) {
      return { success: false, reason: '座位不能再少了' };
    }
    
    state.seatCount -= 2;
    return { success: true };
  }
}

let gameEngine = null;

export function getGameEngine() {
  if (!gameEngine) {
    gameEngine = new GameEngine();
  }
  return gameEngine;
}
