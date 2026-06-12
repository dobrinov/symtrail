import { renderHook, act } from "@testing-library/react-native";
import { useQuery } from "../../src/db/useQuery";
import { emitTableChange } from "../../src/db/events";

test("re-runs the query when a watched table changes", async () => {
  let value = 1;
  const { result } = await renderHook(() => useQuery(["entries"], () => value));
  expect(result.current).toBe(1);
  value = 2;
  await act(() => emitTableChange("entries"));
  expect(result.current).toBe(2);
  value = 3;
  await act(() => emitTableChange("profiles")); // not watched
  expect(result.current).toBe(2);
});

test("unsubscribes on unmount (no leaked listeners)", async () => {
  let value = 1;
  const { result, unmount } = await renderHook(() => useQuery(["entries"], () => value));
  expect(result.current).toBe(1);
  await unmount();
  // must not throw or warn after unmount
  await act(() => emitTableChange("entries"));
});
