<template>
  <div class="form">
    <h1 style="text-align: center">Product Feedback</h1>

    <section v-if="history.length" class="history" aria-labelledby="fb-history-title">
      <h2 id="fb-history-title">Your feedback history</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">State</th>
            <th scope="col">Created</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.number">
            <td><a :href="item.html_url" target="_blank" rel="noopener">{{ item.title }}</a></td>
            <td>{{ stateLabel(item) }}</td>
            <td>{{ fmt(item.created_at) }}</td>
            <td>{{ fmt(item.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <aside class="email-us">
      <strong>Prefer email?</strong>
      <a :href="mailto">Email us at support@primaaestate.cloud</a>
      <small class="text-secondary">Email is private. Only we see it, unlike the public issues below.</small>
    </aside>

    <form v-if="!success" novalidate @submit.prevent="submit" @reset.prevent="resetForm">
      <p class="tip custom-block notice">
        Please describe the issue in detail so we can improve the product. Thank you!<br />
        <small>Feedback is posted as a <strong>public</strong> issue on
          <a href="https://github.com/PrimaAestate/feedback" target="_blank" rel="noopener">GitHub</a>.
          Please don't include personal information. We'll follow up in the issue — bookmark it or check this page for status.</small>
      </p>

      <div class="form-item">
        <label for="fb-app">Application <span aria-hidden="true">*</span></label>
        <select id="fb-app" v-model="model.app" name="app" required
                :class="{ 'is-placeholder': !model.app }"
                :aria-invalid="!!errors.app" :aria-describedby="errors.app ? 'fb-app-err' : undefined">
          <option value="" disabled>Please choose an application</option>
          <option v-for="a in APPS" :key="a.slug" :value="a.slug">{{ a.name }}</option>
        </select>
        <p v-if="errors.app" id="fb-app-err" class="field-error">{{ errors.app }}</p>
      </div>

      <div class="form-item">
        <label for="fb-summary" class="row">Summary <small class="text-secondary">Optional, one line</small></label>
        <input id="fb-summary" v-model="model.summary" name="summary" type="text" :maxlength="LIMITS.summaryMax"
               placeholder="e.g. Videos still autoplay on some sites" />
      </div>

      <div class="form-item">
        <label for="fb-desc" class="row">
          <span>Description <span aria-hidden="true">*</span></span>
          <small id="fb-desc-hint" class="text-secondary">Steps, error messages, app version; paste a screenshot link if you have one… ({{ model.description.trim().length }}/{{ LIMITS.descMax }})</small>
        </label>
        <textarea id="fb-desc" v-model="model.description" name="description" rows="6" required
                  :maxlength="LIMITS.descMax" placeholder="Describe the issue"
                  :aria-invalid="!!errors.description"
                  :aria-describedby="errors.description ? 'fb-desc-hint fb-desc-err' : 'fb-desc-hint'" />
        <p v-if="errors.description" id="fb-desc-err" class="field-error">{{ errors.description }}</p>
      </div>

      <!-- honeypot -->
      <input class="hp" type="text" name="website" v-model="model.website" tabindex="-1" autocomplete="off" aria-hidden="true" />

      <div class="form-item">
        <div ref="turnstileEl" class="turnstile"></div>
        <p v-if="errors.captcha" class="field-error">{{ errors.captcha }}</p>
      </div>

      <div class="form-item">
        <div role="alert" aria-live="assertive">
          <div v-if="error" class="warning custom-block">
            <p class="custom-block-title">Could not submit</p>
            <p>{{ error }}</p>
          </div>
        </div>
        <button class="submit" type="submit" :disabled="loading" :aria-busy="loading">
          {{ loading ? 'Submitting…' : 'Submit Feedback' }}
        </button>
      </div>
    </form>

    <div v-else class="tip custom-block" role="status" aria-live="polite" style="text-align: center">
      <p class="custom-block-title">Thanks for your feedback! Progress on the issue will be shown here:</p>
      <p><a :href="success.url" target="_blank" rel="noopener">#{{ success.number }} {{ success.title }}</a></p>
      <p><button type="button" class="clear-btn" @click="another">Submit another</button></p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import APPS from '../data/apps.json';

const API = 'https://feedback.primaaestate.cloud';
const TURNSTILE_SITEKEY = '0x4AAAAAAFXStiWWE__8dGzp';
const LIMITS = { summaryMax: 120, descMin: 10, descMax: 5000 };
// Old ?application= values used by in-app links -> slugs
const LEGACY: Record<string, string> = {
  Aestate: 'aestate', NoMedia: 'nomedia', WebCopilot: 'web-copilot', HelloHero: 'hello-hero',
  ConsoleMini: 'console-mini', URLEditor: 'url-editor-portable', JSONTree: 'json-tree', CashierDesk: 'cashier-desk',
};
const HISTORY_KEY = 'FeedbackHistory';

type Issue = { number: number; title: string; html_url: string; state: string; state_reason?: string | null; created_at: string; updated_at: string };

const history = ref<Issue[]>([]);
const model = reactive({ app: '', summary: '', description: '', website: '' });
const errors = reactive<Record<string, string>>({});
const error = ref('');
const loading = ref(false);
const success = ref<{ number: number; url: string; title: string } | null>(null);
const turnstileEl = ref<HTMLElement>();
let widgetId: string | undefined;

const mailto = computed(() => {
  const name = APPS.find((a) => a.slug === model.app)?.name;
  return `mailto:support@primaaestate.cloud?subject=${encodeURIComponent(`[Feedback]${name ? ' ' + name : ''}`)}`;
});
const fmt = (d: string) => (d ? new Date(d).toLocaleString() : '');
const stateLabel = (i: Issue) => (i.state === 'closed' ? (i.state_reason === 'not_planned' ? 'closed (not planned)' : 'closed') : i.state || 'open');
const saveHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));

// ---------- Turnstile ----------
function loadTurnstile(): Promise<any> {
  const w = window as any;
  if (w.turnstile) return Promise.resolve(w.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve(w.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function renderTurnstile() {
  await nextTick();
  if (!turnstileEl.value) return;
  try {
    const t = await loadTurnstile();
    widgetId = t.render(turnstileEl.value, { sitekey: TURNSTILE_SITEKEY, action: 'feedback' });
  } catch {
    errors.captcha = 'Could not load the anti-spam check. Please disable content blockers for this page and reload.';
  }
}
const turnstileToken = () => ((window as any).turnstile && widgetId !== undefined ? (window as any).turnstile.getResponse(widgetId) : '');

// ---------- status polling (only while page visible, with backoff) ----------
let timer: number | undefined;
let delay = 30_000;
async function poll() {
  timer = undefined;
  const open = history.value.filter((i) => i.state !== 'closed').map((i) => i.number);
  if (!open.length || document.visibilityState !== 'visible') return;
  let changed = false;
  try {
    const r = await fetch(`${API}/status?ids=${open.slice(-20).join(',')}`);
    if (r.ok) {
      const { issues } = (await r.json()) as { issues: any[] };
      for (const u of issues) {
        const item = history.value.find((i) => i.number === u.number);
        if (item && item.updated_at !== u.updated_at) {
          Object.assign(item, { ...u, html_url: u.url });
          changed = true;
        }
      }
      if (changed) saveHistory();
    }
  } catch {}
  delay = changed ? 30_000 : Math.min(delay * 2, 10 * 60_000);
  schedule();
}
function schedule(ms = delay) {
  if (timer === undefined && document.visibilityState === 'visible') timer = window.setTimeout(poll, ms);
}
function onVisibility() {
  if (document.visibilityState === 'visible') { delay = 30_000; schedule(0); }
  else if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
}

onMounted(() => {
  try { history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter((i: any) => i && i.number); } catch {}
  // supports ?application=NoMedia@... (legacy in-app links) and ?app=nomedia
  const q = location.search.slice(1);
  const raw = new URLSearchParams(q.replace(/@/g, '&'));
  const wanted = raw.get('app') || raw.get('application') || '';
  const slug = LEGACY[wanted] || wanted.toLowerCase();
  if (APPS.some((a) => a.slug === slug)) model.app = slug;
  document.addEventListener('visibilitychange', onVisibility);
  schedule(0);
  renderTurnstile();
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  if (timer !== undefined) clearTimeout(timer);
  if (widgetId !== undefined) (window as any).turnstile?.remove(widgetId);
});

// ---------- form ----------
function resetForm() {
  Object.assign(model, { app: '', summary: '', description: '', website: '' });
}

function validate(): boolean {
  for (const k of Object.keys(errors)) delete errors[k];
  if (!model.app) errors.app = 'Please choose an application.';
  const d = model.description.trim().length;
  if (d < LIMITS.descMin) errors.description = `Please write at least ${LIMITS.descMin} characters.`;
  if (!turnstileToken()) errors.captcha = 'Please complete the anti-spam check above.';
  const first = Object.keys(errors)[0];
  if (first) {
    const id = { app: 'fb-app', description: 'fb-desc', }[first];
    if (id) document.getElementById(id)?.focus();
    return false;
  }
  return true;
}

const MESSAGES: Record<string, string> = {
  captcha: 'The anti-spam check failed or expired. Please try again.',
  rate_limited: 'Too many submissions. Please wait a minute and try again.',
  app: 'Please choose an application.',
  description: `Description must be ${LIMITS.descMin}–${LIMITS.descMax} characters.`,
  upstream: 'Our feedback service is temporarily unavailable. Please try again later, or email support@primaaestate.cloud.',
};

async function submit() {
  error.value = '';
  if (loading.value || !validate()) return;
  const fd = new FormData();
  fd.append('app', model.app);
  fd.append('summary', model.summary.trim());
  fd.append('description', model.description.trim());
  fd.append('website', model.website);
  fd.append('cf-turnstile-response', turnstileToken());
  loading.value = true;
  try {
    const r = await fetch(`${API}/feedback`, { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(MESSAGES[j.error] || `Something went wrong (HTTP ${r.status}). Please try again.`);
    const name = APPS.find((a) => a.slug === model.app)?.name;
    const title = `[${name}] ${model.summary.trim() || model.description.trim().slice(0, 80)}`;
    if (j.number) {
      const now = new Date().toISOString();
      history.value.push({ number: j.number, title, html_url: j.url, state: 'open', created_at: now, updated_at: now });
      saveHistory();
      delay = 30_000;
      schedule();
    }
    success.value = { number: j.number, url: j.url, title };
    resetForm();
  } catch (e: any) {
    error.value = e?.message || 'Network error. Please check your connection and try again.';
    (window as any).turnstile?.reset(widgetId);
  } finally {
    loading.value = false;
  }
}

function another() {
  success.value = null;
  widgetId = undefined;
  renderTurnstile();
}
</script>

<style scoped>
.form { font-size: 16px; }
h1 { margin-bottom: 20px; }
.history h2 { font-size: 16px; margin: 0 0 8px; border: 0; padding: 0; }
.notice { padding: 8px 16px; text-align: center; }
.email-us { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; justify-content: center; margin: 0 0 12px; padding: 10px 16px; border: 1px solid var(--vp-c-divider); border-radius: 8px; }
.email-us a { color: var(--vp-c-brand-1); text-decoration: underline; }
.email-us small { flex-basis: 100%; text-align: center; }
.form-item + .form-item { margin-top: 10px; }
label { display: block; padding: 5px 10px; text-align: left; }
label.row { display: flex; gap: 8px; }
label.row small { margin-left: auto; text-align: right; }
input, textarea, select {
  font-size: inherit; width: 100%; border: 1px solid var(--vp-c-divider); padding: 5px 10px;
  border-radius: 4px; transition: border-color 0.24s; line-height: 1.5em;
}
input:hover, textarea:hover, select:hover { border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, transparent); }
input:focus-visible, textarea:focus-visible, select:focus-visible { border-color: var(--vp-c-brand-1); outline: 2px solid var(--vp-c-brand-soft); }
[aria-invalid='true'] { border-color: var(--vp-c-danger-1); }
.field-error { color: var(--vp-c-danger-1); font-size: 14px; margin: 4px 10px 0; }
button { font-size: inherit; }
select.is-placeholder { color: var(--vp-c-text-3); }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
.turnstile { min-height: 65px; }
.submit { width: 100%; background: var(--vp-c-green-3); padding: 10px; border-radius: 4px; color: white; transition: background-color 0.25s; }
.submit:hover { background: var(--vp-c-green-2); }
.submit:active { background: var(--vp-c-green-1); }
.submit:disabled { background: var(--vp-c-green-soft); color: var(--vp-c-text-3); }
.clear-btn { background: var(--vp-c-gray-3); color: var(--vp-c-text-1); padding: 0 20px; margin-left: 10px; border-radius: 4px; }
.clear-btn:disabled { opacity: 0.5; }
.text-secondary { color: var(--vp-c-text-2); }
.warning { text-align: left; }
</style>
