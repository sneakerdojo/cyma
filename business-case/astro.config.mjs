// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://strategy.octio.co.za',
  integrations: [
    starlight({
      title: 'Octio Business Case',
      description: 'Strategic vision, product portfolio, and 12-month roadmap.',
      logo: {
        src: './src/assets/octio-icon.png',
        replacesTitle: false,
      },
      customCss: ['./src/styles/octio.css'],
      social: {
        github: 'https://github.com/sneakerdojo/cyma',
      },
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'Read this first', link: '/' },
            { label: '00 · Executive summary', link: '/00-executive-summary/' },
            { label: '01 · Company overview', link: '/01-company-overview/' },
          ],
        },
        {
          label: 'The market',
          items: [
            { label: '02 · Market analysis', link: '/02-market-analysis/' },
            { label: '03 · Competitive positioning', link: '/03-competitive-positioning/' },
          ],
        },
        {
          label: 'The portfolio',
          items: [
            { label: '04 · Product portfolio', link: '/04-product-portfolio/' },
            { label: '05 · Go-to-market strategy', link: '/05-gtm-strategy/' },
            { label: '06 · Product roadmap (7-day → 12-month)', link: '/06-product-roadmap/' },
          ],
        },
        {
          label: 'Operating model',
          items: [
            { label: '07 · Internal testing and validation', link: '/07-internal-testing/' },
            { label: '08 · Recursive sales — use the product to sell it', link: '/08-recursive-sales/' },
            { label: '09 · Financial projections', link: '/09-financial-projections/' },
            { label: '10 · Operational plan', link: '/10-operational-plan/' },
            { label: '11 · Risks and mitigations', link: '/11-risks-and-mitigations/' },
          ],
        },
        {
          label: 'Appendix',
          items: [
            { label: 'A · Frameworks reference', link: '/appendix/frameworks-reference/' },
            { label: 'B · Glossary', link: '/appendix/glossary/' },
            { label: 'C · Research citations', link: '/appendix/citations/' },
          ],
        },
      ],
    }),
  ],
});
