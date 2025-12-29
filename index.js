const _DEFAULTSTATE = null;
const _TEXTSTATE = 0;
const _LINESTATE = 1;
const _DRAWINGSTATE = 2;

function getMousePosition(e, id) {
  const paint = document.getElementById(id);
  const rect = paint.getBoundingClientRect();
  return {
    x: e.pageX - rect.left,
    y: e.pageY - rect.top,
  };
}

function updateSvgPath(e, id, focus) {
  const paint = document.getElementById(id);
  const rect = paint.getBoundingClientRect();

  const target = document.getElementById(focus);

  const { startX, startY } = target.dataset;

  const a = "M" + startX + " " + startY;
  const strPath = a + " L" + (e.pageX - rect.left) + " " + (e.pageY - rect.top);
  // Get the smoothed part of the path that will not change

  target.dataset.endX = e.pageX - rect.left;
  target.dataset.endY = e.pageY - rect.top;

  target.setAttribute("d", strPath);

  return {
    x: e.pageX - rect.left,
    y: e.pageY - rect.top,
  };

  // strPath += " L" + pt.x + " " + pt.y;

  // // Get the last part of the path (close to the current mouse position)
  // // This part will change if the mouse moves again
  // var tmpPath = "";
  // for (var offset = 2; offset < buffer.length; offset += 2) {
  //   pt = getAveragePoint(offset);
  //   tmpPath += " L" + pt.x + " " + pt.y;
  // }

  // // Set the complete current path coordinates
  // path.setAttribute("d", strPath + tmpPath);
}

// const buffer = [];
// function appendToBuffer(pt) {
//   buffer.push(pt);
//   while (buffer.length > bufferSize) {
//     buffer.shift();
//   }
// }

