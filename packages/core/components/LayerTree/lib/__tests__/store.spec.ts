import {
  createOutlineDndStore,
  OUTLINE_EXPAND_DELAY_MS,
  OutlineDraggedRow,
} from "../store";

const draggedRow: OutlineDraggedRow = {
  itemId: "card-1",
  zoneCompound: "grid-1:items",
  index: 0,
  componentType: "Card",
};

describe("outline dnd store", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("scheduleExpand", () => {
    it("highlights immediately and expands after the delay", () => {
      const store = createOutlineDndStore();
      const onExpand = jest.fn();

      store.getState().scheduleExpand("grid-1", onExpand);

      expect(store.getState().expandCandidateId).toBe("grid-1");
      expect(store.getState().tempExpandedIds.has("grid-1")).toBe(false);

      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

      expect(store.getState().tempExpandedIds.has("grid-1")).toBe(true);
      expect(store.getState().expandCandidateId).toBe(null);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("does not restart the timer when re-scheduling the same row", () => {
      const store = createOutlineDndStore();
      const onExpand = jest.fn();

      store.getState().scheduleExpand("grid-1", onExpand);

      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS / 2);

      store.getState().scheduleExpand("grid-1", onExpand);

      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS / 2);

      expect(store.getState().tempExpandedIds.has("grid-1")).toBe(true);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("cancels the previous row when scheduling a different one", () => {
      const store = createOutlineDndStore();
      const onExpand = jest.fn();

      store.getState().scheduleExpand("grid-1", onExpand);
      store.getState().scheduleExpand("grid-2", onExpand);

      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

      expect(store.getState().tempExpandedIds.has("grid-1")).toBe(false);
      expect(store.getState().tempExpandedIds.has("grid-2")).toBe(true);
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it("is a no-op for rows that are already temporarily expanded", () => {
      const store = createOutlineDndStore();
      const onExpand = jest.fn();

      store.getState().scheduleExpand("grid-1", onExpand);
      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

      store.getState().scheduleExpand("grid-1", onExpand);

      expect(store.getState().expandCandidateId).toBe(null);

      jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

      expect(onExpand).toHaveBeenCalledTimes(1);
    });
  });

  it("cancelPendingExpand clears the highlight and prevents expansion", () => {
    const store = createOutlineDndStore();
    const onExpand = jest.fn();

    store.getState().scheduleExpand("grid-1", onExpand);
    store.getState().cancelPendingExpand();

    expect(store.getState().expandCandidateId).toBe(null);

    jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

    expect(store.getState().tempExpandedIds.has("grid-1")).toBe(false);
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("setTarget only notifies subscribers when the target values changes", () => {
    const store = createOutlineDndStore();
    const subscriber = jest.fn();

    store.subscribe(subscriber);

    const indicator = { targetId: "grid-1", position: "before" as const };
    const drop = { zone: "grid-1:items", index: 0 };

    store.getState().setTarget(indicator, drop);
    store.getState().setTarget({ ...indicator }, { ...drop });

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("endDrag clears targeting but keeps temp expansions until reset", () => {
    const store = createOutlineDndStore();

    store.getState().startDrag(draggedRow);
    store.getState().scheduleExpand("grid-1", () => {});
    jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);
    store
      .getState()
      .setTarget(
        { targetId: "grid-1", position: "before" },
        { zone: "grid-1:items", index: 0 }
      );

    store.getState().endDrag();

    expect(store.getState().status).toBe("dropping");
    expect(store.getState().indicator).toBe(null);
    expect(store.getState().drop).toBe(null);
    expect(store.getState().tempExpandedIds.has("grid-1")).toBe(true);

    store.getState().reset();

    expect(store.getState().status).toBe("idle");
    expect(store.getState().draggedRow).toBe(null);
    expect(store.getState().tempExpandedIds.size).toBe(0);
  });

  it("startDrag discards cached accept answers from the previous drag", () => {
    const store = createOutlineDndStore();

    store.getState().acceptCache.set("zone:grid-1:items", true);

    store.getState().startDrag(draggedRow);

    expect(store.getState().acceptCache.size).toBe(0);
  });

  it("reset discards cached accept answers", () => {
    const store = createOutlineDndStore();

    store.getState().startDrag(draggedRow);
    store.getState().acceptCache.set("zone:grid-1:items", true);

    store.getState().reset();

    expect(store.getState().acceptCache.size).toBe(0);
  });

  it("reset cancels a pending expansion timer", () => {
    const store = createOutlineDndStore();
    const onExpand = jest.fn();

    store.getState().scheduleExpand("grid-1", onExpand);
    store.getState().reset();

    jest.advanceTimersByTime(OUTLINE_EXPAND_DELAY_MS);

    expect(onExpand).not.toHaveBeenCalled();
    expect(store.getState().tempExpandedIds.size).toBe(0);
  });
});
