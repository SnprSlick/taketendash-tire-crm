'use client';

import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface ReminderRule {
  id: string;
  serviceType: string;
  daysAfterService: number;
  reminderFrequency: 'ONCE' | 'WEEKLY' | 'MONTHLY';
  communicationMethod: 'EMAIL' | 'SMS' | 'PHONE' | 'ALL';
  isActive: boolean;
  message?: string;
}

interface ReminderConfigProps {
  onSave?: (config: ReminderConfiguration) => void;
  onGenerateReminders?: (config: { daysAhead: number; serviceTypes?: string[] }) => void;
  loading?: boolean;
}

interface ReminderConfiguration {
  globalSettings: {
    enableAutoReminders: boolean;
    defaultCommunicationMethod: 'EMAIL' | 'SMS' | 'PHONE' | 'ALL';
    businessHours: {
      start: string;
      end: string;
    };
    defaultDaysAhead: number;
  };
  rules: ReminderRule[];
  schedulerSettings: {
    dailyGenerationTime: string;
    weeklyReviewDay: number; // 0-6, Sunday = 0
    monthlyReportDay: number; // 1-31
  };
}

const defaultConfig: ReminderConfiguration = {
  globalSettings: {
    enableAutoReminders: true,
    defaultCommunicationMethod: 'EMAIL',
    businessHours: {
      start: '08:00',
      end: '18:00'
    },
    defaultDaysAhead: 30
  },
  rules: [
    {
      id: '1',
      serviceType: 'Oil Change',
      daysAfterService: 90,
      reminderFrequency: 'ONCE',
      communicationMethod: 'EMAIL',
      isActive: true,
      message: 'Your vehicle is due for an oil change. Please schedule your appointment.'
    },
    {
      id: '2',
      serviceType: 'Tire Rotation',
      daysAfterService: 180,
      reminderFrequency: 'ONCE',
      communicationMethod: 'EMAIL',
      isActive: true,
      message: 'Time for a tire rotation to ensure even wear and extend tire life.'
    },
    {
      id: '3',
      serviceType: 'Brake Service',
      daysAfterService: 365,
      reminderFrequency: 'ONCE',
      communicationMethod: 'ALL',
      isActive: true,
      message: 'Annual brake inspection recommended for your safety.'
    }
  ],
  schedulerSettings: {
    dailyGenerationTime: '06:00',
    weeklyReviewDay: 1, // Monday
    monthlyReportDay: 1
  }
};

