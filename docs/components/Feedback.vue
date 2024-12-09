<template>
  <div class="form">
    <h1>Feedback</h1>
    <div v-if="!showSuccess">
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
            rows="8"
            placeholder="The issue description" />
      </div>
      <div class="form-item">
        <div v-if="showError" class="warning custom-block">
          <p class="custom-block-title">WARNING</p>
          <p>{{ error }}</p>
        </div>

        <button @click.prevent="!loading && submit()" style="position: relative" :disabled="loading">
          {{loading ? "Submitting..." : "Submit"}}
        </button>
      </div>
    </div>

    <div v-else class="tip custom-block">
      <p class="custom-block-title">Thank you for your feedback. Progress on the issue will be shown here:</p>
      <p><a :href="issueLink" target="_blank">{{ issueLink }}</a></p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { Octokit } from 'octokit';
import { TOKEN } from './Token';

const model = ref({
  application: '',
  title: '',
  description: '',
  name: ''
});

const showError = ref(false);
const error = ref('');

const showSuccess = ref(false);
const issueLink = ref('http://localhost:5173/Feedback?title=&description=');

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

  const octokit = new Octokit({
    auth: TOKEN
  });

  loading.value = true;
  return octokit.rest.issues.create({
    owner: 'yujinpan',
    repo: 'yujinpan.github.io',
    title: `[${application}] ${title}`,
    body: `${description}\n\n > Created by ${name || 'anonymous'} on the feedback page.`
  }).then((res) => {
    showSuccess.value = true;
    issueLink.value = res.data.html_url;
  }, err => {
    showError.value = true;
    error.value = String(err);
  }).finally(() => {
    loading.value = false;
  });
};
</script>

<style scoped>
.form {
  text-align: center;
}

h1 {
  margin-bottom: 30px;
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