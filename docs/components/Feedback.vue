<template>
  <div class="form">
    <h1 style="text-align: center">Product Feedback</h1>

    <blockquote v-if="historyData.length">
      <h4>Your Feedback History</h4>
      <table>
        <thead>
        <tr>
          <td>Title</td>
          <td>State</td>
          <td>Created Time</td>
          <td>Updated Time</td>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) in historyData" :key="index">
          <td><a :href="item.html_url">{{ item.title }}</a></td>
          <td>{{ item.state }}</td>
          <td>{{ dateFormatter(item.created_at) }}</td>
          <td>{{ dateFormatter(item.updated_at) }}</td>
        </tr>
        </tbody>
      </table>
    </blockquote>

    <div v-if="!showSuccess">
      <p class="tip custom-block" style="padding: 8px 16px; text-align: center;">
        Please describe the issue in detail, so that I can improve the product better. Thank you.
      </p>
      <div class="form-item">
        <label for="application">* Application</label>
        <select
            @change="model.application = $event.target.value"
            :value="model.application"
            :class="{'is-placeholder': !model.application}"
            name="application">
          <option value="" disabled>Place choose an application</option>
          <option value="Aestate">Aestate</option>
          <option value="HelloHero">Hello Hero</option>
          <option value="ConsoleMini">Console Mini</option>
          <option value="URLEditor">URL Editor</option>
          <option value="JSONTree">JSON Tree</option>
          <option value="NoMedia">No Media</option>
          <option value="CashierDesk">Cashier Desk</option>
          <option value="ChatGPTWeb">ChatGPTWeb</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-item">
        <label for="description" style="display: flex">* Description <small style="margin-left: auto" class="text-secondary">Such as error content</small></label>
        <textarea
            @input="model.description = $event.target.value"
            :value="model.description" name="description"
            rows="6"
            placeholder="The issue description" />
      </div>
      <div class="form-item">
        <label for="attachments" style="display: flex">Attachments <small style="margin-left: auto" class="text-secondary">Files or screenshots of the issue</small></label>
        <div style="display: flex">
          <input
              ref="attachments"
              @change="model.attachments = Array.from($event.target.files)"
              type="file"
              name="attachments"
              multiple />
          <button @click="$refs.attachments.value = '';model.attachments = [];" class="clear-btn">Reset</button>
        </div>
        <ul>
          <li v-for="item in model.attachments">{{item.name}}</li>
        </ul>
      </div>
      <div class="form-item">
        <label for="email" style="display: flex">Email <small class="text-secondary" style="margin-left: auto">To receive the status of the issue</small></label>
        <input
            @input="model.email = $event.target.value"
            :value="model.email"
            name="email"
            type="email"
            placeholder="Your email, not required" />
      </div>
      <div class="form-item">
        <div v-if="showError" class="warning custom-block">
          <p class="custom-block-title">WARNING</p>
          <p>{{ error }}</p>
        </div>

        <button class="submit" @click.prevent="!loading && submit()" style="position: relative" :disabled="loading">
          {{ loading ? 'Submitting...' : 'Submit Feedback' }}
        </button>
      </div>
    </div>

    <div v-else class="tip custom-block" style="text-align: center">
      <p class="custom-block-title">Thanks for your feedback. Progress on the issue will be shown here:</p>
      <p><a :href="issueLink" target="_blank">{{ issueTitle }}</a></p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { Octokit } from 'octokit';
import { TOKEN } from './token';

const octokit = new Octokit({
  auth: TOKEN
});

const historyData = ref([]);

const updateState = () => {
  historyData.value.forEach(item => {
    octokit.rest.issues.get({
      owner: 'PrimaAestate',
      repo: 'feedback',
      issue_number: item.number
    }).then(res => {
      Object.assign(item, res.data);
    });
  });
}

const model = ref({
  application: '',
  description: '',
  attachments: [] as File[],
  email: '',
});

