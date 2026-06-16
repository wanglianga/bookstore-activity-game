import { GAME_CONFIG, BOOK_CATEGORIES, STAFF_ROLES } from './config.js';

export class GameState {
  constructor() {
    this.day = 1;
    this.hour = GAME_CONFIG.OPEN_HOUR;
    this.minute = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.gameOver = false;

    this.money = 5000;
    this.popularity = 50;
    this.reputation = 60;
    
    this.totalSales = 0;
    this.totalCustomers = 0;
    this.activeMembers = 0;
    this.dailySales = 0;
    this.dailyCustomers = 0;
    this.dailyNewMembers = 0;

    this.staffCount = 2;
    this.seatCount = 10;
    this.maxSpace = 100;
    this.usedSpace = 0;

    this.staffAssignments = {};
    Object.keys(STAFF_ROLES).forEach(key => {
      this.staffAssignments[key] = 0;
    });
    this.staffAssignments.CASHIER = 1;
    this.staffAssignments.GUIDE = 1;

    this.displayConfig = {};
    Object.keys(BOOK_CATEGORIES).forEach(key => {
      this.displayConfig[key] = {
        prominent: false,
        stock: 30,
      };
    });

    this.inventory = {};
    Object.keys(BOOK_CATEGORIES).forEach(key => {
      this.inventory[key] = 30;
    });

    this.currentActivity = null;
    this.activityEndTime = 0;

    this.crisisActive = false;
    this.currentCrisis = null;
    this.crisisResolved = false;

    this.spaceCompression = 0;
    this.blockedShelves = 0;
    this.coffeeQueueLength = 0;

    this.customers = [];
    this.members = [];

    this.dailyRent = GAME_CONFIG.DAILY_RENT;
    
    this.history = [];
  }

  get isOpen() {
    return this.hour >= GAME_CONFIG.OPEN_HOUR && this.hour < GAME_CONFIG.CLOSE_HOUR;
  }

  get timeString() {
    const h = Math.floor(this.hour).toString().padStart(2, '0');
    const m = Math.floor(this.minute).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  get availableSpace() {
    return this.maxSpace - this.usedSpace;
  }

  getSalesMultiplier() {
    if (this.spaceCompression <= GAME_CONFIG.SPACE_COMPRESSION_THRESHOLD) return 1;
    const excess = this.spaceCompression - GAME_CONFIG.SPACE_COMPRESSION_THRESHOLD;
    return Math.max(0.3, 1 - excess * GAME_CONFIG.SPACE_SALES_PENALTY_PER_POINT);
  }

  getBrowseMultiplier() {
    if (this.spaceCompression <= GAME_CONFIG.SPACE_COMPRESSION_THRESHOLD) return 1;
    const excess = this.spaceCompression - GAME_CONFIG.SPACE_COMPRESSION_THRESHOLD;
    return Math.max(0.4, 1 - excess * GAME_CONFIG.SPACE_BROWSE_PENALTY_PER_POINT);
  }

  getStaffBonus(role) {
    const count = this.staffAssignments[role] || 0;
    const roleConfig = STAFF_ROLES[role];
    if (!roleConfig) return 0;
    if (role === 'CASHIER') return count * roleConfig.salesBonus;
    if (role === 'GUIDE') return count * roleConfig.buyBonus;
    if (role === 'BARISTA') return count * roleConfig.coffeeSpeedBonus;
    if (role === 'EVENT_STAFF') return count * roleConfig.crisisBonus;
    return 0;
  }

  getAssignedStaffCount() {
    return Object.values(this.staffAssignments).reduce((sum, count) => sum + count, 0);
  }

  getUnassignedStaffCount() {
    return this.staffCount - this.getAssignedStaffCount();
  }

  assignStaff(role, count) {
    const current = this.staffAssignments[role] || 0;
    const unassigned = this.getUnassignedStaffCount();
    
    if (count > 0 && unassigned < count) return false;
    if (count < 0 && current < Math.abs(count)) return false;
    
    this.staffAssignments[role] = current + count;
    return true;
  }

  setDisplayProminent(category, prominent) {
    if (!this.displayConfig[category]) return false;
    const currentProminent = Object.keys(this.displayConfig).filter(k => this.displayConfig[k].prominent).length;
    if (prominent && currentProminent >= 2 && !this.displayConfig[category].prominent) return false;
    this.displayConfig[category].prominent = prominent;
    return true;
  }

  updateSpaceCompression() {
    let compression = 0;
    
    compression += this.usedSpace * 0.5;
    
    if (this.seatCount > 20) {
      compression += (this.seatCount - 20) * 1.5;
    }
    
    this.blockedShelves = Math.floor(compression / 25);
    this.spaceCompression = Math.min(100, compression);
  }

  addMoney(amount) {
    this.money += amount;
    if (amount > 0) {
      this.totalSales += amount;
      this.dailySales += amount;
    }
  }

  subtractMoney(amount) {
    this.money -= amount;
  }

  addPopularity(amount) {
    this.popularity = Math.max(0, Math.min(100, this.popularity + amount));
  }

  addReputation(amount) {
    this.reputation = Math.max(0, Math.min(100, this.reputation + amount));
  }

  addCustomer(customer) {
    this.customers.push(customer);
    this.totalCustomers++;
    this.dailyCustomers++;
  }

  removeCustomer(customer) {
    const index = this.customers.indexOf(customer);
    if (index > -1) {
      this.customers.splice(index, 1);
    }
  }

  addMember(member) {
    this.members.push(member);
    this.activeMembers++;
    this.dailyNewMembers++;
  }

  getMemberLevel(totalSpend) {
    if (totalSpend >= 2000) return 'platinum';
    if (totalSpend >= 1000) return 'gold';
    if (totalSpend >= 500) return 'silver';
    if (totalSpend >= 200) return 'bronze';
    return 'none';
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  endDay() {
    const dayRecord = {
      day: this.day,
      sales: this.dailySales,
      customers: this.dailyCustomers,
      newMembers: this.dailyNewMembers,
      popularity: this.popularity,
      reputation: this.reputation,
      money: this.money,
    };
    this.history.push(dayRecord);

    this.dailySales = 0;
    this.dailyCustomers = 0;
    this.dailyNewMembers = 0;
    this.currentActivity = null;
    this.usedSpace = 0;
    this.spaceCompression = 0;
    this.blockedShelves = 0;
    this.coffeeQueueLength = 0;
    this.crisisActive = false;
    this.currentCrisis = null;
    this.crisisResolved = false;

    const expenses = this.dailyRent + (this.staffCount * GAME_CONFIG.STAFF_SALARY);
    this.subtractMoney(expenses);

    this.day++;
    this.hour = GAME_CONFIG.OPEN_HOUR;
    this.minute = 0;

    if (this.money < 0) {
      this.gameOver = true;
    }

    return { expenses, dayRecord };
  }

  resetDailyStats() {
    this.dailySales = 0;
    this.dailyCustomers = 0;
    this.dailyNewMembers = 0;
  }
}

let gameState = null;

export function initGameState() {
  gameState = new GameState();
  return gameState;
}

export function getGameState() {
  return gameState;
}
