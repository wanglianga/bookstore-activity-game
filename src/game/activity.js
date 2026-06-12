import { ACTIVITY_TYPES } from './config.js';
import { getGameState } from './state.js';

export class ActivityManager {
  constructor() {
    this.scheduledActivities = [];
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
    state.currentActivity = { ...activity, startTime: state.hour };
    state.usedSpace += activity.spaceUsed;
    state.activityEndTime = state.hour + activity.duration;
    
    state.addPopularity(activity.popularityGain * 0.3);
    
    return { success: true, activity };
  }

  update(deltaHours) {
    const state = getGameState();
    
    if (state.currentActivity && state.hour >= state.activityEndTime) {
      this.endActivity();
    }
  }

  endActivity() {
    const state = getGameState();
    if (!state.currentActivity) return;
    
    const activity = state.currentActivity;
    
    state.addReputation(activity.reputationGain);
    state.addPopularity(activity.popularityGain * 0.7);
    state.usedSpace -= activity.spaceUsed;
    
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
