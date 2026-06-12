import { getGameState } from '../game/state.js';
import { getGameEngine } from '../game/engine.js';
import { getActivityManager } from '../game/activity.js';
import { ACTIVITY_TYPES, BOOK_CATEGORIES } from '../game/config.js';

export class UIManager {
  constructor() {
    this.state = getGameState();
    this.engine = getGameEngine();
    this.activityManager = getActivityManager();
    
    this.uiLayer = document.getElementById('ui-layer');
    this.notifications = [];
    this.currentTab = 'activity';
    
    this.init();
  }

  init() {
    this.createTopBar();
    this.createSidePanel();
    this.createBottomInfo();
    this.createDayStartModal();
  }

  createTopBar() {
    const topBar = document.createElement('div');
    topBar.className = 'top-bar';
    topBar.id = 'top-bar';
    
    topBar.innerHTML = `
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">资金</span>
          <span class="stat-value money" id="stat-money">¥5,000</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">人气</span>
          <span class="stat-value" id="stat-popularity">50</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">口碑</span>
          <span class="stat-value" id="stat-reputation">60</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日顾客</span>
          <span class="stat-value" id="stat-customers">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日销售</span>
          <span class="stat-value money" id="stat-sales">¥0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">会员数</span>
          <span class="stat-value" id="stat-members">0</span>
        </div>
      </div>
      <div class="day-control">
        <div class="day-info">
          <div class="day-number" id="day-number">第 1 天</div>
          <div class="day-time" id="day-time">09:00</div>
        </div>
        <button class="btn btn-primary" id="btn-start-day">开始营业</button>
        <button class="btn btn-secondary" id="btn-pause" style="display:none;">暂停</button>
      </div>
    `;
    
    this.uiLayer.appendChild(topBar);
    
    document.getElementById('btn-start-day').addEventListener('click', () => {
      this.startDay();
    });
    
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });
  }

  createSidePanel() {
    const sidePanel = document.createElement('div');
    sidePanel.className = 'side-panel';
    sidePanel.id = 'side-panel';
    
    sidePanel.innerHTML = `
      <div class="panel-title">经营管理</div>
      
      <div class="tab-buttons">
        <button class="tab-btn active" data-tab="activity">活动</button>
        <button class="tab-btn" data-tab="inventory">进货</button>
        <button class="tab-btn" data-tab="staff">人员</button>
        <button class="tab-btn" data-tab="stats">统计</button>
      </div>
      
      <div id="tab-content">
      </div>
    `;
    
    this.uiLayer.appendChild(sidePanel);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    this.switchTab('activity');
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    const content = document.getElementById('tab-content');
    
    switch(tab) {
      case 'activity':
        this.renderActivityTab(content);
        break;
      case 'inventory':
        this.renderInventoryTab(content);
        break;
      case 'staff':
        this.renderStaffTab(content);
        break;
      case 'stats':
        this.renderStatsTab(content);
        break;
    }
  }

  renderActivityTab(container) {
    const activities = this.activityManager.getAvailableActivities();
    const state = this.state;
    
    let html = '<div class="panel-section">';
    html += '<div class="panel-section-title">今日活动</div>';
    
    if (state.currentActivity) {
      const act = state.currentActivity;
      const progress = ((state.hour - act.startTime) / act.duration * 100).toFixed(0);
      html += `
        <div class="activity-card active">
          <div class="activity-name">${act.name}（进行中）</div>
          <div class="activity-desc">${act.desc}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="activity-cost">剩余 ${(state.activityEndTime - state.hour).toFixed(1)} 小时</div>
        </div>
      `;
    } else {
      html += '<div style="color: #a0896c; font-size: 12px; margin-bottom: 10px;">暂无活动进行中</div>';
    }
    
    html += '</div>';
    
    html += '<div class="panel-section">';
    html += '<div class="panel-section-title">可举办活动</div>';
    
    activities.forEach(act => {
      const disabledClass = act.canStart ? '' : 'disabled';
      html += `
        <div class="activity-card ${disabledClass}" data-activity="${act.key}" style="${!act.canStart ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          <div class="activity-name">${act.name}</div>
          <div class="activity-desc">${act.desc}</div>
          <div class="activity-cost">费用: ¥${act.cost} | 人气+${act.popularityGain} | 空间: ${act.spaceUsed}%</div>
          ${!act.canStart ? `<div style="color: #ff6b6b; font-size: 11px; margin-top: 4px;">${act.reason}</div>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    container.querySelectorAll('.activity-card[data-activity]').forEach(card => {
      card.addEventListener('click', () => {
        const actKey = card.dataset.activity;
        this.startActivity(actKey);
      });
    });
  }

  renderInventoryTab(container) {
    const state = this.state;
    
    let html = '<div class="panel-section">';
    html += '<div class="panel-section-title">图书库存</div>';
    
    Object.keys(BOOK_CATEGORIES).forEach(key => {
      const cat = BOOK_CATEGORIES[key];
      const stock = state.inventory[key] || 0;
      const lowStock = stock < 10;
      
      html += `
        <div class="activity-card" data-category="${key}">
          <div class="activity-name">${cat.name}</div>
          <div class="activity-desc">
            库存: <span style="color: ${lowStock ? '#ff6b6b' : '#4a7c4a'}">${stock} 本</span>
            | 进价: ¥${(cat.basePrice * 0.6).toFixed(0)}
            | 售价: ¥${cat.basePrice}
          </div>
          <div style="margin-top: 8px;">
            <button class="manage-btn add" data-action="buy-10" style="width: auto; padding: 4px 8px; font-size: 11px;">+10本</button>
            <button class="manage-btn add" data-action="buy-30" style="width: auto; padding: 4px 8px; font-size: 11px;">+30本</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    container.querySelectorAll('.activity-card').forEach(card => {
      const category = card.dataset.category;
      
      card.querySelector('[data-action="buy-10"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.buyBooks(category, 10);
      });
      
      card.querySelector('[data-action="buy-30"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.buyBooks(category, 30);
      });
    });
  }

  renderStaffTab(container) {
    const state = this.state;
    
    let html = '<div class="panel-section">';
    html += '<div class="panel-section-title">人员配置</div>';
    
    html += `
      <div class="management-grid">
        <div class="manage-item">
          <div class="manage-item-name">员工数量</div>
          <div class="manage-item-value">${state.staffCount} 人</div>
          <div class="manage-buttons">
            <button class="manage-btn remove" id="btn-fire-staff">-</button>
            <button class="manage-btn add" id="btn-hire-staff">+</button>
          </div>
          <div style="font-size: 10px; color: #a0896c; margin-top: 4px;">日薪 ¥150/人</div>
        </div>
        
        <div class="manage-item">
          <div class="manage-item-name">座位数量</div>
          <div class="manage-item-value">${state.seatCount} 个</div>
          <div class="manage-buttons">
            <button class="manage-btn remove" id="btn-remove-seats">-</button>
            <button class="manage-btn add" id="btn-add-seats">+</button>
          </div>
          <div style="font-size: 10px; color: #a0896c; margin-top: 4px;">+2座位 ¥100</div>
        </div>
      </div>
    `;
    
    html += '</div>';
    
    html += '<div class="panel-section">';
    html += '<div class="panel-section-title">空间使用</div>';
    html += `
      <div style="margin-bottom: 8px;">
        <span>已使用: ${state.usedSpace}%</span>
        <span style="float: right;">总空间: 100%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${state.usedSpace > 70 ? 'warn' : ''} ${state.usedSpace > 90 ? 'danger' : ''}" 
             style="width: ${state.usedSpace}%"></div>
      </div>
      <div style="font-size: 11px; color: #a0896c; margin-top: 6px;">
        活动会占用卖场空间，影响客流量
      </div>
    `;
    html += '</div>';
    
    container.innerHTML = html;
    
    document.getElementById('btn-hire-staff').addEventListener('click', () => {
      this.hireStaff();
    });
    
    document.getElementById('btn-fire-staff').addEventListener('click', () => {
      this.fireStaff();
    });
    
    document.getElementById('btn-add-seats').addEventListener('click', () => {
      this.addSeats();
    });
    
    document.getElementById('btn-remove-seats').addEventListener('click', () => {
      this.removeSeats();
    });
  }

  renderStatsTab(container) {
    const state = this.state;
    
    let html = '<div class="panel-section">';
    html += '<div class="panel-section-title">经营数据</div>';
    
    html += `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">累计销售额</span>
          <span style="color: #ffd700;">¥${state.totalSales.toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">累计顾客</span>
          <span>${state.totalCustomers} 人</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">活跃会员</span>
          <span>${state.activeMembers} 人</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">日均租金</span>
          <span style="color: #ff6b6b;">¥${state.dailyRent}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">员工日薪总额</span>
          <span style="color: #ff6b6b;">¥${state.staffCount * 150}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4a574;">每日固定支出</span>
          <span style="color: #ff6b6b; font-weight: bold;">¥${state.dailyRent + state.staffCount * 150}</span>
        </div>
      </div>
    `;
    
    html += '</div>';
    
    if (state.history.length > 0) {
      html += '<div class="panel-section">';
      html += '<div class="panel-section-title">历史记录</div>';
      
      const recentHistory = state.history.slice(-5).reverse();
      recentHistory.forEach(record => {
        html += `
          <div class="activity-card" style="margin-bottom: 6px; padding: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #ffd700;">第 ${record.day} 天</span>
              <span>销售: ¥${record.sales.toFixed(0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a0896c; margin-top: 2px;">
              <span>顾客: ${record.customers}人</span>
              <span>新会员: ${record.newMembers}人</span>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    container.innerHTML = html;
  }

  createBottomInfo() {
    const bottomInfo = document.createElement('div');
    bottomInfo.className = 'bottom-info';
    bottomInfo.id = 'bottom-info';
    
    bottomInfo.innerHTML = `
      <div class="info-title">欢迎来到书香阁</div>
      <div class="info-content">
        点击"开始营业"开始新的一天。合理安排活动、进货和人员配置，在租金压力下提升销售额和会员活跃度！
      </div>
    `;
    
    this.uiLayer.appendChild(bottomInfo);
  }

  createDayStartModal() {
  }

  startDay() {
    const success = this.engine.startDay();
    if (success) {
      document.getElementById('btn-start-day').style.display = 'none';
      document.getElementById('btn-pause').style.display = 'inline-block';
      
      this.showNotification('开始营业！', 'success');
      this.switchTab(this.currentTab);
    }
  }

  togglePause() {
    const isPaused = this.engine.togglePause();
    document.getElementById('btn-pause').textContent = isPaused ? '继续' : '暂停';
  }

  startActivity(activityKey) {
    const result = this.activityManager.startActivity(activityKey.toUpperCase());
    if (result.success) {
      this.showNotification(`${result.activity.name} 开始了！`, 'success');
      this.switchTab(this.currentTab);
      this.updateStats();
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  buyBooks(category, quantity) {
    const result = this.engine.buyBooks(category, quantity);
    if (result.success) {
      this.showNotification(`购进 ${quantity} 本图书，花费 ¥${result.cost.toFixed(0)}`, 'success');
      this.updateStats();
      this.switchTab('inventory');
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  hireStaff() {
    const result = this.engine.hireStaff();
    if (result.success) {
      this.showNotification('雇佣了一名新员工', 'success');
      this.updateStats();
      this.switchTab('staff');
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  fireStaff() {
    const result = this.engine.fireStaff();
    if (result.success) {
      this.showNotification('减少了一名员工', 'warning');
      this.updateStats();
      this.switchTab('staff');
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  addSeats() {
    const result = this.engine.addSeats();
    if (result.success) {
      this.showNotification('增加了2个座位', 'success');
      this.updateStats();
      this.switchTab('staff');
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  removeSeats() {
    const result = this.engine.removeSeats();
    if (result.success) {
      this.showNotification('减少了2个座位', 'warning');
      this.updateStats();
      this.switchTab('staff');
    } else {
      this.showNotification(result.reason, 'error');
    }
  }

  updateStats() {
    const state = this.state;
    
    document.getElementById('stat-money').textContent = `¥${state.money.toFixed(0)}`;
    document.getElementById('stat-popularity').textContent = state.popularity.toFixed(0);
    document.getElementById('stat-reputation').textContent = state.reputation.toFixed(0);
    document.getElementById('stat-customers').textContent = state.dailyCustomers;
    document.getElementById('stat-sales').textContent = `¥${state.dailySales.toFixed(0)}`;
    document.getElementById('stat-members').textContent = state.activeMembers;
    
    document.getElementById('day-number').textContent = `第 ${state.day} 天`;
    document.getElementById('day-time').textContent = state.timeString;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.uiLayer.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 2000);
    
    this.notifications.push(notification);
  }

  showDayEndSummary(result) {
    const { expenses, dayRecord } = result;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'day-end-modal';
    
    const netProfit = dayRecord.sales - expenses;
    const profitClass = netProfit >= 0 ? 'success' : 'error';
    
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title">第 ${dayRecord.day} 天 营业结束</div>
        <div class="modal-content">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>今日销售额</span>
            <span style="color: #ffd700;">¥${dayRecord.sales.toFixed(0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>今日顾客</span>
            <span>${dayRecord.customers} 人</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>新增会员</span>
            <span style="color: #4a90d9;">${dayRecord.newMembers} 人</span>
          </div>
          <div style="border-top: 1px solid #6b4423; padding-top: 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>租金</span>
              <span style="color: #ff6b6b;">-¥${this.state.dailyRent}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>员工薪资</span>
              <span style="color: #ff6b6b;">-¥${this.state.staffCount * 150}</span>
            </div>
          </div>
          <div style="border-top: 1px solid #8b6914; padding-top: 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
              <span>今日净利润</span>
              <span style="color: ${netProfit >= 0 ? '#4a7c4a' : '#ff6b6b'};">
                ${netProfit >= 0 ? '+' : ''}¥${netProfit.toFixed(0)}
              </span>
            </div>
          </div>
          <div style="margin-top: 15px; padding: 10px; background: rgba(139, 105, 20, 0.2); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>人气值</span>
              <span>${dayRecord.popularity.toFixed(0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>口碑值</span>
              <span>${dayRecord.reputation.toFixed(0)}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="btn-next-day">进入下一天</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(modal);
    
    document.getElementById('btn-next-day').addEventListener('click', () => {
      modal.remove();
      this.startNextDay();
    });
    
    document.getElementById('btn-start-day').style.display = 'inline-block';
    document.getElementById('btn-pause').style.display = 'none';
  }

  startNextDay() {
    if (this.state.gameOver) {
      this.showGameOver();
      return;
    }
    this.updateStats();
    this.switchTab(this.currentTab);
  }

  showGameOver() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title" style="color: #ff6b6b;">游戏结束</div>
        <div class="modal-content" style="text-align: center;">
          <p style="margin-bottom: 15px;">你的书店因资金不足而倒闭了...</p>
          <p>经营天数: <strong>${this.state.day - 1} 天</strong></p>
          <p>累计销售额: <strong style="color: #ffd700;">¥${this.state.totalSales.toFixed(0)}</strong></p>
          <p>累计顾客: <strong>${this.state.totalCustomers} 人</strong></p>
          <p>活跃会员: <strong>${this.state.activeMembers} 人</strong></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="location.reload()">重新开始</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(modal);
  }

  update() {
    this.updateStats();
    
    if (this.currentTab === 'activity' && this.state.currentActivity) {
      const progressBars = document.querySelectorAll('#tab-content .progress-fill');
      if (progressBars.length > 0) {
        const act = this.state.currentActivity;
        const progress = ((this.state.hour - act.startTime) / act.duration * 100).toFixed(0);
        progressBars[0].style.width = `${progress}%`;
      }
    }
  }
}

let uiManager = null;

export function getUIManager() {
  return uiManager;
}

export function initUIManager() {
  uiManager = new UIManager();
  return uiManager;
}
