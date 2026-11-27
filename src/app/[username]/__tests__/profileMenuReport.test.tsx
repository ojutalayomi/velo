import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";

import ProfileMenu from "@/app/[username]/ProfileMenu";
import userReducer from "@/redux/userSlice";

jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock("@/lib/userRelations", () => ({ setUserMuted: jest.fn(), setUserBlocked: jest.fn() }));
jest.mock("usehooks-ts", () => ({ useMediaQuery: () => false }));
jest.mock("@/components/ReportDialog", () => ({
  __esModule: true,
  default: ({ open, type, targetId, title }: { open: boolean; type: string; targetId: string; title: string }) =>
    open ? <div role="dialog" aria-label="report">{`${title}|${type}|${targetId}`}</div> : null,
}));

it("opens the report form for the profile instead of just saying it reported", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ blockedUserIds: [], mutedUserIds: [] }) });
  const store = configureStore({ reducer: { user: userReducer } as never });
  render(
    <Provider store={store}>
      <ProfileMenu username="ada" profileId="ada-id" />
    </Provider>
  );
  await userEvent.click(screen.getByRole("button"));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Report" }));
  expect(await screen.findByRole("dialog", { name: "report" })).toHaveTextContent("Report @ada|user|ada-id");
});
