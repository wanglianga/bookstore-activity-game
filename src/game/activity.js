import { ACTIVITY_TYPES, CRISIS_TYPES, CRISIS_OPTIONS, GAME_CONFIG } from './config.js';
import { getGameState } from './state.js';

export class ActivityManager {
  constructor() {
    this.scheduledActivities = [];
    this.crisisChecked = false;
  }

  canStartActivity(activityType) {
    const state = getGameState();
    const activity = ACTIVITY_TYPES[activityType];
    
    if (!activity) return { can: false, reason: '活动类型不存在' };
    if (state.currentActivity) return { can: false, reason: '已有活动进行中' };
    if (!state.canAfford(activity.cost)) return { can: false, reason: '资金不足' };
    if (state.usedSpace + activity.spaceUsed > state.maxSpace) {
      return { can: false, reason: '空间不足' };
    }
    
    return { can: true };
  }

  startActivity(activityType) {
    const state = getGameState();
    const check = this.canStartActivity(activityType);
    
    if (!check.can) {
      return { success: false, reason: check.reason };
    }
    
    const activity = ACTIVITY_TYPES[activityType];
    
    state.subtractMoney(activity.cost);
    state.currentActivity = { ...activity, startTime: state.hour, typeKey: activityType };
    state.usedSpace += activity.spaceUsed;
    state.activityEndTime = state.hour + activity.duration;
    state.crisisChecked = false;
    
    state.addPopularity(activity.popularityGain * 0.3);
    
    state.updateSpaceCompression();
    
    if (activity.boostedCategory && state.displayConfig[activity.boostedCategory]) {
      state.setDisplayProminent(activity.boostedCategory, true);
    }
    
    return { success: true, activity };
  }

  update(deltaHours) {
    const state = getGameState();
    
    if (state.currentActivity && state.hour >= state.activityEndTime) {
      this.endActivity();
    }
    
    if (state.currentActivity && !state.crisisActive && !state.crisisChecked) {
      this.checkCrisis();
    }
  }

  checkCrisis() {
    const state = getGameState();
    
    if (!state.currentActivity || !state.currentActivity.canCrisis) return;
    if (state.crisisChecked) return;
    
    const hour = state.hour;
    if (hour < GAME_CONFIG.CRISIS_MIN_HOUR || hour > GAME_CONFIG.CRISIS_MAX_HOUR) {
      if (hour > GAME_CONFIG.CRISIS_MAX_HOUR) {
        state.crisisChecked = true;
      }
      return;
    }
    
    state.crisisChecked = true;
    
    if (Math.random() < GAME_CONFIG.CRISIS_CHANCE) {
      this.triggerCrisis();
    }
  }

  triggerCrisis() {
    const state = getGameState();
    
    const crisisType = CRISIS_TYPES.INSTRUCTOR_CANCEL;
    
    state.crisisActive = true;
    state.currentCrisis = {
      type: crisisType,
      activity: { ...state.currentActivity },
      timestamp: state.hour,
      options: this.getCrisisOptions(),
    };
    state.isPaused = true;
    
    if (this.onCrisisTrigger) {
      this.onCrisisTrigger(state.currentCrisis);
    }
  }

  getCrisisOptions() {
    const state = getGameState();
    const options = [];
    
    const staffSharing = CRISIS_OPTIONS.STAFF_SHARING;
    const eventStaffBonus = state.getStaffBonus('EVENT_STAFF');
    const adjustedStaffSharing = {
      ...staffSharing,
      trustChange: staffSharing.trustChange + (eventStaffBonus * 5),
      reputationChange: staffSharing.reputationChange + (eventStaffBonus * 3),
      desc: eventStaffBonus > 0
        ? '有活动专员的店员代替讲师进行分享（效果提升）'
        : staffSharing.desc,
    };
    options.push(adjustedStaffSharing);
    
    options.push(CRISIS_OPTIONS.POSTPONE);
    options.push(CRISIS_OPTIONS.REFUND);
    
    return options;
  }

  resolveCrisis(optionId) {
    const state = getGameState();
    
    if (!state.crisisActive || !state.currentCrisis) {
      return { success: false, reason: '没有进行中的危机事件' };
    }
    
    const option = CRISIS_OPTIONS[optionId];
    if (!option) {
      return { success: false, reason: '无效的处理方案' };
    }
    
    const activity = state.currentActivity;
    const eventStaffBonus = state.getStaffBonus('EVENT_STAFF');
    
    let trustChange = option.trustChange;
    let reputationChange = option.reputationChange;
    let popularityChange = option.popularityChange;
    
    if (optionId === 'STAFF_SHARING' && eventStaffBonus > 0) {
      trustChange += eventStaffBonus * 5;
      reputationChange += eventStaffBonus * 3;
    }
    
    state.addReputation(reputationChange);
    state.addPopularity(popularityChange);
    
    for (const member of state.members) {
      const memberTrustImpact = trustChange * option.memberTrustMultiplier;
      member.totalSpend = Math.max(0, member.totalSpend + memberTrustImpact);
    }
    
    if (option.costRefund > 0) {
      const refundAmount = activity.cost * option.costRefund;
      state.addMoney(refundAmount);
    }
    
    if (option.incomeRatio > 0 && activity.cost > 0) {
      const partialIncome = activity.cost * option.incomeRatio * 0.5;
      state.addMoney(partialIncome);
    }
    
    state.crisisActive = false;
    state.crisisResolved = true;
    state.currentCrisis = null;
    state.isPaused = false;
    
    if (optionId === 'REFUND') {
      this.endActivity();
    }
    
    if (this.onCrisisResolved) {
      this.onCrisisResolved(option, trustChange);
    }
    
    return { success: true, option, trustChange, reputationChange, popularityChange };
  }

  endActivity() {
    const state = getGameState();
    if (!state.currentActivity) return;
    
    const activity = state.currentActivity;
    
    if (!state.crisisResolved) {
      state.addReputation(activity.reputationGain);
      state.addPopularity(activity.popularityGain * 0.7);
    }
    
    state.usedSpace -= activity.spaceUsed;
    state.updateSpaceCompression();
    
    const endedActivity = state.currentActivity;
    state.currentActivity = null;
    
    return endedActivity;
  }

  getActivityEffect() {
    const state = getGameState();
    if (!state.currentActivity) return null;
    
    const activity = state.currentActivity;
    const progress = (state.hour - activity.startTime) / activity.duration;
    
    return {
      activity,
      progress: Math.min(1, Math.max(0, progress)),
      remainingTime: Math.max(0, state.activityEndTime - state.hour),
    };
  }

  getAvailableActivities() {
    return Object.keys(ACTIVITY_TYPES).map(key => {
      const activity = ACTIVITY_TYPES[key];
      const check = this.canStartActivity(key);
      return {
        ...activity,
        key,
        canStart: check.can,
        reason: check.reason,
      };
    });
  }
}

let activityManager = null;

export function getActivityManager() {
  if (!activityManager) {
    activityManager = new ActivityManager();
  }
  return activityManager;
}
