import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Login from "../Login";
import SignInComponent from "../SignInController";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/redux/signupSlice", () => ({ setSuccess: (v: boolean) => ({ type: "success", payload: v }) }));
jest.mock("@/redux/userSlice", () => ({ setUserData: (v: unknown) => ({ type: "user", payload: v }) }));
jest.mock("../fontAwesomeLibrary", () => ({}));
jest.mock("@fortawesome/react-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("../AccountComponentWrapper", () => ({
  __esModule: true,
  default: ({ header, body }: { header: React.ReactNode; body: React.ReactNode }) => (
    <div>
      {header}
      {body}
    </div>
  ),
}));
jest.mock("../passkey", () => ({ PasskeyButton: () => null }));
jest.mock("../SignInController", () => ({ __esModule: true, default: jest.fn() }));

const signIn = SignInComponent as jest.MockedFunction<typeof SignInComponent>;

function fill(placeholder: string, value: string, fireChange: boolean) {
  const input = screen.getByPlaceholderText(placeholder) as HTMLInputElement;
  if (fireChange) {
    fireEvent.change(input, { target: { value } });
  } else {
    // What autofill does: the DOM value changes but React never hears about it.
    input.value = value;
  }
}

describe("Login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows required messages and does not call the server when the fields are empty", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Username or Email is required")).toBeTruthy();
    expect(screen.getByText("Password is required")).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in with values the browser autofilled without firing onChange", async () => {
    signIn.mockResolvedValue({ _id: "u1" } as never);
    render(<Login />);
    fill("Username Or Email", "josiah", false);
    fill("Password", "secret.", false);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ UsernameOrEmail: "josiah", password: "secret." }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
  });

  it("shows a failed sign-in in an alert above the button", async () => {
    signIn.mockRejectedValue(new Error("Invalid credentials"));
    render(<Login />);
    fill("Username Or Email", "josiah", true);
    fill("Password", "wrong", true);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Invalid credentials");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });
});

describe("SignInComponent error handling", () => {
  const real = jest.requireActual("../SignInController").default as typeof SignInComponent;
  const form = { UsernameOrEmail: "a", password: "b" };

  afterEach(() => {
    // @ts-expect-error cleanup of the stubbed global
    delete global.fetch;
  });

  it("uses the server's error message", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Invalid credentials" }) });
    await expect(real(form)).rejects.toThrow("Invalid credentials");
  });

  it("does not choke on a response that is not JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    await expect(real(form)).rejects.toThrow("The server had a problem. Please try again in a moment.");
  });
});