onMounted(() => {
  try {
    historyData.value = JSON.parse(localStorage.getItem('FeedbackHistory') || '[]')
  } catch (e) {}

  // historyData.value = [
  //   {
  //     title: '[JSONTree] crashes when i use plug in on this page',
  //     number: 2,
  //     html_url: 'test',
  //     state: 'open',
  //     created_at: 'test',
  //     updated_at: 'test'
  //   }
  // ]

  if (historyData.value.length) {
    setInterval(updateState, 10 * 1000);
  }

  const {application} = location.search.slice(1).split('@').map(item => {
    const [key, val] = item.split('=');
    return {[key]: val};
  }).reduce((a, b) => ({...a, ...b}), {});

  if (application) {
    model.value.application = application
  }
});

const showError = ref(false);
const error = ref('');

const showSuccess = ref(false);
const issueLink = ref('');
const issueTitle = ref('');

const loading = ref(false);

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.onabort = reject;
    reader.readAsDataURL(blob);
  })
}

const uploadFile = async (application: string, file: File): Promise<string> => {
  let fileId = Date.now();
  return octokit.rest.repos.createOrUpdateFileContents({
    owner: 'PrimaAestate',
    repo: 'feedback',
    path: `${application}/attachments/${file.name.replace(/(\.\w+$)/, `_${++fileId}$1`)}`.replace(/\s/g, '_'),
    message: `[${application}/attachments] ${file.name}`,
    content: await blobToDataUrl(file).then(res => res.split('base64,')[1]),
  }).then(res => res.data.content.download_url)
}

const submit = async () => {
  showError.value = false;
  showSuccess.value = false;

  const {application, description, attachments, email} = model.value;
  if (!application || !description) {
    error.value = 'Application/Description required.';
    showError.value = true;
    return;
  }

  let files: string[];
  if (attachments.length) {
    loading.value = true;
    files = await Promise.all(attachments.map((item) => {
      return uploadFile(application, item)
        .then(url => {
          return `[${item.name}](${url})`;
        })
    })).catch(e => {
      showError.value = true;
      error.value = 'Upload attachments error - ' + String(e);
      return Promise.reject(error.value);
    }).finally(() => {
      loading.value = false;
    })
  }

  const title = `[${application}] ${description.slice(0, 20)}`;
  const body = `${description}${
      files ? `\n\n> Attachments\n${files.join('\n')}` : ''
  }\n>\n> Created by ${email || 'anonymous'} on the feedback page.\n\n@yujinpan`;

  loading.value = true;
  return octokit.rest.issues.create({
    owner: 'PrimaAestate',
    repo: 'feedback',
    title,
    body
  }).then((res) => {
    showSuccess.value = true;
    issueLink.value = res.data.html_url;
    issueTitle.value = res.data.title;

    historyData.value.push(res.data);
    localStorage.setItem('FeedbackHistory', JSON.stringify(historyData.value));
  }, err => {
    showError.value = true;
    error.value = String(err);
  }).finally(() => {
    loading.value = false;
  });
};

function dateFormatter(data) {
  return new Date(data).toLocaleString()
}
</script>

<style scoped>
.form {
  font-size: 16px;
}

h1 {
  margin-bottom: 20px;
}

.form-item {
  + .form-item {
    margin-top: 10px;
  }
}

label {
  display: block;
  padding: 5px 10px;
  text-align: left;
}

input, textarea, select {
  font-size: inherit;
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  padding: 5px 10px;
  border-radius: 4px;
  transition: border-color 0.24s;

  &:hover {
    border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, transparent);
  }

  &:focus {
    border-color: var(--vp-c-brand-1)
  }

  line-height: 1.5em;
}

button {
  font-size: inherit;
}

select.is-placeholder {
  color: var(--vp-c-text-3)
}

.submit {
  width: 100%;
  background: var(--vp-c-green-3);
  padding: 10px;
  border-radius: 4px;
  color: white;

  &:hover {
    background: var(--vp-c-green-2);
  }

  &:active {
    background: var(--vp-c-green-1);
  }

  transition: background-color 0.25s;

  &:disabled {
    background: var(--vp-c-green-soft);
    color: var(--vp-c-text-3);
  }
}

.clear-btn {
  background: var(--vp-c-gray-3);
  color: var(--vp-c-text-1);
  padding: 0 20px;
  margin-left: 10px;
  border-radius: 4px;
}

.text-secondary {
  color: var(--vp-c-text-3);
}

.warning {
  text-align: left;
}
</style>