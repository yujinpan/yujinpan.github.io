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
        Please describe the problem in detail, so that I can improve the product better. Thank you.
      </p>
      <div class="form-item">
        <label for="application">* Application</label>
        <select
            @change="model.application = $event.target.value"
            :value="model.application"
            :class="{'is-placeholder': !model.application}"
            name="application">
          <option value="" disabled>Place choose an application</option>
          <option value="JSONTree">JSONTree</option>
          <option value="NoMedia">NoMedia</option>
          <option value="CashierDesk">CashierDesk</option>
          <option value="HelloHero">HelloHero</option>
          <option value="ChatGPTWeb">ChatGPTWeb</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-item">
        <label for="name">name</label>
        <input
            @input="model.name = $event.target.value"
            :value="model.name"
            name="name"
            placeholder="Your nickname, not required" />
      </div>
      <div class="form-item">
        <label for="title">* Title</label>
        <input
            @input="model.title = $event.target.value"
            :value="model.title"
            name="title"
            placeholder="The issue title" />
      </div>
      <div class="form-item">
        <label for="description">* Description</label>
        <textarea
            @input="model.description = $event.target.value"
            :value="model.description" name="description"
            rows="6"
            placeholder="The issue description" />
      </div>
      <div class="form-item">
        <div v-if="showError" class="warning custom-block">
          <p class="custom-block-title">WARNING</p>
          <p>{{ error }}</p>
        </div>

        <button @click.prevent="!loading && submit()" style="position: relative" :disabled="loading">
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
import { TOKEN } from './Token';

const octokit = new Octokit({
  auth: TOKEN
});

const historyData = ref([]);

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

onMounted(() => {
  if (historyData.value.length) {
    setInterval(updateState, 10 * 1000);
  }
});

const {application} = location.search.slice(1).split('@').map(item => {
  const [key, val] = item.split('=');
  return {[key]: val};
}).reduce((a, b) => ({...a, ...b}), {});

const model = ref({
  application: application || '',
  title: '',
  description: '',
  name: ''
});

const showError = ref(false);
const error = ref('');

const showSuccess = ref(false);
const issueLink = ref('');
const issueTitle = ref('');

const loading = ref(false);

const submit = async () => {
  showError.value = false;
  showSuccess.value = false;

  const {application, title, description, name} = model.value;
  if (!application || !title || !description) {
    error.value = 'Application/Title/Description required.';
    showError.value = true;
    return;
  }

  loading.value = true;
  return octokit.rest.issues.create({
    owner: 'PrimaAestate',
    repo: 'feedback',
    title: `[${application}] ${title}`,
    body: `${description}\n\n > Created by ${name || 'anonymous'} on the feedback page.\n\n @yujinpan`
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
  font-size: 16px;
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

select.is-placeholder {
  color: var(--vp-c-text-3)
}

button {
  width: 100%;
  font-size: 16px;
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

.warning {
  text-align: left;
}
</style>