import { Topic } from "./types";

export interface TopicCategory {
  name: string;
  topics: Topic[];
}

export const topicCategories: TopicCategory[] = [
  {
    name: "AI & Technology",
    topics: [
      { id: "ai-1", category: "AI & Technology", prompt: "Where is AI genuinely failing today, and what fundamental research is needed?" },
      { id: "ai-2", category: "AI & Technology", prompt: "Will artificial general intelligence emerge from scaling, or do we need new paradigms?" },
    ],
  },
  {
    name: "Philosophy & Consciousness",
    topics: [
      { id: "phil-1", category: "Philosophy & Consciousness", prompt: "What is consciousness, and could a machine ever have it?" },
      { id: "phil-2", category: "Philosophy & Consciousness", prompt: "Is free will compatible with what neuroscience tells us about the brain?" },
    ],
  },
  {
    name: "Science & Nature",
    topics: [
      { id: "sci-1", category: "Science & Nature", prompt: "Why haven't we found extraterrestrial life, and what does the silence tell us?" },
      { id: "sci-2", category: "Science & Nature", prompt: "What are the biggest unsolved problems in physics, and which one breaks first?" },
    ],
  },
  {
    name: "Society & Economics",
    topics: [
      { id: "soc-1", category: "Society & Economics", prompt: "Is capitalism compatible with long-term human flourishing?" },
      { id: "soc-2", category: "Society & Economics", prompt: "How should society handle the displacement of jobs by AI and automation?" },
    ],
  },
  {
    name: "Ethics & Dilemmas",
    topics: [
      { id: "eth-1", category: "Ethics & Dilemmas", prompt: "Is it ethical to create sentient AI knowing it may suffer?" },
      { id: "eth-2", category: "Ethics & Dilemmas", prompt: "When autonomous vehicles must choose who lives and who dies, who decides the algorithm?" },
    ],
  },
  {
    name: "History & Civilization",
    topics: [
      { id: "hist-1", category: "History & Civilization", prompt: "What is the single most consequential invention in human history?" },
      { id: "hist-2", category: "History & Civilization", prompt: "What will historians in 2200 say was the defining event of our era?" },
    ],
  },
];

export function getAllTopics(): Topic[] {
  return topicCategories.flatMap((c) => c.topics);
}
