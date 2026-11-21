import {
  callReducer,
  endReasonLabel,
  formatDuration,
  initialCallState,
  type ActiveCallInfo,
} from "@/lib/call/callState";

const call: ActiveCallInfo = {
  callId: null,
  roomId: "room1",
  chatType: "DM",
  callType: "audio",
  direction: "outgoing",
  peer: { name: "Ayo" },
};

describe("callReducer", () => {
  it("walks an outgoing call from ringing to connected to ended", () => {
    let s = callReducer(initialCallState, { type: "outgoing", call });
    expect(s.status).toBe("outgoing");
    s = callReducer(s, { type: "initiated", callId: "c1" });
    expect(s.call?.callId).toBe("c1");
    s = callReducer(s, { type: "accepted" });
    expect(s.status).toBe("connecting");
    s = callReducer(s, { type: "connected", at: 5 });
    expect(s).toMatchObject({ status: "connected", connectedAt: 5 });
    s = callReducer(s, { type: "ended", reason: "hangup" });
    expect(s).toMatchObject({ status: "ended", endReason: "hangup" });
    expect(callReducer(s, { type: "reset" })).toEqual(initialCallState);
  });

  it("ignores stray events when idle", () => {
    expect(callReducer(initialCallState, { type: "ended", reason: "hangup" })).toBe(initialCallState);
    expect(callReducer(initialCallState, { type: "accepted" })).toBe(initialCallState);
  });

  it("only toggles the camera on video calls", () => {
    const audio = callReducer(initialCallState, { type: "outgoing", call });
    expect(callReducer(audio, { type: "toggleCamera" }).cameraOff).toBe(false);
    const video = callReducer(initialCallState, {
      type: "outgoing",
      call: { ...call, callType: "video" },
    });
    expect(callReducer(video, { type: "toggleCamera" }).cameraOff).toBe(true);
  });
});

describe("call helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(125)).toBe("02:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("labels end reasons from the user's point of view", () => {
    expect(endReasonLabel("timeout", "incoming")).toBe("Missed call");
    expect(endReasonLabel("timeout", "outgoing")).toBe("No answer");
    expect(endReasonLabel("declined")).toBe("Call declined");
  });
});
