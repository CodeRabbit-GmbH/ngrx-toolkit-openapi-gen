import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const repoName = 'ngrx-toolkit-openapi-gen';

const config: Config = {
  title: 'NgRx OpenAPI Generator',
  tagline: 'Generate NgRx Signal Stores from OpenAPI specifications',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: isGitHubPages
    ? `https://wolfmanfx.github.io`
    : 'https://ngrx-openapi-gen.dev',
  baseUrl: isGitHubPages ? `/${repoName}/` : '/',

  organizationName: 'wolfmanfx',
  projectName: repoName,
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
    navbar: {
      title: 'NgRx OpenAPI Gen',
      logo: {
        alt: 'NgRx OpenAPI Generator Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: `https://github.com/wolfmanfx/${repoName}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'Domain Generation',
              to: '/domain-generation',
            },
            {
              label: 'Generated Store API',
              to: '/store-api',
            },
          ],
        },
        {
          title: 'Related',
          items: [
            {
              label: '@angular-architects/ngrx-toolkit',
              href: 'https://github.com/angular-architects/ngrx-toolkit',
            },
            {
              label: 'NgRx Signals',
              href: 'https://ngrx.io/guide/signals',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} NgRx OpenAPI Generator. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
