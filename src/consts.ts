import type { LinkIcon } from './link-icons';

export const SITE = {
  url: 'https://aniks.pages.dev',
  name: 'Anik Ahmed',
  title: 'Anik Ahmed',
  description:
    'Anik Ahmed is an MSc data science student at BUET in Dhaka, working on machine learning, open-source software, and decentralized systems.',
  locale: 'en',
  ogImage: '/og.png',
} as const;

export const PERSON = {
  name: 'Anik Ahmed',
  givenName: 'Anik',
  familyName: 'Ahmed',
  alternateName: 'aniks',
  jobTitle: 'MSc student in Data Science',
  city: 'Dhaka',
  country: 'Bangladesh',
  university: 'BUET',
  universityUrl: 'https://www.buet.ac.bd/',
  email: 'anikahmed0091@gmail.com',
} as const;

export type Link = {
  label: string;
  href: string;
  /** Brand mark shown before the label. */
  icon: LinkIcon;
  /** Used for the link's accessible name when the label alone is ambiguous. */
  note?: string;
};

export type Section = {
  id: string;
  title: string;
  /** Inline SVG markup for the mark shown before the title. */
  icon: string;
  lede: string;
  links: Link[];
};

export const SECTIONS: Section[] = [
  {
    id: 'research-code',
    title: 'Research & Code',
    // Angle brackets.
    icon: '<path d="M9 6 4 12l5 6M15 6l5 6-5 6" />',
    lede: 'Papers, repos & colabs.',
    links: [
      { label: 'GitHub', href: 'https://github.com/anik-amd/', icon: 'github' },
      { label: 'GitLab', href: 'https://gitlab.com/anik-amd', icon: 'gitlab' },
      { label: 'ORCID', href: 'https://orcid.org/0009-0000-5792-8991', icon: 'orcid' },
    ],
  },
  {
    id: 'contact',
    title: 'Get in Touch',
    // Envelope.
    icon: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" />',
    lede: 'Discuss a project idea or just drop a hi!',
    links: [
      { label: 'Mastodon', href: 'https://mastodon.social/@aniks', icon: 'mastodon' },
      { label: 'Facebook', href: 'https://www.facebook.com/istiak.ahmed.anik0/', icon: 'facebook' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/mdanik9/', icon: 'linkedin' },
      { label: 'Email', href: `mailto:${PERSON.email}`, icon: 'email' },
    ],
  },
  {
    id: 'keeps-me-up',
    title: 'What Keeps Me Up at Night',
    // Open book.
    icon: '<path d="M12 6.5C10.5 5 8.5 4.4 6 4.4H3v13h3c2.5 0 4.5.6 6 2.1 1.5-1.5 3.5-2.1 6-2.1h3v-13h-3c-2.5 0-4.5.6-6 2.1Z" /><path d="M12 6.5v13" />',
    lede: 'Books, music, and films that linger.',
    links: [
      { label: 'Last.fm', href: 'https://www.last.fm/user/anik91', icon: 'lastfm' },
      { label: 'Goodreads', href: 'https://www.goodreads.com/anik_amd', icon: 'goodreads' },
      { label: 'Simkl', href: 'https://simkl.com/6430675/', icon: 'simkl' },
    ],
  },
];

/** Everything listed in the Person structured-data `sameAs` field. */
export const SAME_AS = SECTIONS.flatMap((section) =>
  section.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
);

export const QUOTE = {
  text: 'The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.',
  author: 'Albert Camus',
} as const;
