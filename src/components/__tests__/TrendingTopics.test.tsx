import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { getTrendsState, refreshTrends, type TrendsState } from "@/lib/trendsClient";

import TrendingTopics from "../TrendingTopics";

jest.mock("@/lib/trendsClient", () => ({
  getTrendsState: jest.fn(),
  getServerTrendsState: jest.fn(),
  subscribeTrends: () => () => {},
  refreshTrends: jest.fn().mockResolvedValue(undefined),
}));

function setState(overrides: Partial<TrendsState> = {}) {
  const state: TrendsState = { snapshot: null, loading: false, error: false, ...overrides };
  jest.mocked(getTrendsState).mockReturnValue(state);
}
const snapshot = {
  data: Array.from({ length: 20 }, (_, i) => ({ tag: `tag${i}`, postCount: 30, authorCount: 3 })),
  generatedAt: "2026-11-02T12:00:00.000Z",
  windowHours: 24 as const,
};
beforeEach(() => {
  jest.clearAllMocks();
  setState();
});

it("renders loading skeletons", () => {
  setState({ loading: true });
  render(<TrendingTopics />);
  expect(screen.getByRole("status", { name: "Loading trends" })).toBeInTheDocument();
});
it("limits the sidebar to five tags and links to existing hashtag feeds and full list", () => {
  setState({ snapshot });
  render(<TrendingTopics />);
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByRole("link", { name: /#tag0/ })).toHaveAttribute("href", "/hashtag/tag0");
  expect(screen.getByRole("link", { name: "See All" })).toHaveAttribute("href", "/trending");
  expect(screen.getAllByText("30 posts · 3 people")).toHaveLength(5);
});
it("shows the full list in the page variant", () => {
  setState({ snapshot });
  render(<TrendingTopics variant="page" />);
  expect(screen.getAllByRole("listitem")).toHaveLength(20);
  expect(screen.queryByRole("link", { name: "See All" })).not.toBeInTheDocument();
});
it("explains the honest empty state", () => {
  setState({ snapshot: { ...snapshot, data: [] } });
  render(<TrendingTopics />);
  expect(screen.getByText(/No trending conversations yet/)).toBeInTheDocument();
});
it("offers retry after a failure", () => {
  setState({ error: true });
  render(<TrendingTopics />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refreshTrends).toHaveBeenCalledWith(true);
});
it("keeps cached trends visible and identifies them as stale after refresh failure", () => {
  setState({ snapshot, error: true });
  render(<TrendingTopics />);
  expect(screen.getByText(/Showing the previous list/)).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
});
it("cleans up polling and focus listeners when unmounted", () => {
  jest.useFakeTimers();
  try {
    const rendered = render(<TrendingTopics />);
    rendered.unmount();
    jest.mocked(refreshTrends).mockClear();
    jest.advanceTimersByTime(120_000);
    fireEvent.focus(window);
    expect(refreshTrends).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