export default function ReminderConfig({ onSave, onGenerateReminders, loading = false }: ReminderConfigProps) {
  const [config, setConfig] = useState<ReminderConfiguration>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'global' | 'rules' | 'scheduler'>('global');
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<ReminderRule> | null>(null);

  const handleSave = () => {
    onSave?.(config);
  };

  const handleGenerateNow = () => {
    onGenerateReminders?.({
      daysAhead: config.globalSettings.defaultDaysAhead,
      serviceTypes: config.rules.filter(r => r.isActive).map(r => r.serviceType)
    });
  };

  const updateGlobalSetting = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        [key]: value
      }
    }));
  };

  const updateRule = (ruleId: string, updates: Partial<ReminderRule>) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const addRule = () => {
    if (!newRule || !newRule.serviceType) return;

    const rule: ReminderRule = {
      id: Date.now().toString(),
      serviceType: newRule.serviceType,
      daysAfterService: newRule.daysAfterService || 90,
      reminderFrequency: newRule.reminderFrequency || 'ONCE',
      communicationMethod: newRule.communicationMethod || 'EMAIL',
      isActive: true,
      message: newRule.message || `Your ${newRule.serviceType.toLowerCase()} service is due.`
    };

    setConfig(prev => ({
      ...prev,
      rules: [...prev.rules, rule]
    }));

    setNewRule(null);
  };

  const deleteRule = (ruleId: string) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const toggleRule = (ruleId: string) => {
    updateRule(ruleId, { isActive: !config.rules.find(r => r.id === ruleId)?.isActive });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Reminder Configuration</h2>
              <p className="text-slate-600">Manage automated service reminder settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGenerateNow}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Generate Now
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { key: 'global', label: 'Global Settings', icon: <Settings className="w-4 h-4" /> },
            { key: 'rules', label: 'Reminder Rules', icon: <Bell className="w-4 h-4" /> },
            { key: 'scheduler', label: 'Scheduler', icon: <Clock className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'global' && (
            <GlobalSettings
              settings={config.globalSettings}
              onUpdate={updateGlobalSetting}
            />
          )}

          {activeTab === 'rules' && (
            <ReminderRules
              rules={config.rules}
              onUpdateRule={updateRule}
              onToggleRule={toggleRule}
              onDeleteRule={deleteRule}
              onAddRule={addRule}
              editingRule={editingRule}
              setEditingRule={setEditingRule}
              newRule={newRule}
              setNewRule={setNewRule}
            />
          )}

          {activeTab === 'scheduler' && (
            <SchedulerSettings
              settings={config.schedulerSettings}
              onUpdate={(key, value) => setConfig(prev => ({
                ...prev,
                schedulerSettings: { ...prev.schedulerSettings, [key]: value }
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface GlobalSettingsProps {
  settings: ReminderConfiguration['globalSettings'];
  onUpdate: (key: string, value: any) => void;
}

function GlobalSettings({ settings, onUpdate }: GlobalSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="w-5 h-5 text-blue-600" />
        <span className="text-sm text-blue-800">
          These settings apply to all reminder rules unless overridden at the rule level.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto Reminders */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-700">Enable Auto Reminders</span>
              <p className="text-xs text-slate-500">Automatically generate and send reminders</p>
            </div>
            <button
              onClick={() => onUpdate('enableAutoReminders', !settings.enableAutoReminders)}
              className="flex items-center"
            >
              {settings.enableAutoReminders ? (
                <ToggleRight className="w-8 h-8 text-green-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </label>
        </div>

        {/* Default Communication Method */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Default Communication Method
          </label>
          <select
            value={settings.defaultCommunicationMethod}
            onChange={(e) => onUpdate('defaultCommunicationMethod', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="EMAIL">📧 Email</option>
            <option value="SMS">💬 SMS</option>
            <option value="PHONE">📞 Phone</option>
            <option value="ALL">🔔 All Methods</option>
          </select>
        </div>

        {/* Business Hours */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Business Hours
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="time"
              value={settings.businessHours.start}
              onChange={(e) => onUpdate('businessHours', { ...settings.businessHours, start: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-slate-500">to</span>
            <input
              type="time"
              value={settings.businessHours.end}
              onChange={(e) => onUpdate('businessHours', { ...settings.businessHours, end: e.target.value })}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Default Days Ahead */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Default Generation Range (Days)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={settings.defaultDaysAhead}
            onChange={(e) => onUpdate('defaultDaysAhead', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500">
            How far ahead to generate reminders when running batch jobs
          </p>
        </div>
      </div>
    </div>
  );
}

interface ReminderRulesProps {
  rules: ReminderRule[];
  onUpdateRule: (ruleId: string, updates: Partial<ReminderRule>) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddRule: () => void;
  editingRule: string | null;
  setEditingRule: (ruleId: string | null) => void;
  newRule: Partial<ReminderRule> | null;
  setNewRule: (rule: Partial<ReminderRule> | null) => void;
}

function ReminderRules({
  rules,
  onUpdateRule,
  onToggleRule,
  onDeleteRule,
  onAddRule,
  editingRule,
  setEditingRule,
  newRule,
  setNewRule
}: ReminderRulesProps) {
  return (
    <div className="space-y-6">
      {/* Add New Rule */}
      <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-700">Add New Reminder Rule</h4>
          {newRule ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onAddRule}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Add
              </button>
              <button
                onClick={() => setNewRule(null)}
                className="inline-flex items-center px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNewRule({ serviceType: '', daysAfterService: 90 })}
              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Rule
            </button>
          )}
        </div>

        {newRule && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Service Type"
              value={newRule.serviceType || ''}
              onChange={(e) => setNewRule({ ...newRule, serviceType: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Days After Service"
              value={newRule.daysAfterService || ''}
              onChange={(e) => setNewRule({ ...newRule, daysAfterService: parseInt(e.target.value) })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newRule.communicationMethod || 'EMAIL'}
              onChange={(e) => setNewRule({ ...newRule, communicationMethod: e.target.value as any })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="PHONE">Phone</option>
              <option value="ALL">All</option>
            </select>
            <select
              value={newRule.reminderFrequency || 'ONCE'}
              onChange={(e) => setNewRule({ ...newRule, reminderFrequency: e.target.value as any })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ONCE">Once</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        )}
      </div>

      {/* Existing Rules */}
      <div className="space-y-4">
        {rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            editing={editingRule === rule.id}
            onEdit={() => setEditingRule(rule.id)}
            onSave={(updates) => {
              onUpdateRule(rule.id, updates);
              setEditingRule(null);
            }}
            onCancel={() => setEditingRule(null)}
            onToggle={() => onToggleRule(rule.id)}
            onDelete={() => onDeleteRule(rule.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface RuleCardProps {
  rule: ReminderRule;
  editing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<ReminderRule>) => void;
  onCancel: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function RuleCard({ rule, editing, onEdit, onSave, onCancel, onToggle, onDelete }: RuleCardProps) {
  const [editData, setEditData] = useState(rule);

  const handleSave = () => {
    onSave(editData);
  };

  if (editing) {
    return (
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Service Type</label>
            <input
              type="text"
              value={editData.serviceType}
              onChange={(e) => setEditData({ ...editData, serviceType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Days After Service</label>
            <input
              type="number"
              value={editData.daysAfterService}
              onChange={(e) => setEditData({ ...editData, daysAfterService: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Communication Method</label>
            <select
              value={editData.communicationMethod}
              onChange={(e) => setEditData({ ...editData, communicationMethod: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="PHONE">Phone</option>
              <option value="ALL">All</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
            <select
              value={editData.reminderFrequency}
              onChange={(e) => setEditData({ ...editData, reminderFrequency: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="ONCE">Once</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">Custom Message (Optional)</label>
          <textarea
            value={editData.message || ''}
            onChange={(e) => setEditData({ ...editData, message: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Custom reminder message..."
          />
        </div>

        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${rule.isActive ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-medium text-slate-800">{rule.serviceType}</h4>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              rule.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {rule.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-slate-600">
            <span>📅 {rule.daysAfterService} days</span>
            <span>🔄 {rule.reminderFrequency}</span>
            <span>{getCommunicationIcon(rule.communicationMethod)} {rule.communicationMethod}</span>
          </div>

          {rule.message && (
            <p className="text-sm text-slate-600 mt-2 italic">"{rule.message}"</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-slate-100 rounded"
          >
            {rule.isActive ? (
              <ToggleRight className="w-5 h-5 text-green-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <Edit className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );

  function getCommunicationIcon(method: string) {
    switch (method) {
      case 'EMAIL': return '📧';
      case 'SMS': return '💬';
      case 'PHONE': return '📞';
      case 'ALL': return '🔔';
      default: return '📧';
    }
  }
}

interface SchedulerSettingsProps {
  settings: ReminderConfiguration['schedulerSettings'];
  onUpdate: (key: string, value: any) => void;
}

function SchedulerSettings({ settings, onUpdate }: SchedulerSettingsProps) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <span className="text-sm text-amber-800">
          Changes to scheduler settings will take effect on the next scheduled run.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Generation Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Daily Generation Time
          </label>
          <input
            type="time"
            value={settings.dailyGenerationTime}
            onChange={(e) => onUpdate('dailyGenerationTime', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500">
            Time to run daily reminder generation job
          </p>
        </div>

        {/* Weekly Review Day */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Weekly Review Day
          </label>
          <select
            value={settings.weeklyReviewDay}
            onChange={(e) => onUpdate('weeklyReviewDay', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dayNames.map((day, index) => (
              <option key={index} value={index}>{day}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Day to run weekly comprehensive analysis
          </p>
        </div>

        {/* Monthly Report Day */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Monthly Report Day
          </label>
          <select
            value={settings.monthlyReportDay}
            onChange={(e) => onUpdate('monthlyReportDay', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Day of month to run monthly tire-specific reminders
          </p>
        </div>
      </div>

      {/* Schedule Summary */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-800 mb-3">Current Schedule</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Daily Generation:</span>
            <span className="font-medium">Every day at {settings.dailyGenerationTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Weekly Review:</span>
            <span className="font-medium">Every {dayNames[settings.weeklyReviewDay]} at 7:00 AM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Monthly Reminders:</span>
            <span className="font-medium">{settings.monthlyReportDay}{getOrdinalSuffix(settings.monthlyReportDay)} of each month at 8:00 AM</span>
          </div>
        </div>
      </div>
    </div>
  );

  function getOrdinalSuffix(day: number) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
}