import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DiscussionMessage, DiscussionSummary, DiscussionStore } from "@/lib/types";

export const useDiscussionStore = create<DiscussionStore>()(
  persist(
    (set, get) => ({
      // State
      selectedAgents: [],
      topic: "",
      totalRounds: 5,
      discussionMode: "student",
      referenceDiscussion: null,
      messages: [],
      status: "idle",
      currentRound: 0,
      currentAgent: null,
      streamingText: "",
      sessionId: null,
      lastEventId: -1,
      summary: null,
      error: null,
      userMessages: [],

      // Actions
      toggleAgent: (agentId: string) => {
        const current = get().selectedAgents;
        if (current.includes(agentId)) {
          set({ selectedAgents: current.filter((id) => id !== agentId) });
        } else if (current.length < 5) {
          set({ selectedAgents: [...current, agentId] });
        }
      },

      setTopic: (topic: string) => set({ topic }),
      setTotalRounds: (rounds: number) => set({ totalRounds: rounds }),
      setDiscussionMode: (discussionMode) => set({ discussionMode }),
      setReferenceDiscussion: (referenceDiscussion) => set({ referenceDiscussion }),
      setStatus: (status) => set({ status }),

      addMessage: (message: DiscussionMessage) =>
        set((state) => ({
          messages: state.messages.some((item) => item.id === message.id)
            ? state.messages
            : [...state.messages, message],
        })),

      setCurrentRound: (round: number) => set({ currentRound: round }),
      setCurrentAgent: (agent) => set({ currentAgent: agent }),
      appendStreamingText: (token: string) =>
        set((state) => ({ streamingText: state.streamingText + token })),
      clearStreamingText: () => set({ streamingText: "" }),
      setSessionId: (id: string) => set({ sessionId: id }),
      setLastEventId: (lastEventId: number) => set({ lastEventId }),
      setSummary: (summary: DiscussionSummary | null) => set({ summary }),
      setError: (error: string | null) => set({ error }),

      addUserMessage: (text: string) =>
        set((state) => ({
          userMessages: [
            ...state.userMessages,
            { text, afterMessageIndex: state.messages.length },
          ],
        })),

      reset: () =>
        set({
          selectedAgents: [],
          topic: "",
          totalRounds: 5,
          discussionMode: "student",
          referenceDiscussion: null,
          messages: [],
          status: "idle",
          currentRound: 0,
          currentAgent: null,
          streamingText: "",
          sessionId: null,
          lastEventId: -1,
          summary: null,
          error: null,
          userMessages: [],
        }),
    }),
    {
      name: "intellect-arena-discussion",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedAgents: state.selectedAgents,
        topic: state.topic,
        totalRounds: state.totalRounds,
        discussionMode: state.discussionMode,
        referenceDiscussion: state.referenceDiscussion,
        messages: state.messages,
        status: state.status,
        currentRound: state.currentRound,
        currentAgent: state.currentAgent,
        streamingText: state.streamingText,
        sessionId: state.sessionId,
        lastEventId: state.lastEventId,
        summary: state.summary,
      }),
    }
  )
);
