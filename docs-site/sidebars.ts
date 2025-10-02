import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['installation', 'quick-start'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['domain-generation', 'openapi-requirements', 'store-api'],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['architecture', 'customization'],
    },
  ],
};

export default sidebars;