class ImageMemo {
  #rootId = new Proxy(
    {
      value: null,
    },
    {
      set(target, props, value) {
        if (props === "value") {
          target.value = value;
        }
        return true;
      },
      get(target, prop, receiver) {
        return target.value;
      },
    }
  );
  #rootId;
  #options;
  #memos = [];
  #paths = [];
  #ids = [];
  #focus = null;
  #state = _DEFAULTSTATE;
  #data = null;

  constructor(rootId, opt = {}) {
    console.log(this.#rootId, " ==== ", rootId);
    this.#rootId = rootId;
    this.#options = opt;
    this.#memos = [];
    this.#ids = [];
    this.#focus = null;

    this.#render();

    window.addEventListener("click", this.#onResetFocus);

    // this.addEventListener("dataChange", (event) => {
    //   console.log(
    //     `Property "${event.detail.property}" changed from ${event.detail.oldValue} to ${event.detail.newValue}`
    //   );
    // });
  }

  // set #rootId(a) {
  //   this.#rootId = a;
  // }

  // get #rootId() {
  //   return "root";
  // }

  #reset() {
    const root = document.getElementById(this.#rootId);

    root.querySelectorAll("article").forEach((e) => e.remove());

    root.querySelectorAll("path").forEach((e) => e.remove());

    this.#data = null;
  }

  /**
   * 임시 dummy 데이터 저장 위한 함수.
   * @param {} data
   */
  setData(data) {
    this.#data = data;
  }

  add(data) {
    const { MEMOS: memos, PATHS: paths } = data;

    memos.forEach((m) => {
      const memo = this.#createMemo(m.innerHTML, {
        x: m.left,
        y: m.top,
      });
      const canvasEl = document.getElementById(this.#rootId + "_canvas");
      canvasEl.appendChild(memo);
    });

    paths.forEach((p) => {
      const { id, fill, stroke, strokeWidth, startX, startY, endX, endY, d } =
        p;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const uuidStr = window.crypto
        .getRandomValues(new Uint32Array(1))[0]
        .toString(36);
      path.setAttribute("id", id);
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", strokeWidth);
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("d", d);

      path.dataset.startX = startX;
      path.dataset.startY = startY;
      path.dataset.endX = endX;
      path.dataset.endY = endY;

      const canvasEl = document.getElementById(this.#rootId + "_paint");
      canvasEl.appendChild(path);
    });
  }

  destroy() {
    window.removeEventListener("click", this.#onResetFocus);
  }

  #onResetFocus = (e) => {
    const element = e.target;

    if (this.#state === _TEXTSTATE) {
      this.#state === _DEFAULTSTATE;
      return;
    }

    if (this.#state !== _DEFAULTSTATE) return;

    if (
      element.nodeName === "ARTICLE" ||
      (element.nodeName === "INPUT" && element.type === "color")
    ) {
      return;
    }

    this.#memos.forEach((memo) => {
      memo.classList.remove("focus");
    });

    this.#focus = null;
  };

  #render() {
    const root = document.getElementById(this.#rootId);

    const toolbar = this.#renderToolbar();
    const content = this.#renderContent();

    root.appendChild(toolbar);
    root.appendChild(content);
  }

  #renderToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.addEventListener("change", (e) => {
      const imgEl = document.getElementById(this.#rootId + "_image");
      const uploadFile = e.target.files;
      if (!uploadFile || uploadFile?.length === 0) {
        imgEl.src = "";
        return;
      }

      const base64 = new Blob([uploadFile[0]], { type: uploadFile[0].type });

      const url = window.URL.createObjectURL(base64);

      if (imgEl) imgEl.src = url;
    });

    const saveEl = document.createElement("button");
    saveEl.textContent = "SAVE";
    saveEl.addEventListener("click", (e) => {
      const memos = this.#memos.map((memo) => {
        const {
          innerHTML,
          style: { top, left, backgroundColor, color },
          offsetLeft,
          offsetTop,
          id,
        } = memo;
        return {
          innerHTML,
          offsetLeft,
          offsetTop,
          backgroundColor,
          color,
          id,
        };
      });

      const lines = this.#paths.map((path) => {
        const {
          attributes: {
            id: { value: id },
            fill: { value: fill },
            stroke: { value: stroke },
            "stroke-width": { value: strokeWidth },
            d: { value: d },
          },
          dataset: { startX, startY, endX, endY },
        } = path;

        return {
          id,
          fill,
          stroke,
          strokeWidth,
          startX,
          startY,
          endX,
          endY,
          d,
        };
      });
    });

    const addBtnEl = document.createElement("button");
    addBtnEl.textContent = "[ T ]";
    addBtnEl.addEventListener("click", (e) => {
      this.#state = _TEXTSTATE;

      // const memo = this.#createMemo();
      // const canvasEl = document.getElementById(this.#rootId + "_canvas");
      // canvasEl.appendChild(memo);
    });

    const addLineBtnEl = document.createElement("button");
    addLineBtnEl.textContent = "[ L ]";
    addLineBtnEl.addEventListener("click", (e) => {
      this.#state = _LINESTATE;
    });

    toolbar.appendChild(fileEl);
    toolbar.appendChild(saveEl);
    toolbar.appendChild(addBtnEl);
    toolbar.appendChild(addLineBtnEl);

    const resetBtnEl = document.createElement("button");
    resetBtnEl.textContent = "Reset";
    resetBtnEl.addEventListener("click", (e) => {
      this.#reset();
    });

    toolbar.appendChild(resetBtnEl);

    return toolbar;
  }

  #createMemo(text = "", { x = 0, y = 0 }) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);

    const memoId = this.#rootId + "_memo_" + uuidStr;

    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = memoId;
    memo.className = "memo";
    memo.dataset.anchor = "--" + this.#rootId + "-image";
    memo.style.top = y + "px";
    memo.style.left = x + "px";

    memo.addEventListener("dragstart", (e) => {
      const {
        layerX,
        layerY,
        target: { clientWidth, clientHeight },
      } = e;

      // e.currentTarget.classList.add(styles.drag_start);
      e.currentTarget.setAttribute("layerX", String(layerX));
      e.currentTarget.setAttribute("layerY", String(layerY));
      e.currentTarget.style.setProperty("transform", "translate(0, 0)");
    });
    memo.addEventListener("dragend", (e) => {
      const { clientX, clientY } = e;
      // const { clientWidth, clientHeight } = e.currentTarget;
      const { scrollTop, scrollLeft } = e.target.parentElement;
      const { top, left } = e.target.parentElement.getBoundingClientRect();

      const layerX = e.currentTarget.getAttribute("layerX");
      const layerY = e.currentTarget.getAttribute("layerY");

      const positionX = clientX - Number(layerX) - left + scrollLeft;
      const positionY = clientY - Number(layerY) - top + scrollTop;

      // if (positionX < 0) positionX = 0;
      // if (positionY < 0) positionY = 0;

      // if (positionX + clientWidth > innerWidth)
      //   positionX = innerWidth - clientWidth;
      // if (positionY + clientHeight > innerHeight)
      //   positionY = innerHeight - clientHeight;

      e.currentTarget.style.top = positionY + "px";
      e.currentTarget.style.left = positionX + "px";
    });
    memo.addEventListener("dragover", (e) => e.preventDefault());
    memo.addEventListener("click", (e) => {
      this.#memos.forEach((memo) => memo.classList.remove("focus"));

      memo.classList.add("focus");
      this.#focus = memo.id;
    });
    const textArea = document.createElement("div");
    textArea.contentEditable = true;
    textArea.innerHTML = text;
    memo.appendChild(textArea);
    // memo.contentEditable = true;

    this.#memos.push(memo);
    this.#ids.push(memoId);
    return memo;
  }

  #renderContent() {
    const content = document.createElement("div");
    content.className = "memo_content";

    const canvas = document.createElement("div");
    canvas.className = "image_wrapper";
    canvas.id = this.#rootId + "_canvas";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = this.#rootId + "_paint";
    svg.setAttribute("class", "image_paint");
    svg.setAttribute("target-anchor", "--" + this.#rootId + "-image");

    const image = document.createElement("img");
    image.style.anchorName = "--" + this.#rootId + "-image";
    image.id = this.#rootId + "_image";
    image.addEventListener("load", (e) => {
      const paint = document.getElementById(this.#rootId + "_paint");
      paint.setAttribute("width", image.clientWidth);
      paint.setAttribute("height", image.clientHeight);

      this.add(this.#data);
    });

    svg.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (this.#state === _DRAWINGSTATE) {
        this.#state = _DEFAULTSTATE;
        document.getElementById(this.#focus).remove();
        this.#paths.pop();
      }
    });

    svg.addEventListener("click", (e) => {
      if (this.#state === _TEXTSTATE) {
        const paint = document.getElementById(this.#rootId + "_paint");
        const rect = paint.getBoundingClientRect();
        const memo = this.#createMemo("", {
          x: e.pageX - rect.left,
          y: e.pageY - rect.top,
        });
        const canvasEl = document.getElementById(
          this.#rootId + "_canvas"
        );
        canvasEl.appendChild(memo);

        this.#state = _DEFAULTSTATE;
      } else if (this.#state === _LINESTATE) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        const uuidStr = window.crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36);
        path.setAttribute("id", this.#rootId + "_path_" + uuidStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", 3);
        path.setAttribute("stroke-linejoin", "round");
        var pt = getMousePosition(e, this.#rootId + "_paint");

        path.dataset.startX = pt.x;
        path.dataset.startY = pt.y;

        // appendToBuffer(pt);
        const strPath = "M" + pt.x + " " + pt.y;
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        this.#focus = this.#rootId + "_path_" + uuidStr;
        this.#paths.push(path);
      } else if (this.#state === _DRAWINGSTATE) {
        const focus = this.#focus;

        // const endPath = document.getElementById(focus);

        const { x, y } = updateSvgPath(e, this.#rootId + "_paint", focus);

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        const uuidStr = window.crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36);
        path.setAttribute("id", this.#rootId + "_path_" + uuidStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", 3);
        path.setAttribute("stroke-linejoin", "round");
        var pt = getMousePosition(e, this.#rootId + "_paint");

        path.dataset.startX = pt.x;
        path.dataset.startY = pt.y;

        // appendToBuffer(pt);
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        this.#focus = this.#rootId + "_path_" + uuidStr;
        this.#paths.push(path);
      }
    });

    svg.addEventListener("mousemove", (e) => {
      if (this.#state === _DRAWINGSTATE) {
        const focus = this.#focus;
        // appendToBuffer();
        // getMousePosition(e, this.#rootId + "_paint");
        const { x, y } = updateSvgPath(e, this.#rootId + "_paint", focus);
      }
    });

    canvas.appendChild(svg);
    canvas.appendChild(image);

    content.appendChild(canvas);

    return content;
  }
}
