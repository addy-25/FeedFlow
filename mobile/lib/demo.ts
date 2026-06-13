/**
 * Seed data served when the backend is unreachable, so the UI is always
 * populated for a demo. Mutated in-place by api fallbacks within a session.
 */
import type { IgStatus, LogItem, Me, Preference, Settings } from './api';

export const demo: {
  me: Me;
  settings: Settings;
  preferences: Preference[];
  igStatus: IgStatus;
  logs: LogItem[];
} = {
  me: { id: 1, email: 'you@example.com' },
  settings: { automation_interval_minutes: 60 },
  preferences: [
    { topic: 'Artificial Intelligence', mode: 'boost' },
    { topic: 'Startups', mode: 'boost' },
    { topic: 'Technology', mode: 'boost' },
    { topic: 'Programming', mode: 'boost' },
    { topic: 'Celebrity Gossip', mode: 'reduce' },
    { topic: 'Gaming', mode: 'reduce' },
  ],
  igStatus: {
    status: 'connected',
    username: 'adi.dev25069',
    last_sync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  logs: [
    {
      id: 1,
      username: 'techcrunch',
      caption: 'AI startup raises $12M for next-gen reasoning model',
      score: 94,
      reason: 'Strong alignment with AI, Startups and Technology interests.',
      action: 'liked',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      username: 'openai',
      caption: 'New function-calling update ships to all developers today',
      score: 92,
      reason: 'Highly relevant to AI and Programming.',
      action: 'liked',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      username: 'gymrat.daily',
      caption: 'Top 10 gym mistakes beginners make #machinelearning',
      score: 24,
      reason: 'Hashtag spam — caption is about fitness, not your interests.',
      action: 'suppressed',
      created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      username: 'celeb.watch',
      caption: 'Celebrity couple spotted in LA over the weekend',
      score: 12,
      reason: 'Matches a topic you asked to see less of.',
      action: 'suppressed',
      created_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      username: 'ycombinator',
      caption: 'Applications for the next batch are now open',
      score: 88,
      reason: 'Directly relevant to your Startups interest.',
      action: 'liked',
      created_at: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
    },
    {
      id: 6,
      username: 'vercel',
      caption: 'Shipping faster with the new edge runtime',
      score: 81,
      reason: 'Relevant to Technology and Programming.',
      action: 'liked',
      created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    },
  ],
};
