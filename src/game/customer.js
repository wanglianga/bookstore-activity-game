import { CUSTOMER_TYPES, BOOK_CATEGORIES, GAME_CONFIG } from './config.js';
import { getGameState } from './state.js';

const CUSTOMER_NAMES = [
  '小明', '小红', '小华', '小丽', '小强',
  '王先生', '李女士', '张同学', '陈老师', '刘经理',
  '赵阿姨', '孙叔叔', '周小姐', '吴先生', '郑女士',
  '读者A', '书虫B', '学霸C', '文艺D', '咖啡E'
];

const PREFERENCES = Object.keys(BOOK_CATEGORIES);

export class Customer {
  constructor(type, isMember = false, memberLevel = 'none') {
    const typeConfig = CUSTOMER_TYPES[type.toUpperCase()] || CUSTOMER_TYPES.CASUAL;
    
    this.id = Math.random().toString(36).substr(2, 9);
    this.name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    this.type = type;
    this.typeConfig = typeConfig;
    
    this.preferences = this.generatePreferences();
    this.stayTime = typeConfig.baseStayTime * (0.8 + Math.random() * 0.4);
    this.remainingTime = this.stayTime;
    
    this.buyChance = typeConfig.buyChance;
    this.avgSpend = typeConfig.avgSpend;
    this.willBuy = Math.random() < this.buyChance;
    this.hasBought = false;
    this.spentAmount = 0;
    
    this.isMember = isMember;
    this.memberLevel = memberLevel;
    
    this.activityInterest = Math.random();
    
    this.currentZone = 'entrance';
    this.targetZone = null;
    this.x = 0;
    this.y = 0;
    
    this.mood = 0.5 + Math.random() * 0.5;
    this.patience = 100;
    
    this.state = 'entering';
  }

  generatePreferences() {
    const prefs = {};
    const totalWeight = PREFERENCES.reduce((sum, cat) => {
      const weight = BOOK_CATEGORIES[cat].popularity * (0.5 + Math.random());
      prefs[cat] = weight;
      return sum + weight;
    }, 0);
    
    Object.keys(prefs).forEach(cat => {
      prefs[cat] /= totalWeight;
    });
    
    return prefs;
  }

  getPreferredCategory() {
    const rand = Math.random();
    let cumulative = 0;
    for (const cat of PREFERENCES) {
      cumulative += this.preferences[cat];
      if (rand <= cumulative) return cat;
    }
    return PREFERENCES[0];
  }

  getMemberDiscount() {
    if (!this.isMember) return 1;
    const levels = {
      'none': 1,
      'bronze': 0.95,
      'silver': 0.9,
      'gold': 0.85,
      'platinum': 0.8,
    };
    return levels[this.memberLevel] || 1;
  }

  update(deltaMinutes) {
    this.remainingTime -= deltaMinutes;
    
    if (this.remainingTime <= 0 && this.state !== 'leaving') {
      this.state = 'leaving';
    }
    
    if (this.patience < 30) {
      this.mood = Math.max(0, this.mood - 0.01);
    }
  }

  tryBuy() {
    if (this.hasBought || !this.willBuy) return null;
    
    const state = getGameState();
    const preferredCat = this.getPreferredCategory();
    
    if (state.inventory[preferredCat] <= 0) {
      this.patience -= 20;
      return null;
    }
    
    const catConfig = BOOK_CATEGORIES[preferredCat];
    const basePrice = catConfig.basePrice;
    const quantity = Math.ceil(Math.random() * 2);
    const discount = this.getMemberDiscount();
    
    const totalPrice = basePrice * quantity * discount;
    const cost = basePrice * quantity * GAME_CONFIG.BOOK_COST_RATIO;
    
    this.hasBought = true;
    this.spentAmount = totalPrice;
    this.mood = Math.min(1, this.mood + 0.1);
    
    return {
      category: preferredCat,
      quantity: Math.min(quantity, state.inventory[preferredCat]),
      price: totalPrice,
      cost: cost,
    };
  }

  tryBecomeMember() {
    if (this.isMember) return null;
    
    const chance = this.typeConfig.memberChance * (this.mood > 0.7 ? 1.5 : 1);
    if (Math.random() < chance) {
      this.isMember = true;
      this.memberLevel = 'bronze';
      return {
        name: this.name,
        level: 'bronze',
        totalSpend: this.spentAmount,
      };
    }
    return null;
  }
}

export function generateRandomCustomer() {
  const state = getGameState();
  const types = Object.keys(CUSTOMER_TYPES);
  
  const weights = {
    CASUAL: 0.35,
    READER: 0.2,
    STUDENT: 0.2,
    PROFESSIONAL: 0.15,
    FAMILY: 0.1,
  };
  
  const rand = Math.random();
  let cumulative = 0;
  let selectedType = 'CASUAL';
  
  for (const type of types) {
    cumulative += weights[type] || 0.1;
    if (rand <= cumulative) {
      selectedType = type;
      break;
    }
  }
  
  const memberChance = state.activeMembers > 0 ? 0.15 : 0;
  const isMember = Math.random() < memberChance;
  
  let memberLevel = 'none';
  if (isMember) {
    const levelRand = Math.random();
    if (levelRand < 0.5) memberLevel = 'bronze';
    else if (levelRand < 0.8) memberLevel = 'silver';
    else if (levelRand < 0.95) memberLevel = 'gold';
    else memberLevel = 'platinum';
  }
  
  return new Customer(selectedType.toLowerCase(), isMember, memberLevel);
}

export function calculateDailyCustomerCount() {
  const state = getGameState();
  let baseCount = GAME_CONFIG.BASE_CUSTOMERS_PER_DAY;
  
  baseCount *= (0.5 + state.popularity / 100);
  baseCount *= (0.7 + state.reputation / 100 * 0.6);
  
  if (state.currentActivity) {
    const activity = state.currentActivity;
    baseCount *= activity.customerBoost || 1;
  }
  
  baseCount *= (0.8 + state.seatCount / 20 * 0.4);
  baseCount *= (0.9 + state.staffCount / 5 * 0.3);
  
  return Math.floor(baseCount * (0.8 + Math.random() * 0.4));
}
