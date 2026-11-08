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
  alternateName: 'aniks',
  jobTitle: 'MSc student in Data Science',
  city: 'Dhaka',
  country: 'Bangladesh',
  email: 'anikahmed0091@gmail.com',
} as const;

export type Link = {
  label: string;
  href: string;
  /** Used for the link's accessible name when the label alone is ambiguous. */
  note?: string;
};

export type Section = {
  id: string;
  title: string;
  lede: string;
  links: Link[];
};

export const SECTIONS: Section[] = [
  {
    id: 'research-code',
    title: 'Research & Code',
    lede: 'Papers, repos & colabs.',
    links: [
      { label: 'GitHub', href: 'https://github.com/anik-amd/' },
      { label: 'GitLab', href: 'https://gitlab.com/anik-amd' },
      { label: 'ORCID', href: 'https://orcid.org/0009-0000-5792-8991' },
    ],
  },
  {
    id: 'contact',
    title: 'Get in Touch',
    lede: 'Discuss a project idea or just drop a hi!',
    links: [
      { label: 'Mastodon', href: 'https://mastodon.social/@aniks' },
      { label: 'Facebook', href: 'https://www.facebook.com/istiak.ahmed.anik0/' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/mdanik9/' },
      { label: 'Email', href: `mailto:${PERSON.email}` },
    ],
  },
  {
    id: 'keeps-me-up',
    title: 'What Keeps Me Up at Night',
    lede: 'Books, music, and films that linger.',
    links: [
      { label: 'Last.fm', href: 'https://www.last.fm/user/anik91' },
      { label: 'Goodreads', href: 'https://www.goodreads.com/anik_amd' },
      { label: 'Simkl', href: 'https://simkl.com/6430675/' },
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
