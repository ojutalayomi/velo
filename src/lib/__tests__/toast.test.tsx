import { toast } from "@/lib/toast";

const mockAdd = jest.fn(() => "id-1");
const mockClose = jest.fn();
jest.mock("@/components/ui/toast", () => ({
  toast: { add: (...a: unknown[]) => mockAdd(...(a as [])), close: (...a: unknown[]) => mockClose(...a) },
}));

const lastCall = () => (mockAdd.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0];

describe("toast", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockClose.mockClear();
  });

  it.each(["success", "error", "warning", "info"] as const)("toast.%s sets the matching type", (type) => {
    toast[type]("Hi", { description: "d", duration: 5 });
    expect(lastCall()).toMatchObject({ type, title: "Hi", description: "d", timeout: 5 });
  });

  it("has no type when called directly, and no action", () => {
    toast("Hi");
    expect(lastCall()).toMatchObject({ title: "Hi", type: undefined, actionProps: undefined });
  });

  it("maps an action to actionProps", () => {
    const onClick = jest.fn();
    toast("Hi", { action: { label: "View", onClick } });
    expect(lastCall().actionProps).toEqual({ children: "View", onClick });
  });

  it("returns the id and can dismiss it", () => {
    const id = toast("Hi");
    toast.dismiss(id);
    expect(mockClose).toHaveBeenCalledWith("id-1");
  });
});
