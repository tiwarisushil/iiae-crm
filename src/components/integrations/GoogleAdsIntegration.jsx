import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Megaphone, ChevronRight, Inbox, FileText, Upload, FlaskConical, KeyRound, RefreshCw, Unplug, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { CopyRow, Panel, MetricCard, SpinnerPanel } from './integrationUi';

// The webhook must be reachable from the internet. Use the public API address when it differs from the
// local development address (VITE_PUBLIC_API_BASE_URL), otherwise the API base URL.
const API_BASE = import.meta.env.VITE_PUBLIC_API_BASE_URL
  || new URL(api.defaults.baseURL, window.location.origin).toString();
const WEBHOOK_URL = `${API_BASE.replace(/\/+$/, '')}/google-leads/webhook`;

const SETUP_STEPS = [
  'Click "Generate key" here, if there is no key yet.',
  'In Google Ads, open the campaign with the lead form and edit the lead form (Assets > Lead forms).',
  'Open "Lead delivery" (or "Export leads from Google Ads") and choose Webhook.',
  'Paste the Webhook URL and the Key shown here.',
  'Click "Send test data". The test lead appears here within a few seconds, and the status turns Connected.',
  'Save the form. Repeat for every lead form; they can all use the same URL and key.',
];

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

// Google Ads lead source. The CRM creates the webhook key; Google Ads delivers each lead to the webhook.
const GoogleAdsIntegration = () => {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const fileInput = useRef(null);

  const load = async () => {
    try {
      const response = await api.get('/google-leads/integration');
      setStatus(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load Google Ads integration');
      setStatus((current) => current || { keySource: 'none', forms: [] });
    }
  };

  useEffect(() => {
    load();
    // Pick up the test lead without a manual refresh while someone is setting it up
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const generateKey = async () => {
    if (status.keySource !== 'none' && !window.confirm('Create a new key? The current key stops working right away, so you must paste the new key into every Google Ads lead form.')) return;
    setBusy('key');
    try {
      const response = await api.post('/google-leads/integration/key');
      setStatus(response.data);
      toast.success('New webhook key created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create the key');
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Google Ads? The key is deleted and new leads will stop arriving. Leads already collected are kept.')) return;
    setBusy('disconnect');
    try {
      const response = await api.delete('/google-leads/integration/key');
      setStatus(response.data);
      toast.success('Google Ads disconnected');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to disconnect Google Ads');
    } finally {
      setBusy('');
    }
  };

  const importFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setBusy('import');
    try {
      const response = await api.post('/google-leads/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(response.data.message);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import the file', { duration: 6000 });
    } finally {
      setBusy('');
    }
  };

  if (!status) return <SpinnerPanel />;

  const hasKey = status.keySource !== 'none';
  const connected = Boolean(status.connected);
  const statusLabel = connected ? 'Connected' : hasKey ? 'Waiting for first lead' : 'Not connected';
  const statusTone = connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : hasKey ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600';
  const dotTone = connected ? 'bg-emerald-500' : hasKey ? 'bg-amber-500' : 'bg-slate-400';

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-blue-100 bg-blue-50 text-blue-700">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">Google Ads</h2>
            <p className="truncate text-xs text-slate-500">Google Ads lead form leads delivered into the CRM.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
            {statusLabel}
          </span>
          {(status.leads > 0 || status.testLeads > 0) && (
            <Link to="/dashboard/google-leads" className="btn-primary">
              View leads <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      {status.keySource === 'env' && (
        <div className="flex shrink-0 items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This key comes from the server setting GOOGLE_ADS_WEBHOOK_KEY. Click "New key" to manage it here instead (the old key then stops working).</span>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Leads"
          value={status.leads || 0}
          detail={status.lastLeadAt ? `Last ${formatDateTime(status.lastLeadAt)}` : 'No leads yet'}
          icon={Inbox}
          tone="bg-blue-50 text-blue-700"
        />
        <MetricCard
          label="Forms"
          value={status.forms?.length || 0}
          detail="Lead forms that sent leads"
          icon={FileText}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          label="Imported"
          value={status.importedLeads || 0}
          detail="From Google Ads files"
          icon={Upload}
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          label="Test leads"
          value={status.testLeads || 0}
          detail={status.lastTestAt ? `Last ${formatDateTime(status.lastTestAt)}` : 'None sent yet'}
          icon={FlaskConical}
          tone="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:grid-rows-1 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-3">
          <Panel
            title="Webhook"
            className="!h-auto shrink-0"
            footer={hasKey ? (
              <>
                <button type="button" onClick={generateKey} disabled={Boolean(busy)} className="btn-outline disabled:opacity-60">
                  <RefreshCw className="h-4 w-4" /> {busy === 'key' ? 'Creating...' : 'New key'}
                </button>
                {status.keySource === 'crm' && (
                  <button type="button" onClick={disconnect} disabled={Boolean(busy)} className="btn-outline ml-auto text-rose-700 disabled:opacity-60">
                    <Unplug className="h-4 w-4" /> {busy === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                )}
              </>
            ) : (
              <button type="button" onClick={generateKey} disabled={Boolean(busy)} className="btn-primary disabled:opacity-60">
                <KeyRound className="h-4 w-4" /> {busy === 'key' ? 'Creating...' : 'Generate key'}
              </button>
            )}
          >
            <div className="space-y-4">
              <CopyRow label="Webhook URL" value={WEBHOOK_URL} />
              {hasKey ? (
                <CopyRow label="Key" value={status.webhookKey} />
              ) : (
                <p className="text-sm text-slate-600">Generate a key, then paste the URL and the key into your Google Ads lead form.</p>
              )}
              {status.keyCreatedAt && (
                <p className="text-[11px] text-slate-500">Key created {formatDateTime(status.keyCreatedAt)}</p>
              )}
            </div>
          </Panel>

          <Panel title="Lead forms" className="min-h-[10rem] flex-1">
            {status.forms?.length ? (
              <ul className="divide-y divide-slate-100">
                {status.forms.map((form) => (
                  <li key={form.formId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">Form {form.formId}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {form.campaignId ? `Campaign ${form.campaignId} · ` : ''}Last lead {formatDateTime(form.lastLeadAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">{form.leads}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Forms appear here after their first real lead arrives.</p>
            )}
          </Panel>
        </div>

        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <Panel title="How to connect" className="min-h-0 flex-1">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-900">
              {SETUP_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Panel>

          <Panel
            title="Import previous leads"
            className="!h-auto shrink-0"
            footer={(
              <>
                <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" onChange={importFile} className="hidden" />
                <button type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)} className="btn-outline disabled:opacity-60">
                  <Upload className="h-4 w-4" /> {busy === 'import' ? 'Importing...' : 'Upload leads file'}
                </button>
              </>
            )}
          >
            <p className="text-sm text-slate-600">
              The webhook only sends new leads. For older ones, open the lead form in Google Ads, download its leads as CSV,
              and upload the file here. Leads already in the CRM are skipped.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
};

export default GoogleAdsIntegration;
