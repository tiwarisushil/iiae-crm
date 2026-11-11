import React from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import MetaLeadsIntegration from '../components/integrations/MetaLeadsIntegration';
import GoogleAdsIntegration from '../components/integrations/GoogleAdsIntegration';
import { FacebookIcon, GoogleAdsIcon } from '../components/integrations/integrationUi';

const SOURCES = [
  { id: 'lead', label: 'Meta Lead', icon: FacebookIcon, color: '#1877F2', Component: MetaLeadsIntegration },
  { id: 'google-ads', label: 'Google Ads', icon: GoogleAdsIcon, color: '#4285F4', Component: GoogleAdsIntegration },
];

// Lead integrations page: picks one source and renders its own component
const MetaIntegrationPage = () => {
  // The chosen source lives in the URL (?source=google-ads) so a refresh keeps it
  const [searchParams, setSearchParams] = useSearchParams();
  const source = searchParams.get('source');
  const active = SOURCES.find((item) => item.id === source) || SOURCES[0];
  const selectSource = (id) => setSearchParams({ source: id }, { replace: true });
  const ActiveSource = active.Component;

  return (
    <div className="relative flex flex-col gap-3 pb-28 md:h-[calc(100vh-3rem)] md:min-h-0 md:overflow-hidden md:pb-0">
      {createPortal(
        <div className="fixed bottom-1 left-[calc(50%+8rem)] z-[80] flex -translate-x-1/2 items-end gap-2 max-md:left-1/2">
          {SOURCES.map((item) => {
            const Icon = item.icon;
            const isActive = active.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSource(item.id)}
                aria-pressed={isActive}
                style={{ color: item.color, borderColor: isActive ? item.color : '#e2e8f0', boxShadow: isActive ? `0 0 0 0.1px ${item.color}` : undefined }}
                className="flex w-16 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-1.5 py-2.5 text-[10px] font-semibold leading-tight shadow-lg backdrop-blur-xl"
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* key remounts the source so each one loads its own data */}
      <ActiveSource key={active.id} />
    </div>
  );
};

export default MetaIntegrationPage;
