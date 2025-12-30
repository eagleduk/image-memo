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
}

class ImageMemo extends ImageMemoProxy {
  constructor(rootId, opt = {}) {
    super(rootId, opt);
    console.log(this);
    this.#render();
  }

  destroy() {
    window.removeEventListener("click", this.#onResetFocus);
  }

  #onResetFocus = (e) => {
    const element = e.target;

    if (this._state === _TEXTSTATE) {
      this._state === _DEFAULTSTATE;
      return;
    }

    if (this._state !== _DEFAULTSTATE) return;

    if (
      element.nodeName === "ARTICLE" ||
      (element.nodeName === "INPUT" && element.type === "color")
    ) {
      return;
    }

    this._memos.forEach((memo) => {
      memo.classList.remove("focus");
    });

    this._focus = null;
  };

  #render() {
    console.log("render", this._rootId);
    const root = document.getElementById(this._rootId);

    const toolbar = this.#renderToolbar();
    const content = this.#renderContent();

    root.appendChild(toolbar);
    root.appendChild(content);
  }

  #reset() {
    const root = document.getElementById(this._rootId);

    root.querySelectorAll("article").forEach((e) => e.remove());

    root.querySelectorAll("path").forEach((e) => e.remove());

    this._data = null;
  }

  #renderToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.addEventListener("change", (e) => {
      const imgEl = document.getElementById(this._rootId + "_image");
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
      const memos = this._memos.map((memo) => {
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

      const lines = this._paths.map((path) => {
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
    addBtnEl.id = this._rootId + "_add_text_button";
    addBtnEl.textContent = "[ T ]";
    addBtnEl.addEventListener("click", (e) => {
      this._state = _TEXTSTATE;

      // const memo = this.#createMemo();
      // const canvasEl = document.getElementById(this._rootId + "_canvas");
      // canvasEl.appendChild(memo);
    });

    const addLineBtnEl = document.createElement("button");
    addLineBtnEl.id = this._rootId + "_add_line_button";
    addLineBtnEl.textContent = "[ L ]";
    addLineBtnEl.addEventListener("click", (e) => {
      this._state = _LINESTATE;
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

  #renderContent() {
    const content = document.createElement("div");
    content.className = "memo_content";

    const canvas = document.createElement("div");
    canvas.className = "image_wrapper";
    canvas.id = this._rootId + "_canvas";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = this._rootId + "_paint";
    svg.setAttribute("class", "image_paint");
    svg.setAttribute("target-anchor", "--" + this._rootId + "-image");

    const image = document.createElement("img");
    image.style.anchorName = "--" + this._rootId + "-image";
    image.id = this._rootId + "_image";
    image.addEventListener("load", (e) => {
      const paint = document.getElementById(this._rootId + "_paint");
      paint.setAttribute("width", image.clientWidth);
      paint.setAttribute("height", image.clientHeight);

      this.add(this._data);
    });

    svg.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (this._state === _DRAWINGSTATE) {
        this._state = _DEFAULTSTATE;
        document.getElementById(this._focus).remove();
        this._paths.pop();
      }
    });

    svg.addEventListener("click", (e) => {
      if (this._state === _TEXTSTATE) {
        const paint = document.getElementById(this._rootId + "_paint");
        const rect = paint.getBoundingClientRect();
        const memo = this.#createMemo(null, {
          x: e.pageX - rect.left,
          y: e.pageY - rect.top,
        });

        const canvasEl = document.getElementById(this._rootId + "_canvas");
        canvasEl.appendChild(memo);

        this._state = _DEFAULTSTATE;
      } else if (this._state === _LINESTATE) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        const uuidStr = window.crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36);
        path.setAttribute("id", this._rootId + "_path_" + uuidStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", 3);
        path.setAttribute("stroke-linejoin", "round");
        var pt = getMousePosition(e, this._rootId + "_paint");

        path.dataset.startX = pt.x;
        path.dataset.startY = pt.y;

        // appendToBuffer(pt);
        const strPath = "M" + pt.x + " " + pt.y;
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this._rootId + "_paint");
        canvasEl.appendChild(path);

        this._state = _DRAWINGSTATE;
        this._focus = this._rootId + "_path_" + uuidStr;
        this._paths.push(path);
      } else if (this._state === _DRAWINGSTATE) {
        const focus = this._focus;

        // const endPath = document.getElementById(focus);

        const { x, y } = updateSvgPath(e, this._rootId + "_paint", focus);

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        const uuidStr = window.crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36);
        path.setAttribute("id", this._rootId + "_path_" + uuidStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", 3);
        path.setAttribute("stroke-linejoin", "round");
        var pt = getMousePosition(e, this._rootId + "_paint");

        path.dataset.startX = pt.x;
        path.dataset.startY = pt.y;

        // appendToBuffer(pt);
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this._rootId + "_paint");
        canvasEl.appendChild(path);

        this._state = _DRAWINGSTATE;
        this._focus = this._rootId + "_path_" + uuidStr;
        this._paths.push(path);
      }
    });

    svg.addEventListener("mousemove", (e) => {
      console.log("mousemove", this._state, this._focus);
      if (this._state === _DRAWINGSTATE) {
        const focus = this._focus;
        // appendToBuffer();
        // getMousePosition(e, this._rootId + "_paint");
        const { x, y } = updateSvgPath(e, this._rootId + "_paint", focus);
      }
    });

    canvas.appendChild(svg);
    canvas.appendChild(image);

    content.appendChild(canvas);

    return content;
  }

  #createMemo(text = null, { x = 0, y = 0 }) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);

    const memoId = this._rootId + "_memo_" + uuidStr;

    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = memoId;
    memo.className = "memo";
    memo.dataset.anchor = "--" + this._rootId + "-image";
    memo.style.top = y - (text === null ? 15 : 0) + "px";
    memo.style.left = x - (text === null ? 50 : 0) + "px";

    memo.addEventListener("dragstart", (e) => {
      const {
        layerX,
        layerY,
        target: { clientWidth, clientHeight },
      } = e;

      console.log(clientWidth, clientHeight, layerX, layerY);
      // e.currentTarget.classList.add(styles.drag_start);
      e.currentTarget.setAttribute("layerX", String(layerX));
      e.currentTarget.setAttribute("layerY", String(layerY));
      // e.currentTarget.style.setProperty("transform", "translate(0, 0)");
    });
    memo.addEventListener("dragend", (e) => {
      const {
        clientX,
        clientY,
        target: { clientWidth, clientHeight },
      } = e;
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
      console.log("click ", e, memo.id);
      this._memos.forEach((memo) => memo.classList.remove("focus"));

      memo.classList.add("focus");
      this._focus = memo.id;
    });
    const textArea = document.createElement("div");
    textArea.contentEditable = true;
    textArea.innerHTML = text;
    textArea.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("click textArea");
      memo.classList.add("focus");
      this._focus = memo.id;
    });

    textArea.addEventListener("keydown", (e) => {
      console.log(e);
      if (e.ctrlKey && e.key === "Enter") {
        textArea.blur();
        memo.classList.remove("focus");
        this._focus = null;
      }
    });

    memo.appendChild(textArea);
    // memo.contentEditable = true;

    this._memos.push(memo);
    this._ids.push(memoId);
    return memo;
  }

  setData(data) {
    this._data = data;
    console.log("id", this._rootId);
  }

  add(data) {
    const { MEMOS: memos, PATHS: paths } = data;

    memos.forEach((m) => {
      const memo = this.#createMemo(m.innerHTML, {
        x: m.left,
        y: m.top,
      });
      const canvasEl = document.getElementById(this._rootId + "_canvas");
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

      const canvasEl = document.getElementById(this._rootId + "_paint");
      canvasEl.appendChild(path);
    });
  }

  changeState(state) {
    console.log("changing state to:", state, this);
    const addLineBtn = document.getElementById(
      this._rootId + "_add_line_button"
    );
    const addTextBtn = document.getElementById(
      this._rootId + "_add_text_button"
    );

    console.log("btn", addLineBtn, addTextBtn);

    addLineBtn.removeAttribute("disabled");
    addLineBtn.classList.remove("disabled");

    addTextBtn.removeAttribute("disabled");
    addTextBtn.classList.remove("disabled");

    if (state === _DEFAULTSTATE) {
      // TODO: implement default state logic
    } else if (state === _DRAWINGSTATE) {
      // TODO: implement drawing state logic
      addLineBtn.setAttribute("disabled", "true");
      addLineBtn.classList.add("disabled");
    } else if (state === _LINESTATE) {
      // TODO: implement erasing state logic
      const addLineBtn = document.getElementById(
        this._rootId + "_add_line_button"
      );
      addLineBtn.setAttribute("disabled", "true");
      addLineBtn.classList.add("disabled");
    } else if (state === _TEXTSTATE) {
      // TODO: implement text state logic
      const addTextBtn = document.getElementById(
        this._rootId + "_add_text_button"
      );
      addTextBtn.setAttribute("disabled", "true");
      addTextBtn.classList.add("disabled");
    }
  }

  // set #rootId(a) {
  //   this._rootId = a;
  // }

  // get #rootId() {
  //   return "root";
  // }
}
