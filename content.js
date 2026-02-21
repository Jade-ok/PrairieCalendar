(() => {
  const frameId = "__hello_ext_frame__";
  const existing = document.getElementById(frameId);

  if (existing) {
    existing.remove(); // 있으면 제거 (토글)
    return;
  }

  const frame = document.createElement("div");
  frame.id = frameId;
  frame.style.position = "fixed";
  frame.style.top = "0";
  frame.style.left = "0";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.border = "8px solid red";
  frame.style.zIndex = "2147483647";
  frame.style.pointerEvents = "none";
  document.documentElement.appendChild(frame);
})();