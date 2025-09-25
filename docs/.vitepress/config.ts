import { defineConfig } from "vitepress";

export default defineConfig({
  appearance: true,
  lang: 'en-US',
  title: 'Prima Aestate',
  description: `Prima Aestate Technology.`,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
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
      message: 'Released under the MIT License.',
      copyright: `Copyright © ${new Date().getFullYear()} Prima Aestate`,
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
