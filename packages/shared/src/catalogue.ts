export type ProjectCategory =
  | 'AI & automation'
  | 'Enterprise systems'
  | 'Dashboards & analytics'
  | 'Apps & web';

/** One "what you are looking at" callout: [heading, body]. */
export type ReadNote = readonly [heading: string, body: string];

/** One catalogue entry (WRK-01 .. WRK-15), backing a plate + the modal. */
export interface Project {
  id: string;
  t: string;
  cat: ProjectCategory;
  /** key into the SceneRegistry */
  scene: string;
  blurb: string;
  read: ReadNote[];
  specs: Record<string, string>;
  stack: string[];
}

/** One of the six "what we build" capability cards. */
export interface CapabilityCard {
  t: string;
  d: string;
  tags: string[];
  /** raw <path d="..."> for a 24x24 stroke icon */
  ic: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  per: string;
  /** marks the "Most picked" ribbon when truthy */
  rec?: 1;
  items: string[];
}

export interface SiteConfig {
  company: string;
  email: string;
  plans: Plan[];
}
