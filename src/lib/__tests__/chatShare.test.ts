import { mapsLink, osmTile, parseContactContent, parseLocationContent } from "@/lib/chatShare";

describe("chat share content", () => {
  it("parses locations, dropping bad coordinates", () => {
    expect(parseLocationContent(JSON.stringify({ name: " Lagos ", lat: 6.5, lng: 3.3 }))).toEqual({ name: "Lagos", lat: 6.5, lng: 3.3 });
    expect(parseLocationContent(JSON.stringify({ name: "X", lat: 200, lng: 3 }))).toEqual({ name: "X" });
    expect(parseLocationContent("nope")).toBeNull();
    expect(parseLocationContent(JSON.stringify({ lat: 1, lng: 1 }))).toBeNull();
  });

  it("parses contacts", () => {
    expect(parseContactContent(JSON.stringify({ userId: "u", name: "Ada", username: "ada" }))).toMatchObject({ userId: "u", name: "Ada", verified: false });
    expect(parseContactContent(JSON.stringify({ name: "Ada" }))).toBeNull();
  });

  it("finds the right map tile (equator/prime meridian is the centre of tile 2^(z-1))", () => {
    const tile = osmTile(0, 0, 3);
    expect(tile).toMatchObject({ x: 4, y: 4 });
    expect(tile.fx).toBeCloseTo(0, 5);
    expect(osmTile(6.5244, 3.3792, 15).zoom).toBe(15);
  });

  it("links to the place", () => {
    expect(mapsLink({ name: "A", lat: 1, lng: 2 })).toContain("mlat=1&mlon=2");
    expect(mapsLink({ name: "Lagos Island" })).toContain("query=Lagos%20Island");
  });
});
