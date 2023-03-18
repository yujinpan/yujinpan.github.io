import { defineConfig } from "vitepress";

export default defineConfig({
  appearance: true,
  lang: 'en-US',
  title: 'yujinpan',
  description: `yujinpan's github pages.`,
  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/yujinpan',
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023 yujinpan',
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
