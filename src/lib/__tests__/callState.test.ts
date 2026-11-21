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

const ayo = { userId: "u2", name: "Ayo" };

describe("callReducer", () => {
  it("walks an outgoing call from ringing to connected to ended", () => {
    let s = callReducer(initialCallState, { type: "outgoing", call });
    expect(s.status).toBe("outgoing");
    s = callReducer(s, { type: "initiated", callId: "c1" });
    expect(s.call?.callId).toBe("c1");
    s = callReducer(s, { type: "peerJoined", user: ayo });
    expect(s.status).toBe("connecting");
    expect(s.participants.u2).toEqual({ name: "Ayo", avatar: undefined, connected: false });
    s = callReducer(s, { type: "peerConnected", userId: "u2", at: 5 });
    expect(s).toMatchObject({ status: "connected", connectedAt: 5 });
    expect(s.participants.u2.connected).toBe(true);
    s = callReducer(s, { type: "ended", reason: "hangup" });
    expect(s).toMatchObject({ status: "ended", endReason: "hangup" });
    expect(callReducer(s, { type: "reset" })).toEqual(initialCallState);
  });

  it("joins an incoming call and tracks several participants", () => {
    const incoming = { ...call, direction: "incoming" as const, chatType: "Group" as const };
    let s = callReducer(initialCallState, { type: "incoming", call: incoming });
    s = callReducer(s, { type: "accepting" });
    expect(s.status).toBe("connecting");
    s = callReducer(s, {
      type: "joined",
      participants: [ayo, { userId: "u3", name: "Bee" }],
    });
    expect(Object.keys(s.participants)).toEqual(["u2", "u3"]);
    s = callReducer(s, { type: "peerJoined", user: { userId: "u4", name: "Cy" } });
    expect(Object.keys(s.participants)).toHaveLength(3);
    s = callReducer(s, { type: "peerConnected", userId: "u3", at: 9 });
    s = callReducer(s, { type: "peerConnected", userId: "u2", at: 12 });
    expect(s.connectedAt).toBe(9); // the timer starts with the first connection
    s = callReducer(s, { type: "peerLeft", userId: "u3" });
    expect(Object.keys(s.participants)).toEqual(["u2", "u4"]);
    expect(s.status).toBe("connected");
  });

  it("ignores stray events when idle or ringing in", () => {
    expect(callReducer(initialCallState, { type: "ended", reason: "hangup" })).toBe(initialCallState);
    expect(callReducer(initialCallState, { type: "accepting" })).toBe(initialCallState);
    expect(callReducer(initialCallState, { type: "peerJoined", user: ayo })).toBe(initialCallState);
    const ringing = callReducer(initialCallState, {
      type: "incoming",
      call: { ...call, direction: "incoming" },
    });
    expect(callReducer(ringing, { type: "peerJoined", user: ayo })).toBe(ringing);
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
    expect(endReasonLabel("full")).toBe("This call is full");
  });
});
