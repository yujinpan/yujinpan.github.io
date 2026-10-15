import { defineConfig } from "vitepress";

const SITE = 'https://www.primaaestate.cloud';

export default defineConfig({
  appearance: true,
  lang: 'en-US',
  title: 'Prima Aestate',
  description: 'Prima Aestate makes lightweight apps for Mac, iPhone, iPad and Safari.',
  cleanUrls: true,
  sitemap: { hostname: SITE },
  head: [
    ['meta', { property: 'og:site_name', content: 'Prima Aestate' }],
    ['meta', { name: 'twitter:site', content: '@SummusTheSI' }],
  ],
  transformHead({ pageData }) {
    // site-wide defaults for pages without their own og tags
    const fm = pageData.frontmatter || {};
    const own = (fm.head || []).some((h: any) => h[1] && h[1].property === 'og:image');
    if (own) return [];
    const path = pageData.relativePath.replace(/(index)?\.md$/, '');
    const title = path === '' ? 'Prima Aestate | Lightweight apps for Mac, iPhone and Safari' : pageData.title ? `${pageData.title} | Prima Aestate` : 'Prima Aestate';
    const desc = pageData.description || 'Prima Aestate makes lightweight apps for Mac, iPhone, iPad and Safari.';
    return [
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: desc }],
      ['meta', { property: 'og:url', content: `${SITE}/${path}` }],
      ['meta', { property: 'og:image', content: `${SITE}/og-default.jpg` }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: desc }],
      ['meta', { name: 'twitter:image', content: `${SITE}/og-default.jpg` }],
    ];
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Apps',
        items: [
          { text: 'Aestate', link: '/apps/aestate' },
          { text: 'NoMedia', link: '/apps/nomedia' },
          { text: 'Web Copilot', link: '/apps/web-copilot' },
          { text: 'Hello, Hero', link: '/apps/hello-hero' },
          { text: 'Console Mini', link: '/apps/console-mini' },
          { text: 'URL Editor Portable', link: '/apps/url-editor-portable' },
          { text: 'JSON Tree', link: '/apps/json-tree' },
          { text: 'Cashier Desk', link: '/apps/cashier-desk' },
        ],
      },
      { text: 'Open Source', link: '/open-source' },
      { text: 'Contact Us', link: 'mailto:yujinpan21@gmail.com' },
      { text: 'Feedback', link: '/Feedback' },
      { text: 'Privacy Policy', link: '/PrivacyPolicy' },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/yujinpan',
      },
    ],
    footer: {
      // message: 'Released under the MIT License.',
      copyright: `Copyright © 2016-${new Date().getFullYear()} yujinpan`,
    },
    lastUpdatedText: 'Updated Date',
  },
  async transformHtml(code) {
    return code.replace(
      '</body>',
      `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S66MPLRFJZ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-S66MPLRFJZ');
</script>
</body>`
    );
  },
});
