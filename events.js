function canvasText(text = "TEST", left, top) {
  const canvasResult = document.getElementById("root" + "_canvas_result");

  const ctx = canvasResult.getContext("2d");

  ctx.fillStyle = "red";
  ctx.font = "24px Ariel";
  ctx.textAlign = "center"; // Align the text around the 'x' coordinate

  if (text.length > 10) {
    ctx.fillText(text.slice(0, 9), left, top);
    ctx.fillText(text.slice(10, 19), left, top + 20);
    ctx.fillText(text.slice(20, 29), left, top + 40);
  }
}

canvasText("eeeeeeeeeeeeeeeeeeeee", 1100, 320);
