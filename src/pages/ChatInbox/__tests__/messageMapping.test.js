import { inferIsInboundFromAny, mapHubMessageToChat } from "../utils/messageMapping";

describe("ChatInbox message mapping", () => {
  test("infers inbound from direction", () => {
    expect(inferIsInboundFromAny({ direction: "in" })).toBe(true);
    expect(inferIsInboundFromAny({ Direction: "out" })).toBe(false);
  });

  test("maps WhatsApp-style image payload", () => {
    const mapped = mapHubMessageToChat({
      type: "image",
      image: { id: "MEDIA_123", mime_type: "image/jpeg" },
      text: "Image sent",
      direction: "in",
      createdAt: "2026-01-11T00:00:00.000Z",
    });

    expect(mapped.mediaType).toBe("image");
    expect(mapped.mediaId).toBe("MEDIA_123");
    expect(mapped.isInbound).toBe(true);
  });

  test("maps WhatsApp-style location payload", () => {
    const mapped = mapHubMessageToChat({
      type: "location",
      location: {
        latitude: 12.34,
        longitude: 56.78,
        name: "Test Place",
        address: "Somewhere",
      },
      direction: "in",
      createdAt: "2026-01-11T00:00:00.000Z",
    });

    expect(mapped.mediaType).toBe("location");
    expect(mapped.locationLatitude).toBe(12.34);
    expect(mapped.locationLongitude).toBe(56.78);
    expect(mapped.locationName).toBe("Test Place");
    expect(mapped.locationAddress).toBe("Somewhere");
  });
});

