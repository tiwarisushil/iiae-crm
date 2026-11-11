import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ToggleLeft, ToggleRight, CheckSquare, ShieldCheck, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DownloadSettingsPage = () => {
  const [settings, setSettings] = useState({
    admitCardEnabled: false,
    resultEnabled: false,
    counsellingLetterEnabled: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load portal configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field) => {
    const updatedSettings = {
      ...settings,
      [field]: !settings[field]
    };

    // Optimistic UI update
    setSettings(updatedSettings);

    try {
      await api.put('/settings', updatedSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      // Rollback on error
      setSettings(settings);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-blue-600" /> Download & Visibility Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">Configure global switches that toggle active feature downloads on the student dashboard portal.</p>
      </div>

      {/* Switches Grid */}
      <div className="divide-y divide-slate-200 max-w-2xl">
        {/* Toggle 1: Admit Card */}
        <div className="flex items-center justify-between py-5 first:pt-0">
          <div className="space-y-1 pr-6">
            <h3 className="text-sm font-bold text-slate-900">Entrance Admit Card On/Off</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Allow candidates to view and download their generated entrance examination admit cards.
            </p>
          </div>
          <button
            onClick={() => handleToggle('admitCardEnabled')}
            className="focus:outline-none cursor-pointer shrink-0 transition-colors"
          >
            {settings.admitCardEnabled ? (
              <ToggleRight className="w-12 h-12 text-blue-600 fill-blue-50" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-slate-300 fill-slate-50" />
            )}
          </button>
        </div>

        {/* Toggle 2: Result */}
        <div className="flex items-center justify-between py-5">
          <div className="space-y-1 pr-6">
            <h3 className="text-sm font-bold text-slate-900">Entrance Result On/Off</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Publish entrance exam marks, percentages, and remark scorecards for candidates.
            </p>
          </div>
          <button
            onClick={() => handleToggle('resultEnabled')}
            className="focus:outline-none cursor-pointer shrink-0 transition-colors"
          >
            {settings.resultEnabled ? (
              <ToggleRight className="w-12 h-12 text-blue-600 fill-blue-50" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-slate-300 fill-slate-50" />
            )}
          </button>
        </div>

        {/* Toggle 3: Counselling Letter */}
        <div className="flex items-center justify-between py-5 last:pb-0">
          <div className="space-y-1 pr-6">
            <h3 className="text-sm font-bold text-slate-900">Counselling Letter On/Off</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Enable download of student counselling letters, batch allocations, and merit instructions.
            </p>
          </div>
          <button
            onClick={() => handleToggle('counsellingLetterEnabled')}
            className="focus:outline-none cursor-pointer shrink-0 transition-colors"
          >
            {settings.counsellingLetterEnabled ? (
              <ToggleRight className="w-12 h-12 text-blue-600 fill-blue-50" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-slate-300 fill-slate-50" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadSettingsPage;
